import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
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

    const { attendee_id, message_id, emoji } = await req.json();

    if (!attendee_id || !message_id || !emoji) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the message to find its conversation and current reactions (using renamed table: messages)
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, conversation_id, reactions')
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

    // Parse current reactions from JSONB
    // Format: { "👍": ["attendee-uuid-1", "attendee-uuid-2"], "❤️": [...] }
    const currentReactions: Record<string, string[]> = message.reactions || {};
    
    let action: 'added' | 'removed';
    
    // Check if user already reacted with this emoji
    const emojiReactors = currentReactions[emoji] || [];
    const hasReacted = emojiReactors.includes(attendee_id);

    if (hasReacted) {
      // Remove the reaction
      currentReactions[emoji] = emojiReactors.filter(id => id !== attendee_id);
      // Clean up empty emoji arrays
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
      action = 'removed';
    } else {
      // Add the reaction
      currentReactions[emoji] = [...emojiReactors, attendee_id];
      action = 'added';
    }

    // Update the message with new reactions
    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions: currentReactions })
      .eq('id', message_id);

    if (updateError) {
      throw updateError;
    }

    // Build response reactions array
    const reactions = Object.entries(currentReactions).map(([emojiKey, attendeeIds]) => ({
      emoji: emojiKey,
      count: attendeeIds.length,
      reacted: attendeeIds.includes(attendee_id)
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
