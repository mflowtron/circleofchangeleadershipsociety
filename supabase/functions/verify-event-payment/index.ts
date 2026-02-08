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

        // Fetch updated order with ticket type names
        const { data: updatedOrder } = await supabaseAdmin
          .from('orders')
          .select('*, order_items(*, ticket_type:ticket_types(name)), edit_token')
          .eq('id', order_id)
          .single();

        // Send order confirmation email
        if (updatedOrder) {
          const resendApiKey = Deno.env.get("RESEND_API_KEY");

          // Get event details for the email
          const { data: event } = await supabaseAdmin
            .from('events')
            .select('title, slug')
            .eq('id', updatedOrder.event_id)
            .single();

          if (resendApiKey && event) {
            try {
              const origin = req.headers.get("origin") || "";
              const formatPrice = (cents: number) => {
                if (cents === 0) return 'Free';
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
              };

              const ticketRows = (updatedOrder.order_items || []).map((item: any) =>
                `<tr>
                  <td style="padding: 8px 0; color: #333;">${item.ticket_type?.name || 'Ticket'} &times; ${item.quantity}</td>
                  <td style="padding: 8px 0; text-align: right; color: #333;">${formatPrice(item.unit_price_cents * item.quantity)}</td>
                </tr>`
              ).join('');

              const attendeeUrl = updatedOrder.edit_token
                ? `${origin}/events/${event.slug}/order/${updatedOrder.id}/attendees?token=${updatedOrder.edit_token}`
                : '';

              const attendeeCta = attendeeUrl
                ? `<p style="color: #333;">Purchased tickets for others? Add their names and emails so they can receive event updates.</p>
                   <div style="text-align: center; margin: 24px 0;">
                     <a href="${attendeeUrl}" style="background: #DFA51F; color: #2D0A18; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                       Add Attendee Details
                     </a>
                   </div>`
                : '';

              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "Circle of Change <noreply@circleofchange.org>",
                  to: [updatedOrder.email],
                  subject: `Order Confirmed - ${event.title}`,
                  html: `
                    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                      <h2 style="color: #6B1D3A; margin-bottom: 8px;">Order Confirmed!</h2>
                      <p style="color: #333;">Hi ${updatedOrder.full_name},</p>
                      <p style="color: #333;">Thank you for your purchase. Your tickets are confirmed.</p>

                      <div style="background: #FFF8F0; border: 1px solid #DFA51F; border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <p style="margin: 0 0 4px; font-weight: bold; color: #2D0A18;">Order #${updatedOrder.order_number}</p>
                        <p style="margin: 0 0 16px; color: #666; font-size: 14px;">${event.title}</p>
                        <table style="width: 100%; border-collapse: collapse;">
                          ${ticketRows}
                          <tr>
                            <td colspan="2" style="padding: 12px 0 0;"><hr style="border: none; border-top: 1px solid #EDD9B4;" /></td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #2D0A18;">Total</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #2D0A18;">${formatPrice(updatedOrder.total_cents)}</td>
                          </tr>
                        </table>
                      </div>

                      ${attendeeCta}

                      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                      <p style="color: #999; font-size: 12px;">Circle of Change Leadership Society</p>
                    </div>
                  `,
                }),
              });
              logStep("Confirmation email sent", { to: updatedOrder.email });
            } catch (emailError) {
              logStep("Confirmation email failed", { error: String(emailError) });
              // Don't fail the request if email fails
            }
          } else {
            logStep("Confirmation email skipped — missing RESEND_API_KEY or event data");
          }
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
