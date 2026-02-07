import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, session_token, attendee_id, message_id, emoji } = await req.json()

    if (!email || !session_token || !attendee_id || !message_id || !emoji) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Validate session
    const { data: accessCode, error: sessionError } = await supabase
      .from('order_access_codes')
      .select('email, used_at')
      .eq('code', session_token)
      .eq('email', email.toLowerCase())
      .not('used_at', 'is', null)
      .single()

    if (sessionError || !accessCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verify attendee belongs to user
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('id, order_id, orders!inner(email)')
      .eq('id', attendee_id)
      .single()

    if (attendeeError || !attendee) {
      return new Response(
        JSON.stringify({ error: 'Attendee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderEmail = (attendee.orders as any).email?.toLowerCase()
    if (orderEmail !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Get the message and verify access to conversation
    const { data: message, error: messageError } = await supabase
      .from('attendee_messages')
      .select('id, conversation_id')
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

    // 4. Get all reactions for this message + emoji
    const { data: reactions, error: reactionsError } = await supabase
      .from('message_reactions')
      .select('id, attendee_id, speaker_id')
      .eq('message_id', message_id)
      .eq('emoji', emoji)

    if (reactionsError) {
      throw reactionsError
    }

    if (!reactions || reactions.length === 0) {
      return new Response(
        JSON.stringify({ reactors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Fetch attendee and speaker details
    const attendeeIds = reactions.filter(r => r.attendee_id).map(r => r.attendee_id)
    const speakerIds = reactions.filter(r => r.speaker_id).map(r => r.speaker_id)

    const reactors: Array<{
      type: 'attendee' | 'speaker'
      id: string
      name: string
      avatar_url?: string
      title?: string
      is_you?: boolean
    }> = []

    // Fetch attendees with their profiles
    if (attendeeIds.length > 0) {
      const { data: attendees } = await supabase
        .from('attendees')
        .select(`
          id,
          attendee_name,
          attendee_profiles(display_name, avatar_url, title)
        `)
        .in('id', attendeeIds)

      if (attendees) {
        for (const att of attendees) {
          const profile = (att.attendee_profiles as any)?.[0] || (att.attendee_profiles as any)
          reactors.push({
            type: 'attendee',
            id: att.id,
            name: profile?.display_name || att.attendee_name || 'Attendee',
            avatar_url: profile?.avatar_url,
            is_you: att.id === attendee_id
          })
        }
      }
    }

    // Fetch speakers
    if (speakerIds.length > 0) {
      const { data: speakers } = await supabase
        .from('speakers')
        .select('id, name, photo_url, title')
        .in('id', speakerIds)

      if (speakers) {
        for (const speaker of speakers) {
          reactors.push({
            type: 'speaker',
            id: speaker.id,
            name: speaker.name,
            avatar_url: speaker.photo_url,
            title: speaker.title || undefined
          })
        }
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
