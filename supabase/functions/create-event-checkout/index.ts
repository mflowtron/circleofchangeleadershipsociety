import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TicketSelection {
  ticket_type_id: string;
  quantity: number;
}

interface CheckoutRequest {
  event_id: string;
  tickets: TicketSelection[];
  buyer_email: string;
  buyer_name: string;
  buyer_phone?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-EVENT-CHECKOUT] ${step}${detailsStr}`);
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

    const body: CheckoutRequest = await req.json();
    const { event_id, tickets, buyer_email, buyer_name, buyer_phone } = body;

    if (!event_id || !tickets?.length || !buyer_email || !buyer_name) {
      throw new Error("Missing required fields");
    }

    logStep("Request parsed", { event_id, ticketCount: tickets.length, buyer_email });

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, slug, is_published')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    if (!event.is_published) {
      throw new Error("Event is not available for purchase");
    }

    logStep("Event found", { title: event.title });

    // Get ticket types and validate availability
    const ticketTypeIds = tickets.map(t => t.ticket_type_id);
    const { data: ticketTypes, error: ticketError } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .in('id', ticketTypeIds)
      .eq('event_id', event_id);

    if (ticketError || !ticketTypes?.length) {
      throw new Error("Invalid ticket types");
    }

    logStep("Ticket types fetched", { count: ticketTypes.length });

    // Build line items and calculate totals
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let subtotalCents = 0;
    const orderItems: { ticket_type_id: string; quantity: number; unit_price_cents: number }[] = [];

    for (const selection of tickets) {
      const ticketType = ticketTypes.find(t => t.id === selection.ticket_type_id);
      if (!ticketType) {
        throw new Error(`Ticket type ${selection.ticket_type_id} not found`);
      }

      // Check availability
      if (ticketType.quantity_available !== null) {
        const remaining = ticketType.quantity_available - ticketType.quantity_sold;
        if (selection.quantity > remaining) {
          throw new Error(`Not enough ${ticketType.name} tickets available`);
        }
      }

      // Check max per order
      if (selection.quantity > ticketType.max_per_order) {
        throw new Error(`Maximum ${ticketType.max_per_order} ${ticketType.name} tickets per order`);
      }

      // Check sales window
      const now = new Date();
      if (ticketType.sales_start_at && new Date(ticketType.sales_start_at) > now) {
        throw new Error(`${ticketType.name} tickets are not yet on sale`);
      }
      if (ticketType.sales_end_at && new Date(ticketType.sales_end_at) < now) {
        throw new Error(`${ticketType.name} ticket sales have ended`);
      }

      const itemTotal = ticketType.price_cents * selection.quantity;
      subtotalCents += itemTotal;

      orderItems.push({
        ticket_type_id: ticketType.id,
        quantity: selection.quantity,
        unit_price_cents: ticketType.price_cents,
      });

      // Add to Stripe line items
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
            description: ticketType.description || undefined,
          },
          unit_amount: ticketType.price_cents,
        },
        quantity: selection.quantity,
      });
    }

    logStep("Line items built", { subtotalCents, itemCount: lineItems.length });

    // Generate order number
    const { data: orderNumberData } = await supabaseAdmin.rpc('generate_order_number');
    const orderNumber = orderNumberData || `ORD-${Date.now()}`;

    logStep("Order number generated", { orderNumber });

    // Check if user is authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        logStep("User authenticated", { userId });
      }
    }

    // Create pending order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        event_id: event_id,
        user_id: userId,
        email: buyer_email,
        full_name: buyer_name,
        phone: buyer_phone || null,
        status: 'pending',
        subtotal_cents: subtotalCents,
        fees_cents: 0,
        total_cents: subtotalCents,
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep("Order creation failed", { error: orderError });
      throw new Error("Failed to create order");
    }

    logStep("Order created", { orderId: order.id });

    // Create order items
    const orderItemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      logStep("Order items creation failed", { error: itemsError });
      throw new Error("Failed to create order items");
    }

    logStep("Order items created");

    // Handle free orders
    if (subtotalCents === 0) {
      // Mark order as completed immediately for free tickets
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      // Update ticket quantities
      for (const item of orderItems) {
        // Fetch current value and update
        const { data: ticketType } = await supabaseAdmin
          .from('ticket_types')
          .select('quantity_sold')
          .eq('id', item.ticket_type_id)
          .single();

        if (ticketType) {
          await supabaseAdmin
            .from('ticket_types')
            .update({ quantity_sold: ticketType.quantity_sold + item.quantity })
            .eq('id', item.ticket_type_id);
        }
      }

      // Create attendee records for free orders
      const { data: orderItemsData } = await supabaseAdmin
        .from('order_items')
        .select('id, ticket_type_id, quantity')
        .eq('order_id', order.id);

      if (orderItemsData) {
        const attendeeRecords = [];
        for (const item of orderItemsData) {
          for (let i = 0; i < item.quantity; i++) {
            attendeeRecords.push({
              order_id: order.id,
              order_item_id: item.id,
              ticket_type_id: item.ticket_type_id,
            });
          }
        }

        if (attendeeRecords.length > 0) {
          const { error: attendeeError } = await supabaseAdmin
            .from('attendees')
            .insert(attendeeRecords);

          if (attendeeError) {
            logStep("Failed to create attendees for free order", { error: attendeeError });
          } else {
            logStep("Attendee records created for free order", { count: attendeeRecords.length });
          }
        }
      }

      logStep("Free order completed");

      const origin = req.headers.get("origin") || "";
      return new Response(JSON.stringify({ 
        success: true,
        order_id: order.id,
        order_number: orderNumber,
        redirect_url: `${origin}/events/${event.slug}/checkout/success?order=${order.id}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create Stripe checkout session for paid orders
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: buyer_email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : buyer_email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/events/${event.slug}/checkout/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events/${event.slug}/checkout?cancelled=true`,
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        event_id: event_id,
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
        },
      },
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Update order with payment intent
    if (session.payment_intent) {
      await supabaseAdmin
        .from('orders')
        .update({ stripe_payment_intent_id: session.payment_intent as string })
        .eq('id', order.id);
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      order_id: order.id,
      order_number: orderNumber,
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
