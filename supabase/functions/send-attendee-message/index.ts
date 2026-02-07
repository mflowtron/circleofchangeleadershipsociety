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
    const { email, session_token, attendee_id, conversation_id, content, reply_to_id } = await req.json();

    if (!email || !session_token || !attendee_id || !conversation_id || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
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
      .select('id, role')
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

    // Validate reply_to_id if provided
    if (reply_to_id) {
      const { data: replyMsg } = await supabase
        .from('attendee_messages')
        .select('id')
        .eq('id', reply_to_id)
        .eq('conversation_id', conversation_id)
        .maybeSingle();

      if (!replyMsg) {
        return new Response(
          JSON.stringify({ error: 'Reply message not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from('attendee_messages')
      .insert({
        conversation_id,
        sender_attendee_id: attendee_id,
        content: content.trim(),
        reply_to_id: reply_to_id || null
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Update conversation's updated_at
    await supabase
      .from('attendee_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    // Update sender's last_read_at
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .eq('attendee_id', attendee_id);

    // Get sender info for response
    const { data: attendee } = await supabase
      .from('attendees')
      .select('id, attendee_name')
      .eq('id', attendee_id)
      .single();

    const { data: profile } = await supabase
      .from('attendee_profiles')
      .select('display_name, avatar_url')
      .eq('attendee_id', attendee_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        message: {
          ...message,
          sender: {
            type: 'attendee',
            id: attendee?.id,
            name: profile?.display_name || attendee?.attendee_name || 'Attendee',
            avatar_url: profile?.avatar_url
          },
          is_own: true
        }
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
