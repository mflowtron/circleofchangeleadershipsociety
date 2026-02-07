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

    // Fetch orders with related data
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
        ),
        attendees (
          id,
          attendee_name,
          attendee_email,
          ticket_type_id,
          order_item_id,
          is_purchaser
        ),
        order_messages (
          id,
          message,
          is_important,
          read_at,
          created_at,
          sender_type,
          sender_email
        )
      `)
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate attendee stats for each order
    const ordersWithStats = orders?.map(order => {
      const totalTickets = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
      const registeredAttendees = order.attendees?.filter((a: any) => a.attendee_name && a.attendee_email).length || 0;
      const unreadMessages = order.order_messages?.filter((m: any) => !m.read_at).length || 0;

      return {
        ...order,
        attendee_stats: {
          total: totalTickets,
          registered: registeredAttendees,
          remaining: totalTickets - registeredAttendees,
        },
        unread_messages: unreadMessages,
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
