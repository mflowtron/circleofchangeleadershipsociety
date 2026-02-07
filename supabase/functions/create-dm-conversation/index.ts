import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req): Promise<Response> => {
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

    const { 
      attendee_id, 
      event_id,
      target_attendee_id
    } = await req.json();

    if (!attendee_id || !event_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!target_attendee_id) {
      return new Response(
        JSON.stringify({ error: 'Must specify target_attendee_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify sender attendee exists
    const { data: senderAttendee } = await supabase
      .from('attendees')
      .select('id')
      .eq('id', attendee_id)
      .single();

    if (!senderAttendee) {
      return new Response(
        JSON.stringify({ error: 'Attendee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target attendee exists
    const { data: targetAttendee } = await supabase
      .from('attendees')
      .select('id, user_id')
      .eq('id', target_attendee_id)
      .single();

    if (!targetAttendee) {
      return new Response(
        JSON.stringify({ error: 'Target attendee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check target's networking status via profiles table
    let targetOpenToNetworking = false;
    if (targetAttendee.user_id) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('open_to_networking')
        .eq('user_id', targetAttendee.user_id)
        .maybeSingle();
      targetOpenToNetworking = targetProfile?.open_to_networking || false;
    }

    // Check for existing DM (using renamed table: conversations)
    const { data: existingDMs } = await supabase
      .from('conversations')
      .select(`
        id,
        conversation_participants!inner(attendee_id)
      `)
      .eq('event_id', event_id)
      .eq('type', 'direct');

    let existingConvId = null;
    if (existingDMs) {
      for (const conv of existingDMs) {
        const participantIds = conv.conversation_participants.map((p: any) => p.attendee_id);
        if (participantIds.includes(attendee_id) && participantIds.includes(target_attendee_id)) {
          existingConvId = conv.id;
          break;
        }
      }
    }

    if (existingConvId) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          conversation_id: existingConvId,
          existing: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If target hasn't opted in, check if they share a group conversation
    if (!targetOpenToNetworking) {
      const { data: sharedGroups } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('attendee_id', attendee_id)
        .is('left_at', null);

      const senderConvIds = sharedGroups?.map(p => p.conversation_id) || [];

      if (senderConvIds.length > 0) {
        const { data: targetInShared } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('attendee_id', target_attendee_id)
          .in('conversation_id', senderConvIds)
          .is('left_at', null)
          .limit(1);

        if (!targetInShared || targetInShared.length === 0) {
          return new Response(
            JSON.stringify({ error: 'User is not open to networking' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'User is not open to networking' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new DM conversation (using renamed table: conversations, column: created_by)
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        event_id,
        type: 'direct',
        created_by: attendee_id
      })
      .select()
      .single();

    if (convError) throw convError;

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, attendee_id: attendee_id, role: 'owner' },
        { conversation_id: newConv.id, attendee_id: target_attendee_id, role: 'member' }
      ]);

    if (partError) throw partError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversation_id: newConv.id,
        existing: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
