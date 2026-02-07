import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Attendee {
  id: string;
  attendee_name: string;
}

interface AttendeeProfile {
  attendee_id: string;
  display_name: string;
  avatar_url?: string;
}

interface Speaker {
  id: string;
  name: string;
  photo_url?: string;
  title?: string;
  company?: string;
}

interface ReplyMessage {
  id: string;
  content: string;
  sender_attendee_id?: string;
  sender_speaker_id?: string;
}

interface Reaction {
  message_id: string;
  emoji: string;
  attendee_id?: string;
  speaker_id?: string;
}

serve(async (req): Promise<Response> => {
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

    const { attendee_id, conversation_id, before, limit = 50 } = await req.json();

    if (!attendee_id || !conversation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
        sender_speaker_id,
        attachment_url,
        attachment_type,
        attachment_name,
        attachment_size
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
    const attendeeIds = [...new Set(messages.filter(m => m.sender_attendee_id).map(m => m.sender_attendee_id))] as string[];
    const speakerIds = [...new Set(messages.filter(m => m.sender_speaker_id).map(m => m.sender_speaker_id))] as string[];
    const replyIds = [...new Set(messages.filter(m => m.reply_to_id).map(m => m.reply_to_id))] as string[];
    const messageIds = messages.map(m => m.id);

    // 3. Batch fetch all related data in parallel
    const [attendeesRes, profilesRes, speakersRes, replyMessagesRes, reactionsRes] = await Promise.all([
      attendeeIds.length > 0 
        ? supabase.from('attendees').select('id, attendee_name').in('id', attendeeIds)
        : Promise.resolve({ data: [] as Attendee[] }),
      attendeeIds.length > 0 
        ? supabase.from('attendee_profiles').select('attendee_id, display_name, avatar_url').in('attendee_id', attendeeIds)
        : Promise.resolve({ data: [] as AttendeeProfile[] }),
      speakerIds.length > 0 
        ? supabase.from('speakers').select('id, name, photo_url, title, company').in('id', speakerIds)
        : Promise.resolve({ data: [] as Speaker[] }),
      replyIds.length > 0 
        ? supabase.from('attendee_messages').select('id, content, sender_attendee_id, sender_speaker_id').in('id', replyIds)
        : Promise.resolve({ data: [] as ReplyMessage[] }),
      supabase.from('message_reactions').select('message_id, emoji, attendee_id, speaker_id').in('message_id', messageIds)
    ]);

    // Build reaction aggregation map
    const reactionMap = new Map<string, Map<string, { count: number; reacted: boolean }>>();
    ((reactionsRes.data || []) as Reaction[]).forEach((r) => {
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

    // 4. Build lookup maps
    const attendeeMap = new Map(((attendeesRes.data || []) as Attendee[]).map((a) => [a.id, a]));
    const profileMap = new Map(((profilesRes.data || []) as AttendeeProfile[]).map((p) => [p.attendee_id, p]));
    const speakerMap = new Map(((speakersRes.data || []) as Speaker[]).map((s) => [s.id, s]));
    const replyMap = new Map(((replyMessagesRes.data || []) as ReplyMessage[]).map((m) => [m.id, m]));

    // Get reply sender info
    const replyAttendeeIds = [...new Set(
      ((replyMessagesRes.data || []) as ReplyMessage[])
        .filter((m) => m.sender_attendee_id && !attendeeMap.has(m.sender_attendee_id))
        .map((m) => m.sender_attendee_id)
    )] as string[];
    const replySpeakerIds = [...new Set(
      ((replyMessagesRes.data || []) as ReplyMessage[])
        .filter((m) => m.sender_speaker_id && !speakerMap.has(m.sender_speaker_id))
        .map((m) => m.sender_speaker_id)
    )] as string[];

    if (replyAttendeeIds.length > 0 || replySpeakerIds.length > 0) {
      const [replyProfilesRes, replyAttendeesRes, replySpeakersRes] = await Promise.all([
        replyAttendeeIds.length > 0 
          ? supabase.from('attendee_profiles').select('attendee_id, display_name').in('attendee_id', replyAttendeeIds)
          : Promise.resolve({ data: [] as AttendeeProfile[] }),
        replyAttendeeIds.length > 0 
          ? supabase.from('attendees').select('id, attendee_name').in('id', replyAttendeeIds)
          : Promise.resolve({ data: [] as Attendee[] }),
        replySpeakerIds.length > 0 
          ? supabase.from('speakers').select('id, name').in('id', replySpeakerIds)
          : Promise.resolve({ data: [] as Speaker[] })
      ]);
      
      ((replyProfilesRes.data || []) as AttendeeProfile[]).forEach((p) => profileMap.set(p.attendee_id, p));
      ((replyAttendeesRes.data || []) as Attendee[]).forEach((a) => attendeeMap.set(a.id, a));
      ((replySpeakersRes.data || []) as Speaker[]).forEach((s) => speakerMap.set(s.id, s));
    }

    // 5. Enrich messages
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

      const msgReactions = reactionMap.get(msg.id);
      const reactions = msgReactions 
        ? Array.from(msgReactions.entries()).map(([emoji, data]) => ({
            emoji,
            count: data.count,
            reacted: data.reacted
          }))
        : [];

      const attachment = msg.attachment_url ? {
        url: msg.attachment_url,
        type: msg.attachment_type,
        name: msg.attachment_name,
        size: msg.attachment_size
      } : undefined;

      return {
        ...msg,
        sender,
        reply_to: replyTo,
        is_own: msg.sender_attendee_id === attendee_id,
        reactions,
        attachment
      };
    });

    // Update last_read_at
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .eq('attendee_id', attendee_id);

    return new Response(
      JSON.stringify({ 
        messages: enrichedMessages.reverse(),
        has_more: messages.length === limit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
