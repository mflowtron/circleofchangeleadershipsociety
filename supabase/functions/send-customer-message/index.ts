import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  orderId: string;
  message: string;
  sessionToken: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, message, sessionToken }: SendMessageRequest = await req.json();

    if (!orderId || !message || !sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Order ID, message, and session token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse session token
    let tokenData;
    try {
      tokenData = JSON.parse(atob(sessionToken));
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid session token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, exp } = tokenData;

    // Check token expiration
    if (!exp || Date.now() > exp) {
      return new Response(
        JSON.stringify({ error: 'Session expired. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the order belongs to this email
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, email')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.email.toLowerCase() !== normalizedEmail) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to message this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate message length
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 || trimmedMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message must be between 1 and 2000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the customer message
    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from('order_messages')
      .insert({
        order_id: orderId,
        message: trimmedMessage,
        sender_type: 'customer',
        sender_email: normalizedEmail,
        created_by: null,
        is_important: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: newMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-customer-message:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
