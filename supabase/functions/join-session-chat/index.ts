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
    const { email, session_token, attendee_id, agenda_item_id } = await req.json();

    if (!email || !session_token || !attendee_id || !agenda_item_id) {
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

    // Get the agenda item to find event_id
    const { data: agendaItem, error: agendaError } = await supabase
      .from('agenda_items')
      .select('id, event_id, title')
      .eq('id', agenda_item_id)
      .single();

    if (agendaError || !agendaItem) {
      return new Response(
        JSON.stringify({ error: 'Agenda item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session chat exists for this agenda item
    let { data: sessionChat } = await supabase
      .from('attendee_conversations')
      .select('id')
      .eq('event_id', agendaItem.event_id)
      .eq('type', 'session')
      .eq('agenda_item_id', agenda_item_id)
      .maybeSingle();

    // Create session chat if it doesn't exist
    if (!sessionChat) {
      const { data: newChat, error: createError } = await supabase
        .from('attendee_conversations')
        .insert({
          event_id: agendaItem.event_id,
          type: 'session',
          name: agendaItem.title,
          agenda_item_id: agenda_item_id,
          description: `Discussion for: ${agendaItem.title}`
        })
        .select()
        .single();

      if (createError) throw createError;
      sessionChat = newChat;
    }

    // Check if attendee is already a participant
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', sessionChat.id)
      .eq('attendee_id', attendee_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          conversation_id: sessionChat.id,
          already_joined: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Join the session chat
    const { error: joinError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: sessionChat.id,
        attendee_id,
        role: 'member'
      });

    if (joinError) throw joinError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversation_id: sessionChat.id,
        already_joined: false 
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
