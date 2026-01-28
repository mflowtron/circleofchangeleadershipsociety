import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyCodeRequest {
  email: string;
  code: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyCodeRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find matching code
    const { data: accessCode, error: fetchError } = await supabaseAdmin
      .from('order_access_codes')
      .select('*')
      .ilike('email', normalizedEmail)
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching code:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accessCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabaseAdmin
      .from('order_access_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', accessCode.id);

    if (updateError) {
      console.error('Error marking code as used:', updateError);
    }

    // Generate session token (valid for 24 hours)
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store session token in the same table (reusing for simplicity)
    const { error: sessionError } = await supabaseAdmin
      .from('order_access_codes')
      .insert({
        email: normalizedEmail,
        code: sessionToken,
        expires_at: sessionExpiry,
        used_at: new Date().toISOString(), // Mark as "used" so it can't be used as OTP
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        valid: true, 
        session_token: sessionToken,
        expires_at: sessionExpiry,
        email: normalizedEmail 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-order-access-code:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
