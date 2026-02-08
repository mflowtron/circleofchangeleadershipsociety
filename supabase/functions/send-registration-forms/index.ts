import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-REGISTRATION-FORMS] ${step}${detailsStr}`);
};

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

    const { email, session_token, attendee_ids } = await req.json();

    if (!email || !session_token || !attendee_ids?.length) {
      throw new Error(
        "Email, session_token, and attendee_ids are required"
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate session token
    const { data: sessionRecord } = await supabaseAdmin
      .from("order_access_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", session_token)
      .not("used_at", "is", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (!sessionRecord) {
      return new Response(
        JSON.stringify({ error: "Session expired. Please verify again." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    logStep("Session validated");

    const tallyFormUrl = Deno.env.get("TALLY_FORM_URL") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const updatedAttendees = [];
    const errors = [];

    for (const attendeeId of attendee_ids) {
      // Fetch attendee and verify ownership
      const { data: attendee } = await supabaseAdmin
        .from("attendees")
        .select(
          `
          id, attendee_name, attendee_email, form_status,
          order_item:order_items!inner(
            order:orders!inner(email)
          )
        `
        )
        .eq("id", attendeeId)
        .single();

      if (!attendee) {
        errors.push({ attendeeId, error: "Attendee not found" });
        continue;
      }

      // Verify ownership
      const orderEmail = (attendee.order_item as any)?.order?.email;
      if (!orderEmail || orderEmail.toLowerCase() !== normalizedEmail) {
        errors.push({ attendeeId, error: "Unauthorized" });
        continue;
      }

      // Verify attendee has name and email and is eligible
      if (
        !attendee.attendee_name?.trim() ||
        !attendee.attendee_email?.trim()
      ) {
        errors.push({
          attendeeId,
          error: "Attendee needs name and email before sending form",
        });
        continue;
      }

      if (attendee.form_status !== "needs_info") {
        errors.push({
          attendeeId,
          error: `Form already ${attendee.form_status}`,
        });
        continue;
      }

      // Build Tally form URL with pre-filled params
      const formUrl = tallyFormUrl
        ? `${tallyFormUrl}?name=${encodeURIComponent(attendee.attendee_name)}&email=${encodeURIComponent(attendee.attendee_email)}`
        : "";

      // Send email
      if (resendApiKey && formUrl) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Circle of Change <noreply@circleofchange.org>",
              to: [attendee.attendee_email],
              subject:
                "Complete Your Conference Registration - Circle of Change",
              html: `
                <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #6B1D3A;">Complete Your Registration</h2>
                  <p>Hello ${attendee.attendee_name},</p>
                  <p>You've been registered for the Circle of Change National Leadership Conference. Please complete your attendee registration form to finalize your details.</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${formUrl}" style="background: #DFA51F; color: #2D0A18; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                      Complete Registration Form
                    </a>
                  </div>
                  <p style="color: #666; font-size: 14px;">If you have questions, contact the person who registered you.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                  <p style="color: #999; font-size: 12px;">Circle of Change Leadership Society</p>
                </div>
              `,
            }),
          });
          logStep("Form email sent", { to: attendee.attendee_email });
        } catch (emailError) {
          logStep("Email send failed", { error: String(emailError) });
        }
      } else {
        logStep("Email not sent — missing RESEND_API_KEY or TALLY_FORM_URL", {
          attendeeId,
        });
      }

      // Update attendee status
      const { data: updated } = await supabaseAdmin
        .from("attendees")
        .update({
          form_status: "pending",
          tally_form_sent_at: new Date().toISOString(),
        })
        .eq("id", attendeeId)
        .select(
          "id, attendee_name, attendee_email, is_purchaser, form_status, tally_form_sent_at, tally_form_completed_at, qr_token"
        )
        .single();

      if (updated) {
        updatedAttendees.push(updated);
      }
    }

    logStep("Forms sent", {
      sent: updatedAttendees.length,
      errors: errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        attendees: updatedAttendees,
        errors: errors.length > 0 ? errors : undefined,
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
