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
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('id, ticket_type_id, quantity')
          .eq('order_id', order_id);

        if (orderItems) {
          const attendeeRecords = [];
          let purchaserAttendeeCreated = false;
          
          for (const item of orderItems) {
            for (let i = 0; i < item.quantity; i++) {
              // Mark first attendee as purchaser if they're attending
              const isPurchaserAttendee = order.purchaser_is_attending === true && !purchaserAttendeeCreated;
              
              attendeeRecords.push({
                order_id: order_id,
                order_item_id: item.id,
                ticket_type_id: item.ticket_type_id,
                is_purchaser: isPurchaserAttendee,
                attendee_name: isPurchaserAttendee ? order.full_name : null,
                attendee_email: isPurchaserAttendee ? order.email : null,
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
