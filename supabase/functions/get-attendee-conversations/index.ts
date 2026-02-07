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
    const { email, session_token, attendee_id, event_id } = await req.json();

    if (!email || !session_token || !attendee_id || !event_id) {
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

    // Get conversations where the attendee is a participant
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        role,
        joined_at,
        last_read_at,
        muted_until
      `)
      .eq('attendee_id', attendee_id)
      .is('left_at', null);

    if (participantsError) {
      throw participantsError;
    }

    const conversationIds = participants?.map(p => p.conversation_id) || [];

    if (conversationIds.length === 0) {
      return new Response(
        JSON.stringify({ conversations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation details
    const { data: conversations, error: convError } = await supabase
      .from('attendee_conversations')
      .select(`
        id,
        event_id,
        type,
        name,
        description,
        agenda_item_id,
        is_archived,
        created_at,
        updated_at
      `)
      .in('id', conversationIds)
      .eq('event_id', event_id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (convError) {
      throw convError;
    }

    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lastMessage } = await supabase
          .from('attendee_messages')
          .select(`
            id,
            content,
            created_at,
            sender_attendee_id,
            sender_speaker_id
          `)
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get participant info for this conversation
        const participant = participants?.find(p => p.conversation_id === conv.id);

        // Count unread messages
        const lastReadAt = participant?.last_read_at;
        let unreadCount = 0;
        
        if (lastReadAt) {
          const { count } = await supabase
            .from('attendee_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_deleted', false)
            .gt('created_at', lastReadAt)
            .neq('sender_attendee_id', attendee_id);
          
          unreadCount = count || 0;
        } else if (lastMessage) {
          // If never read, count all messages not from self
          const { count } = await supabase
            .from('attendee_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_deleted', false)
            .neq('sender_attendee_id', attendee_id);
          
          unreadCount = count || 0;
        }

        // For DMs, get the other participant's info
        let otherParticipant = null;
        if (conv.type === 'direct') {
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select(`
              attendee_id,
              speaker_id
            `)
            .eq('conversation_id', conv.id)
            .neq('attendee_id', attendee_id)
            .is('left_at', null)
            .limit(1);

          if (otherParticipants && otherParticipants.length > 0) {
            const other = otherParticipants[0];
            if (other.attendee_id) {
              const { data: attendee } = await supabase
                .from('attendees')
                .select('id, attendee_name, attendee_email')
                .eq('id', other.attendee_id)
                .single();
              
              const { data: profile } = await supabase
                .from('attendee_profiles')
                .select('display_name, avatar_url')
                .eq('attendee_id', other.attendee_id)
                .maybeSingle();
              
              otherParticipant = {
                type: 'attendee',
                id: attendee?.id,
                name: profile?.display_name || attendee?.attendee_name,
                avatar_url: profile?.avatar_url
              };
            } else if (other.speaker_id) {
              const { data: speaker } = await supabase
                .from('speakers')
                .select('id, name, photo_url')
                .eq('id', other.speaker_id)
                .single();
              
              otherParticipant = {
                type: 'speaker',
                id: speaker?.id,
                name: speaker?.name,
                avatar_url: speaker?.photo_url
              };
            }
          }
        }

        // Get participant count for groups
        let participantCount = 0;
        if (conv.type !== 'direct') {
          const { count } = await supabase
            .from('conversation_participants')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .is('left_at', null);
          
          participantCount = count || 0;
        }

        return {
          ...conv,
          last_message: lastMessage,
          unread_count: unreadCount,
          other_participant: otherParticipant,
          participant_count: participantCount,
          role: participant?.role,
          muted_until: participant?.muted_until
        };
      })
    );

    return new Response(
      JSON.stringify({ conversations: conversationsWithMessages }),
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
