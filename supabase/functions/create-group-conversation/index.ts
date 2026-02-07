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
      event_id,
      name,
      description,
      participant_attendee_ids = [],
      participant_speaker_ids = []
    } = await req.json();

    if (!email || !session_token || !attendee_id || !event_id || !name) {
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

    // Create group conversation
    const { data: conversation, error: convError } = await supabase
      .from('attendee_conversations')
      .insert({
        event_id,
        type: 'group',
        name: name.trim(),
        description: description?.trim() || null,
        created_by_attendee_id: attendee_id
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add creator as owner
    const participants = [
      { conversation_id: conversation.id, attendee_id: attendee_id, role: 'owner' }
    ];

    // Add other attendee participants
    for (const id of participant_attendee_ids) {
      if (id !== attendee_id) {
        participants.push({
          conversation_id: conversation.id,
          attendee_id: id,
          role: 'member'
        });
      }
    }

    // Add speaker participants
    for (const id of participant_speaker_ids) {
      participants.push({
        conversation_id: conversation.id,
        speaker_id: id,
        role: 'member'
      } as any);
    }

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (partError) throw partError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversation_id: conversation.id 
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
