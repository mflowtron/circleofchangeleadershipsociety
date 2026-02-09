import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-REGISTRATION-OTP] ${step}${detailsStr}`);
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

    const { email, code } = await req.json();

    if (!email || !code) {
      throw new Error("Email and code are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    logStep("Verifying OTP", { email: normalizedEmail });

    // Look up the OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("order_access_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      logStep("Invalid or expired OTP");
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid or expired verification code",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Mark OTP as used
    await supabaseAdmin
      .from("order_access_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    logStep("OTP marked as used");

    // Create a session token (stored as a new order_access_codes row with UUID code)
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString(); // 24 hours

    const { error: sessionError } = await supabaseAdmin
      .from("order_access_codes")
      .insert({
        email: normalizedEmail,
        code: sessionToken,
        expires_at: sessionExpiry,
        used_at: new Date().toISOString(), // Mark as "used" to distinguish from OTPs
      });

    if (sessionError) {
      logStep("Failed to create session token", { error: sessionError });
      throw new Error("Failed to create session");
    }

    logStep("Session token created", { expiresAt: sessionExpiry });

    // Fetch all completed orders for this email with full relationships
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id, order_number, email, full_name, phone, organization_name,
        referral_source, status, subtotal_cents, fees_cents, total_cents,
        completed_at, created_at, purchaser_is_attending,
        event:events!inner(id, title, slug, starts_at, ends_at, venue_name, venue_address, cover_image_url),
        order_items(
          id, quantity, unit_price_cents,
          ticket_type:ticket_types(id, name, is_virtual)
        )
      `
      )
      .ilike("email", normalizedEmail)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (ordersError) {
      logStep("Failed to fetch orders", { error: ordersError });
      throw new Error("Failed to fetch orders");
    }

    // For each order, fetch attendees and registration metadata
    const registrations = [];
    for (const order of orders || []) {
      // Get attendees via order_items
      const orderItemIds = (order.order_items || []).map(
        (item: { id: string }) => item.id
      );
      interface AttendeeRecord {
        id: string;
        attendee_name?: string;
        attendee_email?: string;
        is_purchaser?: boolean;
        form_status?: string;
        tally_form_sent_at?: string;
        tally_form_completed_at?: string;
        qr_token?: string;
      }
      let attendees: AttendeeRecord[] = [];

      if (orderItemIds.length > 0) {
        const { data: attendeeData } = await supabaseAdmin
          .from("attendees")
          .select(
            "id, attendee_name, attendee_email, is_purchaser, form_status, tally_form_sent_at, tally_form_completed_at, qr_token"
          )
          .in("order_item_id", orderItemIds);
        attendees = (attendeeData || []) as AttendeeRecord[];
      }

      // Get registration metadata
      const { data: regData } = await supabaseAdmin
        .from("registrations")
        .select("id, pricing_tier")
        .eq("order_id", order.id)
        .single();

      const totalAttendees = attendees.length;
      const named = attendees.filter(
        (a) => a.attendee_name && a.attendee_name.trim() !== ""
      ).length;
      const formsSent = attendees.filter(
        (a) => a.form_status === "pending"
      ).length;
      const formsComplete = attendees.filter(
        (a) => a.form_status === "completed"
      ).length;

      registrations.push({
        registration_id: regData?.id || null,
        pricing_tier: regData?.pricing_tier || null,
        order: {
          id: order.id,
          order_number: order.order_number,
          email: order.email,
          full_name: order.full_name,
          phone: order.phone,
          organization_name: order.organization_name,
          referral_source: order.referral_source,
          status: order.status,
          subtotal_cents: order.subtotal_cents,
          fees_cents: order.fees_cents,
          total_cents: order.total_cents,
          completed_at: order.completed_at,
          created_at: order.created_at,
          purchaser_is_attending: order.purchaser_is_attending,
        },
        event: order.event,
        order_items: order.order_items,
        attendees,
        attendee_stats: {
          total: totalAttendees,
          named,
          forms_sent: formsSent,
          forms_complete: formsComplete,
        },
      });
    }

    logStep("Orders fetched", { count: registrations.length });

    return new Response(
      JSON.stringify({
        valid: true,
        session_token: sessionToken,
        registrations,
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
