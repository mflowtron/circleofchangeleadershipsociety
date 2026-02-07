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

    // 1. Fetch all messages in one query
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

    if (!messages || messages.length === 0) {
      // Update last_read_at even if no messages
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversation_id)
        .eq('attendee_id', attendee_id);

      return new Response(
        JSON.stringify({ messages: [], has_more: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Collect unique IDs for batch queries
    const attendeeIds = [...new Set(messages.filter(m => m.sender_attendee_id).map(m => m.sender_attendee_id))];
    const speakerIds = [...new Set(messages.filter(m => m.sender_speaker_id).map(m => m.sender_speaker_id))];
    const replyIds = [...new Set(messages.filter(m => m.reply_to_id).map(m => m.reply_to_id))];

    // 3. Batch fetch all related data in parallel (3-5 queries instead of 100-300)
    const batchQueries: Promise<any>[] = [];
    const messageIds = messages.map(m => m.id);

    // Attendees batch
    if (attendeeIds.length > 0) {
      batchQueries.push(
        supabase.from('attendees').select('id, attendee_name').in('id', attendeeIds)
      );
      batchQueries.push(
        supabase.from('attendee_profiles').select('attendee_id, display_name, avatar_url').in('attendee_id', attendeeIds)
      );
    } else {
      batchQueries.push(Promise.resolve({ data: [] }));
      batchQueries.push(Promise.resolve({ data: [] }));
    }

    // Speakers batch
    if (speakerIds.length > 0) {
      batchQueries.push(
        supabase.from('speakers').select('id, name, photo_url, title, company').in('id', speakerIds)
      );
    } else {
      batchQueries.push(Promise.resolve({ data: [] }));
    }

    // Reply messages batch
    if (replyIds.length > 0) {
      batchQueries.push(
        supabase.from('attendee_messages').select('id, content, sender_attendee_id, sender_speaker_id').in('id', replyIds)
      );
    } else {
      batchQueries.push(Promise.resolve({ data: [] }));
    }

    // Reactions batch - fetch all reactions for all messages in one query
    batchQueries.push(
      supabase.from('message_reactions').select('message_id, emoji, attendee_id, speaker_id').in('message_id', messageIds)
    );

    const [attendeesRes, profilesRes, speakersRes, replyMessagesRes, reactionsRes] = await Promise.all(batchQueries);

    // Build reaction aggregation map
    const reactionMap = new Map<string, Map<string, { count: number; reacted: boolean }>>();
    (reactionsRes.data || []).forEach((r: any) => {
      if (!reactionMap.has(r.message_id)) {
        reactionMap.set(r.message_id, new Map());
      }
      const emojiMap = reactionMap.get(r.message_id)!;
      if (!emojiMap.has(r.emoji)) {
        emojiMap.set(r.emoji, { count: 0, reacted: false });
      }
      const emojiData = emojiMap.get(r.emoji)!;
      emojiData.count++;
      if (r.attendee_id === attendee_id) {
        emojiData.reacted = true;
      }
    });

    // 4. Build lookup maps for O(1) access
    const attendeeMap = new Map((attendeesRes.data || []).map((a: any) => [a.id, a]));
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.attendee_id, p]));
    const speakerMap = new Map((speakersRes.data || []).map((s: any) => [s.id, s]));
    const replyMap = new Map((replyMessagesRes.data || []).map((m: any) => [m.id, m]));

    // Get reply sender info (need attendee IDs from reply messages)
    const replyAttendeeIds = [...new Set(
      (replyMessagesRes.data || [])
        .filter((m: any) => m.sender_attendee_id && !attendeeMap.has(m.sender_attendee_id))
        .map((m: any) => m.sender_attendee_id)
    )];
    const replySpeakerIds = [...new Set(
      (replyMessagesRes.data || [])
        .filter((m: any) => m.sender_speaker_id && !speakerMap.has(m.sender_speaker_id))
        .map((m: any) => m.sender_speaker_id)
    )];

    // Fetch additional sender info for replies if needed
    if (replyAttendeeIds.length > 0 || replySpeakerIds.length > 0) {
      const additionalQueries: Promise<any>[] = [];
      
      if (replyAttendeeIds.length > 0) {
        additionalQueries.push(
          supabase.from('attendee_profiles').select('attendee_id, display_name').in('attendee_id', replyAttendeeIds)
        );
        additionalQueries.push(
          supabase.from('attendees').select('id, attendee_name').in('id', replyAttendeeIds)
        );
      } else {
        additionalQueries.push(Promise.resolve({ data: [] }));
        additionalQueries.push(Promise.resolve({ data: [] }));
      }
      
      if (replySpeakerIds.length > 0) {
        additionalQueries.push(
          supabase.from('speakers').select('id, name').in('id', replySpeakerIds)
        );
      } else {
        additionalQueries.push(Promise.resolve({ data: [] }));
      }

      const [replyProfilesRes, replyAttendeesRes, replySpeakersRes] = await Promise.all(additionalQueries);
      
      // Add to maps
      (replyProfilesRes.data || []).forEach((p: any) => profileMap.set(p.attendee_id, p));
      (replyAttendeesRes.data || []).forEach((a: any) => attendeeMap.set(a.id, a));
      (replySpeakersRes.data || []).forEach((s: any) => speakerMap.set(s.id, s));
    }

    // 5. Enrich messages in memory (no additional queries)
    const enrichedMessages = messages.map(msg => {
      let sender = null;

      if (msg.sender_attendee_id) {
        const attendee = attendeeMap.get(msg.sender_attendee_id);
        const profile = profileMap.get(msg.sender_attendee_id);
        sender = {
          type: 'attendee',
          id: attendee?.id || msg.sender_attendee_id,
          name: profile?.display_name || attendee?.attendee_name || 'Attendee',
          avatar_url: profile?.avatar_url
        };
      } else if (msg.sender_speaker_id) {
        const speaker = speakerMap.get(msg.sender_speaker_id);
        sender = {
          type: 'speaker',
          id: speaker?.id || msg.sender_speaker_id,
          name: speaker?.name || 'Speaker',
          avatar_url: speaker?.photo_url,
          title: speaker?.title,
          company: speaker?.company
        };
      }

      // Handle reply info using lookup maps
      let replyTo = null;
      if (msg.reply_to_id) {
        const originalMsg = replyMap.get(msg.reply_to_id);
        if (originalMsg) {
          let originalSenderName = 'Unknown';
          if (originalMsg.sender_attendee_id) {
            const profile = profileMap.get(originalMsg.sender_attendee_id);
            const attendee = attendeeMap.get(originalMsg.sender_attendee_id);
            originalSenderName = profile?.display_name || attendee?.attendee_name || 'Attendee';
          } else if (originalMsg.sender_speaker_id) {
            const speaker = speakerMap.get(originalMsg.sender_speaker_id);
            originalSenderName = speaker?.name || 'Speaker';
          }

          replyTo = {
            id: originalMsg.id,
            content: originalMsg.content.substring(0, 100),
            sender_name: originalSenderName
          };
        }
      }

      // Build reactions array for this message
      const msgReactions = reactionMap.get(msg.id);
      const reactions = msgReactions 
        ? Array.from(msgReactions.entries()).map(([emoji, data]) => ({
            emoji,
            count: data.count,
            reacted: data.reacted
          }))
        : [];

      return {
        ...msg,
        sender,
        reply_to: replyTo,
        is_own: msg.sender_attendee_id === attendee_id,
        reactions
      };
    });

    // Update last_read_at for this participant
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .eq('attendee_id', attendee_id);

    return new Response(
      JSON.stringify({ 
        messages: enrichedMessages.reverse(), // Return in chronological order
        has_more: messages.length === limit
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
