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

    const { 
      attendee_id, 
      conversation_id, 
      content, 
      reply_to_id,
      attachment_url,
      attachment_type,
      attachment_name,
      attachment_size
    } = await req.json();

    if (!attendee_id || !conversation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Must have either content or attachment
    const hasContent = content && content.trim().length > 0;
    const hasAttachment = attachment_url && attachment_type && attachment_name;

    if (!hasContent && !hasAttachment) {
      return new Response(
        JSON.stringify({ error: 'Message must have content or attachment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify attendee is a participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id, role')
      .eq('conversation_id', conversation_id)
      .eq('attendee_id', attendee_id)
      .is('left_at', null)
      .maybeSingle();

    if (participantError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Not a participant of this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate reply_to_id if provided
    if (reply_to_id) {
      const { data: replyMsg } = await supabase
        .from('attendee_messages')
        .select('id')
        .eq('id', reply_to_id)
        .eq('conversation_id', conversation_id)
        .maybeSingle();

      if (!replyMsg) {
        return new Response(
          JSON.stringify({ error: 'Reply message not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from('attendee_messages')
      .insert({
        conversation_id,
        sender_attendee_id: attendee_id,
        content: content?.trim() || '',
        reply_to_id: reply_to_id || null,
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
        attachment_name: attachment_name || null,
        attachment_size: attachment_size || null
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Update conversation's updated_at
    await supabase
      .from('attendee_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    // Update sender's last_read_at
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .eq('attendee_id', attendee_id);

    // Get sender info for response
    const { data: attendee } = await supabase
      .from('attendees')
      .select('id, attendee_name')
      .eq('id', attendee_id)
      .single();

    const { data: profile } = await supabase
      .from('attendee_profiles')
      .select('display_name, avatar_url')
      .eq('attendee_id', attendee_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        message: {
          ...message,
          sender: {
            type: 'attendee',
            id: attendee?.id,
            name: profile?.display_name || attendee?.attendee_name || 'Attendee',
            avatar_url: profile?.avatar_url
          },
          is_own: true
        }
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
