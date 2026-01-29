import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetBookmarksRequest {
  email: string;
  session_token: string;
  attendee_id?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_token, attendee_id }: GetBookmarksRequest = await req.json();

    if (!email || !session_token) {
      return new Response(
        JSON.stringify({ error: 'Email and session token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate session token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('order_access_codes')
      .select('*')
      .ilike('email', normalizedEmail)
      .eq('code', session_token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get attendee IDs for this email
    const { data: attendees, error: attendeesError } = await supabaseAdmin
      .from('attendees')
      .select('id')
      .ilike('attendee_email', normalizedEmail);

    if (attendeesError) {
      console.error('Error fetching attendees:', attendeesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch attendees' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const attendeeIds = attendees?.map(a => a.id) || [];

    // If specific attendee_id provided, verify it belongs to this user
    if (attendee_id && !attendeeIds.includes(attendee_id)) {
      return new Response(
        JSON.stringify({ error: 'Attendee not found or not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch bookmarks for attendee(s)
    const targetIds = attendee_id ? [attendee_id] : attendeeIds;
    
    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ bookmarks: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: bookmarks, error: bookmarksError } = await supabaseAdmin
      .from('attendee_bookmarks')
      .select(`
        id,
        attendee_id,
        agenda_item_id,
        created_at
      `)
      .in('attendee_id', targetIds)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookmarks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ bookmarks: bookmarks || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-attendee-bookmarks:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
