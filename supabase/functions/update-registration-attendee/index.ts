import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[UPDATE-REGISTRATION-ATTENDEE] ${step}${detailsStr}`);
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

    const { email, session_token, attendee_id, attendee_name, attendee_email, is_purchaser } =
      await req.json();

    if (!email || !session_token || !attendee_id) {
      throw new Error("Email, session_token, and attendee_id are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate session token
    const { data: sessionRecord, error: sessionError } = await supabaseAdmin
      .from("order_access_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", session_token)
      .not("used_at", "is", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (sessionError || !sessionRecord) {
      return new Response(
        JSON.stringify({ error: "Session expired. Please verify again." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    logStep("Session validated");

    // Verify the attendee belongs to an order owned by this email
    // attendees -> order_items -> orders
    const { data: attendee, error: attendeeError } = await supabaseAdmin
      .from("attendees")
      .select(
        `
        id, attendee_name, attendee_email, is_purchaser, form_status,
        order_item:order_items!inner(
          id,
          order:orders!inner(id, email, status)
        )
      `
      )
      .eq("id", attendee_id)
      .single();

    if (attendeeError || !attendee) {
      throw new Error("Attendee not found");
    }

    // Check ownership
    const orderEmail = (attendee.order_item as any)?.order?.email;
    if (!orderEmail || orderEmail.toLowerCase() !== normalizedEmail) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to update this attendee" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // Check order is completed
    const orderStatus = (attendee.order_item as any)?.order?.status;
    if (orderStatus !== "completed") {
      throw new Error("Order is not completed");
    }

    logStep("Ownership verified");

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (attendee_name !== undefined) updateData.attendee_name = attendee_name;
    if (attendee_email !== undefined) updateData.attendee_email = attendee_email;
    if (is_purchaser !== undefined) updateData.is_purchaser = is_purchaser;

    // Update
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("attendees")
      .update(updateData)
      .eq("id", attendee_id)
      .select(
        "id, attendee_name, attendee_email, is_purchaser, form_status, tally_form_sent_at, tally_form_completed_at, qr_token"
      )
      .single();

    if (updateError) {
      logStep("Update failed", { error: updateError });
      throw new Error("Failed to update attendee");
    }

    logStep("Attendee updated", { attendeeId: attendee_id });

    return new Response(
      JSON.stringify({ success: true, attendee: updated }),
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
