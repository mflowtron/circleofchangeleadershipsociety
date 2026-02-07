import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    const { attendee_id, message_id, emoji } = await req.json()

    if (!attendee_id || !message_id || !emoji) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the message and verify access to conversation (using renamed table: messages)
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, conversation_id, reactions')
      .eq('id', message_id)
      .single()

    if (messageError || !message) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify attendee is participant of this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', message.conversation_id)
      .eq('attendee_id', attendee_id)
      .is('left_at', null)
      .single()

    if (participantError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Not a participant of this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get reactors from JSONB reactions column
    // Format: { "👍": ["attendee-uuid-1", "attendee-uuid-2"], "❤️": [...] }
    const reactions: Record<string, string[]> = message.reactions || {};
    const reactorIds = reactions[emoji] || [];

    if (reactorIds.length === 0) {
      return new Response(
        JSON.stringify({ reactors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch attendees and their profiles
    const { data: attendees } = await supabase
      .from('attendees')
      .select('id, attendee_name, user_id')
      .in('id', reactorIds)

    // Get user_ids for profile lookup
    const userIds = [...new Set((attendees || []).filter(a => a.user_id).map(a => a.user_id))];
    
    const { data: profiles } = userIds.length > 0 
      ? await supabase.from('profiles').select('user_id, full_name, avatar_url, title').in('user_id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const reactors: Array<{
      type: 'attendee'
      id: string
      name: string
      avatar_url?: string
      title?: string
      is_you?: boolean
    }> = []

    if (attendees) {
      for (const att of attendees) {
        const profile = att.user_id ? profileMap.get(att.user_id) : null;
        reactors.push({
          type: 'attendee',
          id: att.id,
          name: profile?.full_name || att.attendee_name || 'Attendee',
          avatar_url: profile?.avatar_url,
          title: profile?.title || undefined,
          is_you: att.id === attendee_id
        })
      }
    }

    // Sort: current user first, then alphabetically
    reactors.sort((a, b) => {
      if (a.is_you) return -1
      if (b.is_you) return 1
      return a.name.localeCompare(b.name)
    })

    return new Response(
      JSON.stringify({ reactors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching reactors:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
