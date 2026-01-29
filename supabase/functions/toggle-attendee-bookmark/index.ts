import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToggleBookmarkRequest {
  email: string;
  session_token: string;
  attendee_id: string;
  agenda_item_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_token, attendee_id, agenda_item_id }: ToggleBookmarkRequest = await req.json();

    if (!email || !session_token || !attendee_id || !agenda_item_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
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

    // Verify attendee belongs to this email
    const { data: attendee, error: attendeeError } = await supabaseAdmin
      .from('attendees')
      .select(`
        id,
        order_id,
        orders!inner (
          event_id
        )
      `)
      .eq('id', attendee_id)
      .ilike('attendee_email', normalizedEmail)
      .maybeSingle();

    if (attendeeError || !attendee) {
      return new Response(
        JSON.stringify({ error: 'Attendee not found or not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify agenda item belongs to the same event
    const eventId = (attendee as any).orders?.event_id;
    const { data: agendaItem, error: agendaError } = await supabaseAdmin
      .from('agenda_items')
      .select('id, event_id')
      .eq('id', agenda_item_id)
      .eq('event_id', eventId)
      .maybeSingle();

    if (agendaError || !agendaItem) {
      return new Response(
        JSON.stringify({ error: 'Agenda item not found or not for this event' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if bookmark exists
    const { data: existingBookmark } = await supabaseAdmin
      .from('attendee_bookmarks')
      .select('id')
      .eq('attendee_id', attendee_id)
      .eq('agenda_item_id', agenda_item_id)
      .maybeSingle();

    let isBookmarked: boolean;

    if (existingBookmark) {
      // Remove bookmark
      const { error: deleteError } = await supabaseAdmin
        .from('attendee_bookmarks')
        .delete()
        .eq('id', existingBookmark.id);

      if (deleteError) {
        console.error('Error deleting bookmark:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to remove bookmark' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      isBookmarked = false;
    } else {
      // Add bookmark
      const { error: insertError } = await supabaseAdmin
        .from('attendee_bookmarks')
        .insert({
          attendee_id,
          agenda_item_id,
        });

      if (insertError) {
        console.error('Error inserting bookmark:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to add bookmark' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      isBookmarked = true;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        isBookmarked,
        agenda_item_id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in toggle-attendee-bookmark:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
