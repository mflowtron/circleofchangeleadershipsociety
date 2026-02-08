import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      console.log("OneSignal not configured, skipping scheduled notifications");
      return new Response(
        JSON.stringify({ message: "OneSignal not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all scheduled notifications that are due
    const { data: dueNotifications, error: fetchError } = await supabase
      .from("push_notifications")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching due notifications:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch scheduled notifications" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled notifications due", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${dueNotifications.length} scheduled notifications`);

    const results = [];

    for (const notification of dueNotifications) {
      try {
        // Get player IDs based on audience
        const playerIds = await getPlayerIds(
          supabase,
          notification.event_id,
          notification.audience_type,
          notification.audience_filter
        );

        if (playerIds.length === 0) {
          // No recipients, mark as sent with 0 count
          await supabase
            .from("push_notifications")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              recipient_count: 0,
            })
            .eq("id", notification.id);

          results.push({ id: notification.id, status: "sent", recipients: 0 });
          continue;
        }

        // Send via OneSignal
        const onesignalPayload: Record<string, unknown> = {
          app_id: onesignalAppId,
          include_player_ids: playerIds,
          headings: { en: notification.title },
          contents: { en: notification.message },
        };

        if (notification.redirect_url) {
          onesignalPayload.data = { redirect_url: notification.redirect_url };
          if (notification.redirect_url.startsWith("http")) {
            onesignalPayload.url = notification.redirect_url;
          }
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
          console.error(`OneSignal error for notification ${notification.id}:`, onesignalResult);
          
          await supabase
            .from("push_notifications")
            .update({
              status: "failed",
              error_message: onesignalResult.errors?.[0] || "Unknown OneSignal error",
              recipient_count: playerIds.length,
            })
            .eq("id", notification.id);

          results.push({ id: notification.id, status: "failed", error: onesignalResult.errors?.[0] });
        } else {
          await supabase
            .from("push_notifications")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              recipient_count: playerIds.length,
            })
            .eq("id", notification.id);

          results.push({ id: notification.id, status: "sent", recipients: playerIds.length });
        }
      } catch (err) {
        console.error(`Error processing notification ${notification.id}:`, err);
        
        await supabase
          .from("push_notifications")
          .update({
            status: "failed",
            error_message: err.message || "Processing error",
          })
          .eq("id", notification.id);

        results.push({ id: notification.id, status: "failed", error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} notifications`,
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-scheduled-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getPlayerIds(
  supabase: any,
  eventId: string,
  audienceType: string,
  audienceFilter: { ticket_type_ids?: string[]; attendee_ids?: string[] } | null
): Promise<string[]> {
  // Build query based on audience type
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
    .eq("order_items.orders.event_id", eventId)
    .eq("order_items.orders.status", "completed")
    .not("user_id", "is", null);

  if (audienceType === "in_person") {
    query = query.eq("order_items.ticket_types.is_virtual", false);
  } else if (audienceType === "virtual") {
    query = query.eq("order_items.ticket_types.is_virtual", true);
  } else if (audienceType === "ticket_type" && audienceFilter?.ticket_type_ids?.length) {
    query = query.in("order_items.ticket_type_id", audienceFilter.ticket_type_ids);
  } else if (audienceType === "individual" && audienceFilter?.attendee_ids?.length) {
    query = query.in("id", audienceFilter.attendee_ids);
  }

  const { data: attendees, error: attendeesError } = await query;

  if (attendeesError) {
    console.error("Error fetching attendees:", attendeesError);
    return [];
  }

  const userIds = [...new Set(attendees?.map((a: any) => a.user_id).filter(Boolean))];

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("onesignal_player_id")
    .in("user_id", userIds)
    .not("onesignal_player_id", "is", null);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return [];
  }

  return profiles?.map((p: any) => p.onesignal_player_id).filter(Boolean) || [];
}
