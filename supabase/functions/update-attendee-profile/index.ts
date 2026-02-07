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
    const { 
      email, 
      session_token, 
      attendee_id,
      display_name,
      bio,
      company,
      title,
      open_to_networking,
      avatar_url
    } = await req.json();

    if (!email || !session_token || !attendee_id) {
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

    // Verify attendee exists and email matches
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('id, attendee_email')
      .eq('id', attendee_id)
      .single();

    if (attendeeError || !attendee) {
      return new Response(
        JSON.stringify({ error: 'Attendee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (attendee.attendee_email?.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('attendee_profiles')
      .select('id')
      .eq('attendee_id', attendee_id)
      .maybeSingle();

    const profileData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (display_name !== undefined) profileData.display_name = display_name;
    if (bio !== undefined) profileData.bio = bio;
    if (company !== undefined) profileData.company = company;
    if (title !== undefined) profileData.title = title;
    if (open_to_networking !== undefined) profileData.open_to_networking = open_to_networking;
    if (avatar_url !== undefined) profileData.avatar_url = avatar_url;

    let profile;
    if (existingProfile) {
      const { data, error } = await supabase
        .from('attendee_profiles')
        .update(profileData)
        .eq('attendee_id', attendee_id)
        .select()
        .single();

      if (error) throw error;
      profile = data;
    } else {
      const { data, error } = await supabase
        .from('attendee_profiles')
        .insert({
          attendee_id,
          ...profileData
        })
        .select()
        .single();

      if (error) throw error;
      profile = data;
    }

    return new Response(
      JSON.stringify({ success: true, profile }),
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
