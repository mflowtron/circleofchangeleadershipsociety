import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateAttendeeRequest {
  email: string;
  session_token: string;
  attendee_id: string;
  attendee_name?: string;
  attendee_email?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_token, attendee_id, attendee_name, attendee_email }: UpdateAttendeeRequest = await req.json();

    if (!email || !session_token || !attendee_id) {
      return new Response(
        JSON.stringify({ error: 'Email, session token, and attendee ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create Supabase client with service role
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

    // Verify the attendee belongs to an order owned by this email
    const { data: attendee, error: attendeeError } = await supabaseAdmin
      .from('attendees')
      .select(`
        id,
        order:orders!inner (
          id,
          email
        )
      `)
      .eq('id', attendee_id)
      .maybeSingle();

    if (attendeeError || !attendee) {
      return new Response(
        JSON.stringify({ error: 'Attendee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the order email matches the session email
    if ((attendee.order as any).email.toLowerCase() !== normalizedEmail) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to update this attendee' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the attendee
    const updateData: Record<string, string> = {};
    if (attendee_name !== undefined) updateData.attendee_name = attendee_name;
    if (attendee_email !== undefined) updateData.attendee_email = attendee_email;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('attendees')
      .update(updateData)
      .eq('id', attendee_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attendee:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update attendee' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, attendee: updated }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-attendee-public:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
