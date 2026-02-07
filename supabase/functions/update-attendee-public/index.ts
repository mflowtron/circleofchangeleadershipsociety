import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface UpdateAttendeeRequest {
  attendee_id: string;
  attendee_name?: string;
  attendee_email?: string;
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

    const { attendee_id, attendee_name, attendee_email }: UpdateAttendeeRequest = await req.json();

    if (!attendee_id) {
      return new Response(
        JSON.stringify({ error: 'Attendee ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
