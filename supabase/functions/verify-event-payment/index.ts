import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-EVENT-PAYMENT] ${step}${detailsStr}`);
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
      .from('orders')
      .select('*, order_items(*), purchaser_is_attending')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order found", { orderNumber: order.order_number, status: order.status });

    // If already completed, return success
    if (order.status === 'completed') {
      return new Response(JSON.stringify({ 
        success: true,
        order: order
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify payment with Stripe if session_id provided
    if (session_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const session = await stripe.checkout.sessions.retrieve(session_id);

      logStep("Stripe session retrieved", { 
        paymentStatus: session.payment_status,
        status: session.status 
      });

      if (session.payment_status === 'paid') {
        // Update order to completed
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string
          })
          .eq('id', order_id);

        if (updateError) {
          logStep("Failed to update order", { error: updateError });
        } else {
          logStep("Order marked as completed");
        }

        // Note: Ticket quantities are now reserved atomically in create-event-checkout
        // before the Stripe redirect, so no update needed here

        logStep("Ticket quantities updated");

        // Create attendee records for each ticket purchased
        // Schema: attendees only has order_item_id (no order_id or ticket_type_id)
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('id, quantity')
          .eq('order_id', order_id);

        if (orderItems) {
          const attendeeRecords = [];
          let purchaserAttendeeCreated = false;
          
          for (const item of orderItems) {
            for (let i = 0; i < item.quantity; i++) {
              // Mark first attendee as purchaser if they're attending
              const isPurchaserAttendee = order.purchaser_is_attending === true && !purchaserAttendeeCreated;
              
              attendeeRecords.push({
                order_item_id: item.id,
                attendee_name: isPurchaserAttendee ? order.full_name : '',
                attendee_email: isPurchaserAttendee ? order.email : '',
              });
              
              if (isPurchaserAttendee) {
                purchaserAttendeeCreated = true;
              }
            }
          }

          if (attendeeRecords.length > 0) {
            const { error: attendeeError } = await supabaseAdmin
              .from('attendees')
              .insert(attendeeRecords);

            if (attendeeError) {
              logStep("Failed to create attendees", { error: attendeeError });
            } else {
              logStep("Attendee records created", { count: attendeeRecords.length, purchaserIncluded: purchaserAttendeeCreated });
            }
          }
        }

        // Fetch updated order
        const { data: updatedOrder } = await supabaseAdmin
          .from('orders')
          .select('*, order_items(*, ticket_type:ticket_types(name)), edit_token')
          .eq('id', order_id)
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
                const ticketName = item.ticket_type?.name || 'Ticket';
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

            // Build edit link if edit token exists
            const editLinkHtml = updatedOrder.edit_token
              ? `
                <div style="margin: 24px 0; padding: 16px; background: #FFF8F0; border-left: 4px solid #DFA51F; border-radius: 4px;">
                  <p style="color: #333; margin: 0 0 8px 0; font-weight: 600;">Need to make changes?</p>
                  <p style="color: #666; margin: 0 0 12px 0; font-size: 14px;">
                    You can edit attendee details using this link:
                  </p>
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/edit-order?token=${updatedOrder.edit_token}"
                     style="display: inline-block; padding: 10px 20px; background: #DFA51F; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    Edit Attendee Details
                  </a>
                </div>
              `
              : '';

            const emailHtml = `
              <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #6B1D3A; margin: 0 0 8px 0; font-size: 28px;">Order Confirmation</h1>
                  <p style="color: #666; margin: 0;">Thank you for your purchase!</p>
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
                        <th style="padding: 12px 0; color: #6B1D3A; text-align: left; font-weight: 600;">Ticket Type</th>
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

                ${editLinkHtml}

                <div style="margin: 24px 0; padding: 16px; background: #F5F5F5; border-radius: 8px;">
                  <p style="color: #333; margin: 0 0 8px 0; font-weight: 600;">What's Next?</p>
                  <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.6;">
                    ${totalTickets > 1
                      ? `You've purchased ${totalTickets} tickets. Please provide attendee details for each ticket using the edit link above.`
                      : 'Your ticket is confirmed! We look forward to seeing you at the event.'}
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
                subject: `Order Confirmation - ${updatedOrder.order_number}`,
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

        return new Response(JSON.stringify({
          success: true,
          order: updatedOrder
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Payment not completed yet
    return new Response(JSON.stringify({ 
      success: false,
      status: order.status,
      order: order
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
