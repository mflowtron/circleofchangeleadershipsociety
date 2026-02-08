import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-REGISTRATION-PAYMENT] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { order_id, session_id } = await req.json();

    if (!order_id) {
      throw new Error("Missing order_id");
    }

    logStep("Request parsed", { order_id, session_id });

    // Get the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*), purchaser_is_attending")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order found", {
      orderNumber: order.order_number,
      status: order.status,
    });

    // Get registration metadata
    const { data: registration } = await supabaseAdmin
      .from("registrations")
      .select("id, pricing_tier")
      .eq("order_id", order_id)
      .single();

    // If already completed, return success
    if (order.status === "completed") {
      const { data: fullOrder } = await supabaseAdmin
        .from("orders")
        .select("*, order_items(*, ticket_type:ticket_types(name))")
        .eq("id", order_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          order: fullOrder,
          registration: registration || null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Verify payment with Stripe if session_id provided
    if (session_id) {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2025-08-27.basil",
      });
      const session = await stripe.checkout.sessions.retrieve(session_id);

      logStep("Stripe session retrieved", {
        paymentStatus: session.payment_status,
        status: session.status,
      });

      if (session.payment_status === "paid") {
        // Update order to completed
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", order_id);

        if (updateError) {
          logStep("Failed to update order", { error: updateError });
        } else {
          logStep("Order marked as completed");
        }

        // Create attendee records for each ticket purchased
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("id, quantity")
          .eq("order_id", order_id);

        if (orderItems) {
          const attendeeRecords = [];
          let purchaserCreated = false;

          for (const item of orderItems) {
            for (let i = 0; i < item.quantity; i++) {
              const isPurchaser =
                order.purchaser_is_attending === true && !purchaserCreated;
              attendeeRecords.push({
                order_item_id: item.id,
                attendee_name: isPurchaser ? order.full_name : "",
                attendee_email: isPurchaser ? order.email : "",
                is_purchaser: isPurchaser,
                form_status: "needs_info",
              });
              if (isPurchaser) purchaserCreated = true;
            }
          }

          if (attendeeRecords.length > 0) {
            const { error: attendeeError } = await supabaseAdmin
              .from("attendees")
              .insert(attendeeRecords);

            if (attendeeError) {
              logStep("Failed to create attendees", { error: attendeeError });
            } else {
              logStep("Attendee records created", {
                count: attendeeRecords.length,
                purchaserIncluded: purchaserCreated,
              });
            }
          }
        }

        // Fetch updated order with full relationships
        const { data: updatedOrder } = await supabaseAdmin
          .from("orders")
          .select("*, order_items(*, ticket_type:ticket_types(name))")
          .eq("id", order_id)
          .single();

        // Send confirmation email
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey && updatedOrder) {
          try {
            // Build ticket details HTML
            let ticketDetailsHtml = '';
            let totalTickets = 0;
            if (updatedOrder.order_items && Array.isArray(updatedOrder.order_items)) {
              updatedOrder.order_items.forEach((item: any) => {
                totalTickets += item.quantity || 0;
                const ticketName = item.ticket_type?.name || 'Registration';
                const price = item.unit_price ? `$${(item.unit_price / 100).toFixed(2)}` : '';
                const subtotal = item.total_price ? `$${(item.total_price / 100).toFixed(2)}` : '';

                ticketDetailsHtml += `
                  <tr>
                    <td style="padding: 12px 0; color: #333;">${ticketName}</td>
                    <td style="padding: 12px 0; color: #333; text-align: center;">${item.quantity}</td>
                    <td style="padding: 12px 0; color: #333; text-align: right;">${price}</td>
                    <td style="padding: 12px 0; color: #333; text-align: right; font-weight: 600;">${subtotal}</td>
                  </tr>
                `;
              });
            }

            const totalAmount = updatedOrder.total_amount
              ? `$${(updatedOrder.total_amount / 100).toFixed(2)}`
              : '$0.00';

            const registrationInfo = registration
              ? `
                <div style="margin: 24px 0; padding: 16px; background: #FFF8F0; border-left: 4px solid #DFA51F; border-radius: 4px;">
                  <p style="color: #333; margin: 0 0 8px 0; font-weight: 600;">Registration Details</p>
                  <p style="color: #666; margin: 0; font-size: 14px;">
                    Pricing Tier: <strong>${registration.pricing_tier || 'Standard'}</strong>
                  </p>
                </div>
              `
              : '';

            const emailHtml = `
              <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #6B1D3A; margin: 0 0 8px 0; font-size: 28px;">Registration Confirmation</h1>
                  <p style="color: #666; margin: 0;">Thank you for your registration!</p>
                </div>

                <div style="background: linear-gradient(135deg, #6B1D3A 0%, #2D0A18 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">Order Number</p>
                  <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">${updatedOrder.order_number || 'N/A'}</p>
                </div>

                <div style="margin-bottom: 24px;">
                  <h2 style="color: #6B1D3A; font-size: 20px; margin: 0 0 16px 0;">Order Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 2px solid #DFA51F;">
                        <th style="padding: 12px 0; color: #6B1D3A; text-align: left; font-weight: 600;">Item</th>
                        <th style="padding: 12px 0; color: #6B1D3A; text-align: center; font-weight: 600;">Qty</th>
                        <th style="padding: 12px 0; color: #6B1D3A; text-align: right; font-weight: 600;">Price</th>
                        <th style="padding: 12px 0; color: #6B1D3A; text-align: right; font-weight: 600;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${ticketDetailsHtml}
                    </tbody>
                    <tfoot>
                      <tr style="border-top: 2px solid #DFA51F;">
                        <td colspan="3" style="padding: 16px 0; color: #6B1D3A; font-weight: 600; font-size: 18px;">Total</td>
                        <td style="padding: 16px 0; color: #6B1D3A; font-weight: 600; font-size: 18px; text-align: right;">${totalAmount}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                ${registrationInfo}

                <div style="margin: 24px 0; padding: 16px; background: #F5F5F5; border-radius: 8px;">
                  <p style="color: #333; margin: 0 0 8px 0; font-weight: 600;">What's Next?</p>
                  <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.6;">
                    ${totalTickets > 1
                      ? `You've registered ${totalTickets} attendees. You'll receive additional information about completing attendee details soon.`
                      : 'Your registration is confirmed! You\'ll receive additional information about the event soon.'}
                  </p>
                </div>

                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

                <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                  Circle of Change Leadership Society<br />
                  Questions? Contact us at support@circleofchange.org
                </p>
              </div>
            `;

            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Circle of Change <noreply@circleofchange.org>",
                to: [order.email],
                subject: `Registration Confirmation - ${updatedOrder.order_number}`,
                html: emailHtml,
              }),
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              logStep("Email send failed", { status: emailResponse.status, error: errorText });
            } else {
              logStep("Confirmation email sent successfully", { to: order.email });
            }
          } catch (emailError) {
            logStep("Email send error", { error: String(emailError) });
            // Don't fail the request — order is still completed
          }
        } else {
          logStep("RESEND_API_KEY not configured — skipping email", {
            orderNumber: updatedOrder?.order_number
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            order: updatedOrder,
            registration: registration || null,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Payment not completed yet
    return new Response(
      JSON.stringify({
        success: false,
        status: order.status,
        order: order,
        registration: registration || null,
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
