import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TicketSelection {
  ticket_type_id: string;
  quantity: number;
}

interface RegistrationCheckoutRequest {
  event_id: string;
  tickets: TicketSelection[];
  buyer_email: string;
  buyer_name: string;
  buyer_phone?: string;
  organization_name?: string;
  referral_source?: string;
  purchaser_is_attending?: boolean | null;
  pricing_tier?: string;
}

const SERVICE_FEE_CENTS = 2532; // $25.32 per ticket

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-REGISTRATION-CHECKOUT] ${step}${detailsStr}`);
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

    const body: RegistrationCheckoutRequest = await req.json();
    const {
      event_id,
      tickets,
      buyer_email,
      buyer_name,
      buyer_phone,
      organization_name,
      referral_source,
      purchaser_is_attending,
      pricing_tier,
    } = body;

    if (!event_id || !tickets?.length || !buyer_email || !buyer_name) {
      throw new Error("Missing required fields");
    }

    logStep("Request parsed", {
      event_id,
      ticketCount: tickets.length,
      buyer_email,
    });

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, title, slug, is_published")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    if (!event.is_published) {
      throw new Error("Event is not available for purchase");
    }

    logStep("Event found", { title: event.title });

    // Get ticket types and validate availability
    const ticketTypeIds = tickets.map((t) => t.ticket_type_id);
    const { data: ticketTypes, error: ticketError } = await supabaseAdmin
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds)
      .eq("event_id", event_id);

    if (ticketError || !ticketTypes?.length) {
      throw new Error("Invalid ticket types");
    }

    logStep("Ticket types fetched", { count: ticketTypes.length });

    // Build line items and calculate totals
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let subtotalCents = 0;
    let totalQuantity = 0;
    const orderItems: {
      ticket_type_id: string;
      quantity: number;
      unit_price_cents: number;
      name: string;
    }[] = [];

    for (const selection of tickets) {
      const ticketType = ticketTypes.find(
        (t: { id: string }) => t.id === selection.ticket_type_id
      );
      if (!ticketType) {
        throw new Error(`Ticket type ${selection.ticket_type_id} not found`);
      }

      // Check availability
      if (ticketType.quantity_available !== null) {
        const remaining =
          ticketType.quantity_available - ticketType.quantity_sold;
        if (selection.quantity > remaining) {
          throw new Error(
            `Not enough ${ticketType.name} tickets available`
          );
        }
      }

      // Check max per order
      if (selection.quantity > ticketType.max_per_order) {
        throw new Error(
          `Maximum ${ticketType.max_per_order} ${ticketType.name} tickets per order`
        );
      }

      // Check sales window
      const now = new Date();
      if (
        ticketType.sales_start_at &&
        new Date(ticketType.sales_start_at) > now
      ) {
        throw new Error(`${ticketType.name} tickets are not yet on sale`);
      }
      if (
        ticketType.sales_end_at &&
        new Date(ticketType.sales_end_at) < now
      ) {
        throw new Error(`${ticketType.name} ticket sales have ended`);
      }

      const itemTotal = ticketType.price_cents * selection.quantity;
      subtotalCents += itemTotal;
      totalQuantity += selection.quantity;

      orderItems.push({
        ticket_type_id: ticketType.id,
        quantity: selection.quantity,
        unit_price_cents: ticketType.price_cents,
        name: ticketType.name,
      });

      // Add ticket line item to Stripe
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
            description: ticketType.description || undefined,
          },
          unit_amount: ticketType.price_cents,
        },
        quantity: selection.quantity,
      });
    }

    // Add service fee as a separate line item
    const totalFeesCents = SERVICE_FEE_CENTS * totalQuantity;
    if (totalFeesCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Service Fee",
            description: `$${(SERVICE_FEE_CENTS / 100).toFixed(2)} per ticket`,
          },
          unit_amount: SERVICE_FEE_CENTS,
        },
        quantity: totalQuantity,
      });
    }

    logStep("Line items built", { subtotalCents, totalFeesCents });

    // Generate order number
    const { data: orderNumberData } = await supabaseAdmin.rpc(
      "generate_order_number"
    );
    const orderNumber = orderNumberData || `ORD-${Date.now()}`;

    logStep("Order number generated", { orderNumber });

    // Create pending order (no user_id — this is a public flow)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        event_id: event_id,
        user_id: null,
        email: buyer_email,
        full_name: buyer_name,
        phone: buyer_phone || null,
        organization_name: organization_name || null,
        referral_source: referral_source || null,
        status: "pending",
        subtotal_cents: subtotalCents,
        fees_cents: totalFeesCents,
        total_cents: subtotalCents + totalFeesCents,
        purchaser_is_attending: purchaser_is_attending,
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep("Order creation failed", { error: orderError });
      throw new Error("Failed to create order");
    }

    logStep("Order created", { orderId: order.id });

    // Create order items
    const orderItemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
    }));

    const { data: insertedOrderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsToInsert)
      .select("id, ticket_type_id, quantity");

    if (itemsError) {
      logStep("Order items creation failed", { error: itemsError });
      throw new Error("Failed to create order items");
    }

    logStep("Order items created");

    // Create registration metadata record
    const { error: regError } = await supabaseAdmin
      .from("registrations")
      .insert({
        order_id: order.id,
        event_id: event_id,
        pricing_tier: pricing_tier || null,
      });

    if (regError) {
      logStep("Registration creation failed", { error: regError });
      // Non-fatal — the order still works without the metadata
    }

    // Atomically reserve tickets
    for (const item of orderItems) {
      const { data: reserved, error: reserveError } = await supabaseAdmin.rpc(
        "reserve_tickets",
        {
          _ticket_type_id: item.ticket_type_id,
          _quantity: item.quantity,
        }
      );

      if (reserveError || !reserved) {
        logStep("Failed to reserve tickets", {
          ticketTypeId: item.ticket_type_id,
          error: reserveError,
        });
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id);
        throw new Error(`Not enough ${item.name} tickets available`);
      }
    }

    logStep("Tickets reserved atomically");

    // Handle free orders
    if (subtotalCents === 0 && totalFeesCents === 0) {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // Create attendee records for free orders
      if (insertedOrderItems) {
        const attendeeRecords = [];
        let purchaserCreated = false;

        for (const item of insertedOrderItems) {
          for (let i = 0; i < item.quantity; i++) {
            const isPurchaser =
              purchaser_is_attending === true && !purchaserCreated;
            attendeeRecords.push({
              order_item_id: item.id,
              attendee_name: isPurchaser ? buyer_name : "",
              attendee_email: isPurchaser ? buyer_email : "",
              is_purchaser: isPurchaser,
              form_status: "needs_info",
            });
            if (isPurchaser) purchaserCreated = true;
          }
        }

        if (attendeeRecords.length > 0) {
          await supabaseAdmin.from("attendees").insert(attendeeRecords);
        }
      }

      logStep("Free order completed");
      const origin = req.headers.get("origin") || "";
      return new Response(
        JSON.stringify({
          success: true,
          order_id: order.id,
          order_number: orderNumber,
          redirect_url: `${origin}/register/${event.slug}/confirmation?order=${order.id}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create Stripe Checkout Session for paid orders
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({
      email: buyer_email,
      limit: 1,
    });
    const customerId =
      customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/register/${event.slug}/confirmation?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/register/${event.slug}/checkout?cancelled=true`,
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        event_id: event_id,
        flow: "registration",
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
        },
      },
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Update order with Stripe payment intent
    if (session.payment_intent) {
      await supabaseAdmin
        .from("orders")
        .update({
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", order.id);
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        order_id: order.id,
        order_number: orderNumber,
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
