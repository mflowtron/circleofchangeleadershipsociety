import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GetBookmarksRequest {
  attendee_id?: string;
}

serve(async (req: Request) => {
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

    const normalizedEmail = (claimsData.claims.email as string).toLowerCase().trim();

    const { attendee_id }: GetBookmarksRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
