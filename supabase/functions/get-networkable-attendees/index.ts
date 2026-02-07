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

    const { attendee_id, event_id, search } = await req.json();

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

    // Get completed orders for this event, then get order_items, then attendees
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

    // Get order_items for these orders
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id')
      .in('order_id', orderIds);

    const orderItemIds = orderItems?.map(oi => oi.id) || [];

    if (orderItemIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          speakers: speakers?.map(s => ({ ...s, type: 'speaker' })) || [],
          attendees: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get attendees for these order_items (excluding current attendee)
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select('id, attendee_name, attendee_email, user_id')
      .in('order_item_id', orderItemIds)
      .neq('id', attendee_id);

    if (attendeesError) throw attendeesError;

    // Get user_ids that are linked to attendees
    const userIds = [...new Set((attendees || []).filter(a => a.user_id).map(a => a.user_id))];

    // Get profiles for these users where open_to_networking = true
    let profilesQuery = supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds)
      .eq('open_to_networking', true);

    if (search) {
      profilesQuery = profilesQuery.or(`full_name.ilike.%${search}%,company.ilike.%${search}%,title.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) throw profilesError;

    // Build a map of user_id -> profile
    const profileByUserId = new Map((profiles || []).map(p => [p.user_id, p]));

    // Merge attendee and profile data - only include attendees with open_to_networking profiles
    const networkableAttendees = (attendees || [])
      .filter(a => a.user_id && profileByUserId.has(a.user_id))
      .map(attendee => {
        const profile = profileByUserId.get(attendee.user_id);
        return {
          id: attendee.id,
          type: 'attendee',
          name: profile?.full_name || attendee.attendee_name || 'Attendee',
          title: profile?.title,
          company: profile?.company,
          bio: profile?.bio,
          avatar_url: profile?.avatar_url
        };
      });

    // If search is provided and no profiles match, also search by attendee_name
    if (search && networkableAttendees.length === 0 && attendees && attendees.length > 0) {
      const matchingAttendees = attendees.filter(a => 
        a.attendee_name?.toLowerCase().includes(search.toLowerCase())
      );

      for (const attendee of matchingAttendees) {
        if (attendee.user_id) {
          const profile = profileByUserId.get(attendee.user_id);
          if (profile) {
            networkableAttendees.push({
              id: attendee.id,
              type: 'attendee',
              name: profile.full_name || attendee.attendee_name || 'Attendee',
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
