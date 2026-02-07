import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { attendee_id, event_id } = await req.json();

    if (!attendee_id || !event_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get all participant records for user in one query
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

    // Build participant lookup map
    const participantMap = new Map(participants?.map(p => [p.conversation_id, p]));

    // 2. Get all conversations in one query
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

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ conversations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const activeConversationIds = conversations.map(c => c.id);

    // 3. Batch fetch last messages for all conversations
    const { data: lastMessages } = await supabase
      .from('attendee_messages')
      .select(`
        id,
        conversation_id,
        content,
        created_at,
        sender_attendee_id,
        sender_speaker_id
      `)
      .in('conversation_id', activeConversationIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Build last message map (first message per conversation due to ordering)
    const lastMessageMap = new Map<string, any>();
    (lastMessages || []).forEach((msg: any) => {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    });

    // 4. Batch fetch unread counts using aggregated query
    const unreadCounts = new Map<string, number>();
    
    const unreadPromises = activeConversationIds.map(async (convId) => {
      const participant = participantMap.get(convId);
      const lastReadAt = participant?.last_read_at;
      
      let query = supabase
        .from('attendee_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', convId)
        .eq('is_deleted', false)
        .neq('sender_attendee_id', attendee_id);
      
      if (lastReadAt) {
        query = query.gt('created_at', lastReadAt);
      }
      
      const { count } = await query;
      return { convId, count: count || 0 };
    });

    const unreadResults = await Promise.all(unreadPromises);
    unreadResults.forEach(({ convId, count }) => {
      unreadCounts.set(convId, count);
    });

    // 5. Get all other participants for DM conversations
    const dmConversationIds = conversations.filter(c => c.type === 'direct').map(c => c.id);
    
    let otherParticipantsMap = new Map<string, any>();
    
    if (dmConversationIds.length > 0) {
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          attendee_id,
          speaker_id
        `)
        .in('conversation_id', dmConversationIds)
        .neq('attendee_id', attendee_id)
        .is('left_at', null);

      const otherAttendeeIds = [...new Set((otherParticipants || []).filter(p => p.attendee_id).map(p => p.attendee_id))];
      const otherSpeakerIds = [...new Set((otherParticipants || []).filter(p => p.speaker_id).map(p => p.speaker_id))];

      const [attendeesRes, profilesRes, speakersRes] = await Promise.all([
        otherAttendeeIds.length > 0 
          ? supabase.from('attendees').select('id, attendee_name, attendee_email').in('id', otherAttendeeIds)
          : Promise.resolve({ data: [] }),
        otherAttendeeIds.length > 0 
          ? supabase.from('attendee_profiles').select('attendee_id, display_name, avatar_url').in('attendee_id', otherAttendeeIds)
          : Promise.resolve({ data: [] }),
        otherSpeakerIds.length > 0 
          ? supabase.from('speakers').select('id, name, photo_url').in('id', otherSpeakerIds)
          : Promise.resolve({ data: [] })
      ]);

      const attendeeMap = new Map((attendeesRes.data || []).map((a: any) => [a.id, a]));
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.attendee_id, p]));
      const speakerMap = new Map((speakersRes.data || []).map((s: any) => [s.id, s]));

      (otherParticipants || []).forEach((op: any) => {
        if (op.attendee_id) {
          const attendee = attendeeMap.get(op.attendee_id);
          const profile = profileMap.get(op.attendee_id);
          otherParticipantsMap.set(op.conversation_id, {
            type: 'attendee',
            id: attendee?.id,
            name: profile?.display_name || attendee?.attendee_name,
            avatar_url: profile?.avatar_url
          });
        } else if (op.speaker_id) {
          const speaker = speakerMap.get(op.speaker_id);
          otherParticipantsMap.set(op.conversation_id, {
            type: 'speaker',
            id: speaker?.id,
            name: speaker?.name,
            avatar_url: speaker?.photo_url
          });
        }
      });
    }

    // 6. Batch get participant counts for group conversations
    const groupConversationIds = conversations.filter(c => c.type !== 'direct').map(c => c.id);
    const participantCounts = new Map<string, number>();

    if (groupConversationIds.length > 0) {
      const countPromises = groupConversationIds.map(async (convId) => {
        const { count } = await supabase
          .from('conversation_participants')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .is('left_at', null);
        return { convId, count: count || 0 };
      });

      const countResults = await Promise.all(countPromises);
      countResults.forEach(({ convId, count }) => {
        participantCounts.set(convId, count);
      });
    }

    // 7. Assemble final results using lookup maps
    const conversationsWithMessages = conversations.map(conv => {
      const participant = participantMap.get(conv.id);
      const lastMessage = lastMessageMap.get(conv.id);
      const unreadCount = unreadCounts.get(conv.id) || 0;
      const otherParticipant = otherParticipantsMap.get(conv.id);
      const participantCount = participantCounts.get(conv.id) || 0;

      return {
        ...conv,
        last_message: lastMessage || null,
        unread_count: unreadCount,
        other_participant: otherParticipant || null,
        participant_count: participantCount,
        role: participant?.role,
        muted_until: participant?.muted_until
      };
    });

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
