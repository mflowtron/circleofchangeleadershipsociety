import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_token, attendee_id, conversation_id, before, limit = 50 } = await req.json();

    if (!email || !session_token || !attendee_id || !conversation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('order_access_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', session_token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify attendee is a participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversation_id)
      .eq('attendee_id', attendee_id)
      .is('left_at', null)
      .maybeSingle();

    if (participantError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Not a participant of this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get messages
    let query = supabase
      .from('attendee_messages')
      .select(`
        id,
        conversation_id,
        content,
        reply_to_id,
        is_deleted,
        created_at,
        updated_at,
        sender_attendee_id,
        sender_speaker_id
      `)
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      throw messagesError;
    }

    // Enrich messages with sender info
    const enrichedMessages = await Promise.all(
      (messages || []).map(async (msg) => {
        let sender = null;

        if (msg.sender_attendee_id) {
          const { data: attendee } = await supabase
            .from('attendees')
            .select('id, attendee_name')
            .eq('id', msg.sender_attendee_id)
            .single();

          const { data: profile } = await supabase
            .from('attendee_profiles')
            .select('display_name, avatar_url')
            .eq('attendee_id', msg.sender_attendee_id)
            .maybeSingle();

          sender = {
            type: 'attendee',
            id: attendee?.id,
            name: profile?.display_name || attendee?.attendee_name || 'Attendee',
            avatar_url: profile?.avatar_url
          };
        } else if (msg.sender_speaker_id) {
          const { data: speaker } = await supabase
            .from('speakers')
            .select('id, name, photo_url, title, company')
            .eq('id', msg.sender_speaker_id)
            .single();

          sender = {
            type: 'speaker',
            id: speaker?.id,
            name: speaker?.name || 'Speaker',
            avatar_url: speaker?.photo_url,
            title: speaker?.title,
            company: speaker?.company
          };
        }

        // If this is a reply, get the original message preview
        let replyTo = null;
        if (msg.reply_to_id) {
          const { data: originalMsg } = await supabase
            .from('attendee_messages')
            .select('id, content, sender_attendee_id, sender_speaker_id')
            .eq('id', msg.reply_to_id)
            .single();

          if (originalMsg) {
            let originalSenderName = 'Unknown';
            if (originalMsg.sender_attendee_id) {
              const { data: profile } = await supabase
                .from('attendee_profiles')
                .select('display_name')
                .eq('attendee_id', originalMsg.sender_attendee_id)
                .maybeSingle();
              
              if (profile?.display_name) {
                originalSenderName = profile.display_name;
              } else {
                const { data: attendee } = await supabase
                  .from('attendees')
                  .select('attendee_name')
                  .eq('id', originalMsg.sender_attendee_id)
                  .single();
                originalSenderName = attendee?.attendee_name || 'Attendee';
              }
            } else if (originalMsg.sender_speaker_id) {
              const { data: speaker } = await supabase
                .from('speakers')
                .select('name')
                .eq('id', originalMsg.sender_speaker_id)
                .single();
              originalSenderName = speaker?.name || 'Speaker';
            }

            replyTo = {
              id: originalMsg.id,
              content: originalMsg.content.substring(0, 100),
              sender_name: originalSenderName
            };
          }
        }

        return {
          ...msg,
          sender,
          reply_to: replyTo,
          is_own: msg.sender_attendee_id === attendee_id
        };
      })
    );

    // Update last_read_at for this participant
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .eq('attendee_id', attendee_id);

    return new Response(
      JSON.stringify({ 
        messages: enrichedMessages.reverse(), // Return in chronological order
        has_more: messages?.length === limit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
