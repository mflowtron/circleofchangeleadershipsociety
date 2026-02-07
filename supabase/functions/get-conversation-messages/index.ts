import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Attendee {
  id: string;
  attendee_name: string;
  user_id?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

interface ReplyMessage {
  id: string;
  content: string;
  sender_id?: string;
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

    // 1. Fetch all messages in one query (using renamed table: messages, column: sender_id)
    let query = supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        content,
        reply_to_id,
        is_deleted,
        created_at,
        updated_at,
        sender_id,
        reactions,
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
    const senderIds = [...new Set(messages.filter(m => m.sender_id).map(m => m.sender_id))] as string[];
    const replyIds = [...new Set(messages.filter(m => m.reply_to_id).map(m => m.reply_to_id))] as string[];

    // 3. Batch fetch all related data in parallel
    const [attendeesRes, replyMessagesRes] = await Promise.all([
      senderIds.length > 0 
        ? supabase.from('attendees').select('id, attendee_name, user_id').in('id', senderIds)
        : Promise.resolve({ data: [] as Attendee[] }),
      replyIds.length > 0 
        ? supabase.from('messages').select('id, content, sender_id').in('id', replyIds)
        : Promise.resolve({ data: [] as ReplyMessage[] })
    ]);

    // Get user_ids from attendees for profile lookup
    const userIds = [...new Set((attendeesRes.data || []).filter((a: any) => a.user_id).map((a: any) => a.user_id))];
    
    const profilesRes = userIds.length > 0 
      ? await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds)
      : { data: [] as Profile[] };

    // 4. Build lookup maps
    const attendeeMap = new Map(((attendeesRes.data || []) as Attendee[]).map((a) => [a.id, a]));
    const profileMap = new Map(((profilesRes.data || []) as Profile[]).map((p) => [p.user_id, p]));
    const replyMap = new Map(((replyMessagesRes.data || []) as ReplyMessage[]).map((m) => [m.id, m]));

    // Get reply sender info (attendees not already fetched)
    const replySenderIds = [...new Set(
      ((replyMessagesRes.data || []) as ReplyMessage[])
        .filter((m) => m.sender_id && !attendeeMap.has(m.sender_id))
        .map((m) => m.sender_id)
    )] as string[];

    if (replySenderIds.length > 0) {
      const { data: replyAttendees } = await supabase.from('attendees').select('id, attendee_name, user_id').in('id', replySenderIds);
      ((replyAttendees || []) as Attendee[]).forEach((a) => attendeeMap.set(a.id, a));
      
      const replyUserIds = [...new Set((replyAttendees || []).filter((a: any) => a.user_id).map((a: any) => a.user_id))];
      if (replyUserIds.length > 0) {
        const { data: replyProfiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', replyUserIds);
        ((replyProfiles || []) as Profile[]).forEach((p) => profileMap.set(p.user_id, p));
      }
    }

    // 5. Enrich messages
    const enrichedMessages = messages.map(msg => {
      let sender = null;

      if (msg.sender_id) {
        const attendee = attendeeMap.get(msg.sender_id);
        const profile = attendee?.user_id ? profileMap.get(attendee.user_id) : null;
        sender = {
          type: 'attendee',
          id: attendee?.id || msg.sender_id,
          name: profile?.full_name || attendee?.attendee_name || 'Attendee',
          avatar_url: profile?.avatar_url
        };
      }

      let replyTo = null;
      if (msg.reply_to_id) {
        const originalMsg = replyMap.get(msg.reply_to_id);
        if (originalMsg) {
          let originalSenderName = 'Unknown';
          if (originalMsg.sender_id) {
            const attendee = attendeeMap.get(originalMsg.sender_id);
            const profile = attendee?.user_id ? profileMap.get(attendee.user_id) : null;
            originalSenderName = profile?.full_name || attendee?.attendee_name || 'Attendee';
          }

          replyTo = {
            id: originalMsg.id,
            content: originalMsg.content.substring(0, 100),
            sender_name: originalSenderName
          };
        }
      }

      // Parse reactions from JSONB column
      // Format: { "👍": ["attendee-uuid-1", "attendee-uuid-2"], "❤️": [...] }
      const reactionsJson = msg.reactions || {};
      const reactions = Object.entries(reactionsJson).map(([emoji, attendeeIds]) => ({
        emoji,
        count: (attendeeIds as string[]).length,
        reacted: (attendeeIds as string[]).includes(attendee_id)
      }));

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
        is_own: msg.sender_id === attendee_id,
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
