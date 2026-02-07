import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user email
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = claimsData.claims.email as string;
    const normalizedEmail = email.toLowerCase().trim();

    // Create Supabase client with service role for data access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find attendee records for this user to get their order_item_ids
    const { data: attendeeRecords } = await supabaseAdmin
      .from('attendees')
      .select('order_item_id')
      .ilike('attendee_email', normalizedEmail);

    const orderItemIds = attendeeRecords?.map(a => a.order_item_id).filter(Boolean) || [];

    // Get order IDs from order_items
    let attendeeOrderIds: string[] = [];
    if (orderItemIds.length > 0) {
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('order_id')
        .in('id', orderItemIds);
      attendeeOrderIds = orderItems?.map(oi => oi.order_id) || [];
    }

    // Fetch orders where user is purchaser OR an attendee
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        purchaser_is_attending,
        event:events (
          id,
          title,
          slug,
          starts_at,
          ends_at,
          venue_name,
          venue_address,
          cover_image_url
        ),
        order_items (
          *,
          ticket_type:ticket_types (
            id,
            name,
            description
          )
        )
      `)
      .or(`email.ilike.${normalizedEmail},id.in.(${attendeeOrderIds.length > 0 ? attendeeOrderIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch attendees for these orders through order_items
    const orderIds = orders?.map(o => o.id) || [];
    let attendeesByOrderItem: Map<string, any[]> = new Map();
    
    if (orderIds.length > 0) {
      // Get all order_item_ids for these orders
      const allOrderItemIds = orders?.flatMap(o => o.order_items?.map((oi: any) => oi.id) || []) || [];
      
      if (allOrderItemIds.length > 0) {
        const { data: attendees } = await supabaseAdmin
          .from('attendees')
          .select('id, attendee_name, attendee_email, order_item_id')
          .in('order_item_id', allOrderItemIds);
        
        attendees?.forEach(a => {
          if (!attendeesByOrderItem.has(a.order_item_id)) {
            attendeesByOrderItem.set(a.order_item_id, []);
          }
          attendeesByOrderItem.get(a.order_item_id)!.push(a);
        });
      }
    }

    // Calculate attendee stats for each order
    const ordersWithStats = orders?.map(order => {
      // Collect all attendees for this order's items
      const orderAttendees: any[] = [];
      order.order_items?.forEach((item: any) => {
        const itemAttendees = attendeesByOrderItem.get(item.id) || [];
        orderAttendees.push(...itemAttendees);
      });

      const totalTickets = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
      const registeredAttendees = orderAttendees.filter(a => a.attendee_name && a.attendee_email).length;

      return {
        ...order,
        attendees: orderAttendees,
        attendee_stats: {
          total: totalTickets,
          registered: registeredAttendees,
          remaining: totalTickets - registeredAttendees,
        },
      };
    }) || [];

    return new Response(
      JSON.stringify({ orders: ordersWithStats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-orders-by-email:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
