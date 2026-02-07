import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
};

const ALL_ALLOWED_TYPES = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.document];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_token, attendee_id, conversation_id, file, filename, content_type } = await req.json();

    if (!email || !session_token || !attendee_id || !conversation_id || !file || !filename || !content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate content type
    if (!ALL_ALLOWED_TYPES.includes(content_type)) {
      return new Response(
        JSON.stringify({ error: `File type ${content_type} is not allowed` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 file
    const fileData = decode(file);
    
    // Validate file size
    if (fileData.length > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 10MB limit' }),
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

    // Verify attendee is a participant in this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
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

    // Generate unique filename
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${conversation_id}/${timestamp}_${safeFilename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(storagePath, fileData, {
        contentType: content_type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload file');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        size: fileData.length
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
