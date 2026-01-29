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
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#FAF9F7; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Main Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F7; padding:40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#FFFFFF; border-radius:16px; box-shadow:0 4px 24px rgba(30,20,15,0.08); overflow:hidden;">
          
          <!-- Golden Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1A1814 0%, #2A2520 100%); padding:32px 40px; text-align:center;">
              <img src="https://circleofchangeleadershipsociety.lovable.app/coclc-logo-emblem.png" alt="Circle of Change" width="80" style="display:block; margin:0 auto;">
            </td>
          </tr>
          
          <!-- Content Section -->
          <tr>
            <td style="padding:40px;">
              
              <!-- Greeting -->
              <h1 style="margin:0 0 8px; font-size:24px; font-weight:600; color:#1F1C18; text-align:center;">
                Your Access Code
              </h1>
              <p style="margin:0 0 32px; font-size:15px; color:#6B6560; text-align:center; line-height:1.6;">
                Enter this code to securely access your event tickets and orders.
              </p>
              
              <!-- Code Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block; background:linear-gradient(180deg, #FEFEFE 0%, #FAF9F7 100%); border:2px solid #D4A84B; border-radius:12px; padding:20px 32px;">
                      <span style="font-size:36px; font-weight:700; letter-spacing:12px; color:#1A1814; font-family:'Courier New', monospace;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block; background:#FEF9F0; border-radius:8px; padding:12px 20px;">
                      <span style="font-size:13px; color:#B8923F; font-weight:500;">
                        ⏱ This code expires in 10 minutes
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#FAF9F7; padding:24px 40px; border-top:1px solid #EAE7E3;">
              <p style="margin:0 0 8px; font-size:13px; color:#6B6560; text-align:center; line-height:1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin:0; font-size:12px; color:#9A958F; text-align:center;">
                © 2026 Circle of Change Leadership Society
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
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
