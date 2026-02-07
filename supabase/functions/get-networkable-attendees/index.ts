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
    const { email, session_token, attendee_id, event_id, search } = await req.json();

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

    // Get all speakers for this event (always visible)
    let speakersQuery = supabase
      .from('speakers')
      .select('id, name, title, company, bio, photo_url')
      .eq('event_id', event_id)
      .order('sort_order');

    if (search) {
      speakersQuery = speakersQuery.or(`name.ilike.%${search}%,company.ilike.%${search}%,title.ilike.%${search}%`);
    }

    const { data: speakers, error: speakersError } = await speakersQuery;

    if (speakersError) throw speakersError;

    // Get attendees who have opted in to networking for this event
    // First get all attendees for the event
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('event_id', event_id)
      .eq('status', 'completed');

    const orderIds = orders?.map(o => o.id) || [];

    if (orderIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          speakers: speakers?.map(s => ({ ...s, type: 'speaker' })) || [],
          attendees: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get attendees with profiles that have networking enabled
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select(`
        id,
        attendee_name,
        attendee_email
      `)
      .in('order_id', orderIds)
      .neq('id', attendee_id);

    if (attendeesError) throw attendeesError;

    const attendeeIds = attendees?.map(a => a.id) || [];

    // Get profiles for these attendees that have open_to_networking = true
    let profilesQuery = supabase
      .from('attendee_profiles')
      .select('*')
      .in('attendee_id', attendeeIds)
      .eq('open_to_networking', true);

    if (search) {
      profilesQuery = profilesQuery.or(`display_name.ilike.%${search}%,company.ilike.%${search}%,title.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) throw profilesError;

    // Merge attendee and profile data
    const networkableAttendees = (profiles || []).map(profile => {
      const attendee = attendees?.find(a => a.id === profile.attendee_id);
      return {
        id: profile.attendee_id,
        type: 'attendee',
        name: profile.display_name || attendee?.attendee_name || 'Attendee',
        title: profile.title,
        company: profile.company,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      };
    });

    // If search is provided and no profiles match, also search by attendee_name
    if (search && networkableAttendees.length === 0) {
      const { data: matchingAttendees } = await supabase
        .from('attendees')
        .select('id')
        .in('order_id', orderIds)
        .neq('id', attendee_id)
        .ilike('attendee_name', `%${search}%`);

      if (matchingAttendees && matchingAttendees.length > 0) {
        const matchingIds = matchingAttendees.map(a => a.id);
        const { data: matchingProfiles } = await supabase
          .from('attendee_profiles')
          .select('*')
          .in('attendee_id', matchingIds)
          .eq('open_to_networking', true);

        if (matchingProfiles) {
          for (const profile of matchingProfiles) {
            const attendee = attendees?.find(a => a.id === profile.attendee_id);
            networkableAttendees.push({
              id: profile.attendee_id,
              type: 'attendee',
              name: profile.display_name || attendee?.attendee_name || 'Attendee',
              title: profile.title,
              company: profile.company,
              bio: profile.bio,
              avatar_url: profile.avatar_url
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        speakers: speakers?.map(s => ({ ...s, type: 'speaker' })) || [],
        attendees: networkableAttendees 
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
