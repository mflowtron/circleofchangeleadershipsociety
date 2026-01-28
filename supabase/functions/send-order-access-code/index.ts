import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendCodeRequest {
  email: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendCodeRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if email exists in orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1);

    if (ordersError) {
      console.error('Error checking orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orders || orders.length === 0) {
      // Don't reveal whether email exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: 'If this email has orders, a code will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Check for recent codes (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentCodes, error: rateError } = await supabaseAdmin
      .from('order_access_codes')
      .select('id')
      .ilike('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (rateError) {
      console.error('Error checking rate limit:', rateError);
    }

    if (recentCodes && recentCodes.length >= 3) {
      return new Response(
        JSON.stringify({ error: 'Too many code requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store the code
    const { error: insertError } = await supabaseAdmin
      .from('order_access_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Error storing code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate access code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: 'Circle of Change <noreply@coclc.org>',
      to: [normalizedEmail],
      subject: 'Your Order Access Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Access Code</h1>
          <p>Use this code to access your orders:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send access code email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Access code sent to your email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-order-access-code:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
