import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, session_token, order_id, message } = await req.json();

    if (!email || !session_token || !order_id || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify session token
    const { data: accessCode, error: codeError } = await supabase
      .from("order_access_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", session_token)
      .not("used_at", "is", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (codeError || !accessCode) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the order belongs to this email
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, email")
      .eq("id", order_id)
      .eq("email", email.toLowerCase())
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the customer message
    const { data: newMessage, error: insertError } = await supabase
      .from("order_messages")
      .insert({
        order_id,
        message: message.trim(),
        sender_type: "customer",
        sender_email: email.toLowerCase(),
        is_important: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to send message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: newMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
