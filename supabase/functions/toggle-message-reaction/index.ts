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
    const { email, session_token, attendee_id, message_id, emoji } = await req.json();

    if (!email || !session_token || !attendee_id || !message_id || !emoji) {
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

    // Get the message to find its conversation
    const { data: message, error: messageError } = await supabase
      .from('attendee_messages')
      .select('id, conversation_id')
      .eq('id', message_id)
      .maybeSingle();

    if (messageError || !message) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify attendee is a participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', message.conversation_id)
      .eq('attendee_id', attendee_id)
      .is('left_at', null)
      .maybeSingle();

    if (participantError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Not a participant of this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if reaction already exists
    const { data: existingReaction } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', message_id)
      .eq('attendee_id', attendee_id)
      .eq('emoji', emoji)
      .maybeSingle();

    let action: 'added' | 'removed';

    if (existingReaction) {
      // Remove the reaction
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        throw deleteError;
      }
      action = 'removed';
    } else {
      // Add the reaction
      const { error: insertError } = await supabase
        .from('message_reactions')
        .insert({
          message_id,
          attendee_id,
          emoji
        });

      if (insertError) {
        throw insertError;
      }
      action = 'added';
    }

    // Get updated reaction counts for the message
    const { data: allReactions } = await supabase
      .from('message_reactions')
      .select('emoji, attendee_id, speaker_id')
      .eq('message_id', message_id);

    // Aggregate reactions
    const reactionCounts: Record<string, { count: number; reacted: boolean }> = {};
    (allReactions || []).forEach((r: any) => {
      if (!reactionCounts[r.emoji]) {
        reactionCounts[r.emoji] = { count: 0, reacted: false };
      }
      reactionCounts[r.emoji].count++;
      if (r.attendee_id === attendee_id) {
        reactionCounts[r.emoji].reacted = true;
      }
    });

    const reactions = Object.entries(reactionCounts).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      reacted: data.reacted
    }));

    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        reactions
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
