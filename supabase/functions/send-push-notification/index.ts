import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  event_id: string;
  title: string;
  message: string;
  redirect_url?: string;
  audience_type: "all" | "in_person" | "virtual" | "ticket_type" | "individual";
  audience_filter?: {
    ticket_type_ids?: string[];
    attendee_ids?: string[];
  };
  scheduled_for?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const onesignalApiKey = Deno.env.get("ONESIGNAL_API_KEY");
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");

    if (!onesignalApiKey || !onesignalAppId) {
      return new Response(
        JSON.stringify({ error: "OneSignal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's token to verify permissions
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user can manage events
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["admin", "organizer"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: NotificationRequest = await req.json();
    const { event_id, title, message, redirect_url, audience_type, audience_filter, scheduled_for } = body;

    if (!event_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If scheduled, save to database and return
    if (scheduled_for) {
      const scheduledTime = new Date(scheduled_for);
      const now = new Date();
      
      // Validate scheduled time is in the future (at least 1 minute)
      if (scheduledTime.getTime() - now.getTime() < 60000) {
        return new Response(
          JSON.stringify({ error: "Scheduled time must be at least 1 minute in the future" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate recipient count for display
      const recipientCount = await getRecipientCount(supabase, event_id, audience_type, audience_filter);

      // Save as scheduled notification
      const { error: insertError } = await supabase.from("push_notifications").insert({
        event_id,
        created_by: user.id,
        title,
        message,
        redirect_url,
        audience_type,
        audience_filter,
        recipient_count: recipientCount,
        status: "scheduled",
        scheduled_for,
      });

      if (insertError) {
        console.error("Error saving scheduled notification:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to schedule notification" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          scheduled: true,
          recipient_count: recipientCount,
          scheduled_for 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send immediately
    return await sendNotificationNow(
      supabase,
      { event_id, title, message, redirect_url, audience_type, audience_filter },
      user.id,
      onesignalApiKey,
      onesignalAppId
    );

  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getRecipientCount(
  supabase: any,
  event_id: string,
  audience_type: string,
  audience_filter?: { ticket_type_ids?: string[]; attendee_ids?: string[] }
): Promise<number> {
  let query = supabase
    .from("attendees")
    .select(`
      id,
      user_id,
      order_items!inner(
        order_id,
        ticket_type_id,
        orders!inner(event_id, status),
        ticket_types!inner(is_virtual)
      )
    `)
    .eq("order_items.orders.event_id", event_id)
    .eq("order_items.orders.status", "completed")
    .not("user_id", "is", null);

  if (audience_type === "in_person") {
    query = query.eq("order_items.ticket_types.is_virtual", false);
  } else if (audience_type === "virtual") {
    query = query.eq("order_items.ticket_types.is_virtual", true);
  } else if (audience_type === "ticket_type" && audience_filter?.ticket_type_ids?.length) {
    query = query.in("order_items.ticket_type_id", audience_filter.ticket_type_ids);
  } else if (audience_type === "individual" && audience_filter?.attendee_ids?.length) {
    query = query.in("id", audience_filter.attendee_ids);
  }

  const { data: attendees } = await query;
  const userIds = [...new Set(attendees?.map((a: any) => a.user_id).filter(Boolean))];
  
  // Get profiles with player IDs
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, onesignal_player_id")
    .in("user_id", userIds.length ? userIds : ['none'])
    .not("onesignal_player_id", "is", null);

  return profiles?.length || 0;
}

async function sendNotificationNow(
  supabase: any,
  params: {
    event_id: string;
    title: string;
    message: string;
    redirect_url?: string;
    audience_type: string;
    audience_filter?: { ticket_type_ids?: string[]; attendee_ids?: string[] };
  },
  userId: string,
  onesignalApiKey: string,
  onesignalAppId: string
) {
  const { event_id, title, message, redirect_url, audience_type, audience_filter } = params;

  // Build query to get player IDs based on audience
  let query = supabase
    .from("attendees")
    .select(`
      id,
      user_id,
      order_item_id,
      order_items!inner(
        order_id,
        ticket_type_id,
        orders!inner(event_id, status),
        ticket_types!inner(is_virtual)
      )
    `)
    .eq("order_items.orders.event_id", event_id)
    .eq("order_items.orders.status", "completed")
    .not("user_id", "is", null);

  // Apply audience filters
  if (audience_type === "in_person") {
    query = query.eq("order_items.ticket_types.is_virtual", false);
  } else if (audience_type === "virtual") {
    query = query.eq("order_items.ticket_types.is_virtual", true);
  } else if (audience_type === "ticket_type" && audience_filter?.ticket_type_ids?.length) {
    query = query.in("order_items.ticket_type_id", audience_filter.ticket_type_ids);
  } else if (audience_type === "individual" && audience_filter?.attendee_ids?.length) {
    query = query.in("id", audience_filter.attendee_ids);
  }

  const { data: attendees, error: attendeesError } = await query;

  if (attendeesError) {
    console.error("Error fetching attendees:", attendeesError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch attendees" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get unique user IDs
  const userIds = [...new Set(attendees?.map((a: any) => a.user_id).filter(Boolean))];

  if (userIds.length === 0) {
    // Record notification with 0 recipients
    await supabase.from("push_notifications").insert({
      event_id,
      created_by: userId,
      title,
      message,
      redirect_url,
      audience_type,
      audience_filter,
      recipient_count: 0,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, recipient_count: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get player IDs from profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, onesignal_player_id")
    .in("user_id", userIds)
    .not("onesignal_player_id", "is", null);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch profiles" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const playerIds = profiles?.map((p: any) => p.onesignal_player_id).filter(Boolean) || [];

  if (playerIds.length === 0) {
    // Record notification with 0 recipients
    await supabase.from("push_notifications").insert({
      event_id,
      created_by: userId,
      title,
      message,
      redirect_url,
      audience_type,
      audience_filter,
      recipient_count: 0,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, recipient_count: 0, note: "No attendees have push notifications enabled" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Send notification via OneSignal
  const onesignalPayload: Record<string, unknown> = {
    app_id: onesignalAppId,
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: message },
  };

  if (redirect_url) {
    onesignalPayload.data = { redirect_url };
    onesignalPayload.url = redirect_url.startsWith("http") 
      ? redirect_url 
      : undefined;
  }

  const onesignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${onesignalApiKey}`,
    },
    body: JSON.stringify(onesignalPayload),
  });

  const onesignalResult = await onesignalResponse.json();

  if (!onesignalResponse.ok) {
    console.error("OneSignal error:", onesignalResult);
    
    // Record failed notification
    await supabase.from("push_notifications").insert({
      event_id,
      created_by: userId,
      title,
      message,
      redirect_url,
      audience_type,
      audience_filter,
      recipient_count: playerIds.length,
      status: "failed",
      error_message: onesignalResult.errors?.[0] || "Unknown OneSignal error",
    });

    return new Response(
      JSON.stringify({ error: "Failed to send notification", details: onesignalResult }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Record successful notification
  await supabase.from("push_notifications").insert({
    event_id,
    created_by: userId,
    title,
    message,
    redirect_url,
    audience_type,
    audience_filter,
    recipient_count: playerIds.length,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      recipient_count: playerIds.length,
      onesignal_id: onesignalResult.id 
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Export the send function for use by process-scheduled-notifications
export { sendNotificationNow, getRecipientCount };
