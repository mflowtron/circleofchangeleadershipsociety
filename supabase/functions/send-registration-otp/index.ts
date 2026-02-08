import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-REGISTRATION-OTP] ${step}${detailsStr}`);
};

function generateOtpCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    logStep("Email normalized", { email: normalizedEmail });

    // Check if any completed orders exist for this email
    // Don't reveal whether the email has orders (prevent enumeration)
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .ilike("email", normalizedEmail)
      .eq("status", "completed")
      .limit(1);

    const hasOrders = orders && orders.length > 0;
    logStep("Order check", { hasOrders });

    if (!hasOrders) {
      // Return success even if no orders exist (prevent enumeration)
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "If an order exists for this email, a verification code has been sent.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Delete any existing unused codes for this email
    await supabaseAdmin
      .from("order_access_codes")
      .delete()
      .eq("email", normalizedEmail)
      .is("used_at", null);

    // Generate 6-digit OTP
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Insert OTP record
    const { error: insertError } = await supabaseAdmin
      .from("order_access_codes")
      .insert({
        email: normalizedEmail,
        code: code,
        expires_at: expiresAt,
      });

    if (insertError) {
      logStep("Failed to insert OTP", { error: insertError });
      throw new Error("Failed to generate verification code");
    }

    logStep("OTP created", { expiresAt });

    // Send email with the OTP code
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Circle of Change <noreply@circleofchange.org>",
            to: [normalizedEmail],
            subject: "Your Circle of Change Verification Code",
            html: `
              <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #6B1D3A; margin-bottom: 8px;">Verification Code</h2>
                <p style="color: #333; margin-bottom: 24px;">
                  Use the code below to access your Circle of Change conference registration.
                </p>
                <div style="background: #FFF8F0; border: 2px solid #DFA51F; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2D0A18; font-family: monospace;">
                    ${code}
                  </span>
                </div>
                <p style="color: #666; font-size: 14px;">
                  This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px;">
                  Circle of Change Leadership Society
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          logStep("Email send failed", { status: emailResponse.status, error: errorText });
        } else {
          logStep("OTP email sent successfully");
        }
      } catch (emailError) {
        logStep("Email send error", { error: String(emailError) });
        // Don't fail the request — the OTP is still in the DB
      }
    } else {
      logStep("RESEND_API_KEY not configured — OTP code logged for development", { code });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "If an order exists for this email, a verification code has been sent.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
