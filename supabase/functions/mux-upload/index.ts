import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID");
    const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error("Mux credentials not configured");
    }

    // Get auth header to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const userId = userData.user.id;

    // Check if user is admin or advisor
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "advisor")) {
      throw new Error("Only admins and advisors can upload recordings");
    }

    const { action, ...body } = await req.json();

    const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

    if (action === "create-upload") {
      // Create a direct upload URL
      const response = await fetch("https://api.mux.com/video/v1/uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${muxAuth}`,
        },
        body: JSON.stringify({
          cors_origin: "*",
          new_asset_settings: {
            playback_policy: ["public"],
            encoding_tier: "baseline",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Mux API error:", error);
        throw new Error(`Mux API error: ${response.status}`);
      }

      const data = await response.json();
      const upload = data.data;

      // Create a pending recording entry
      const { data: recording, error: insertError } = await supabase
        .from("recordings")
        .insert({
          title: body.title || "Untitled Recording",
          description: body.description || null,
          uploaded_by: userId,
          mux_upload_id: upload.id,
          status: "waiting",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Failed to create recording entry");
      }

      return new Response(
        JSON.stringify({
          upload_url: upload.url,
          upload_id: upload.id,
          recording_id: recording.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-status") {
      const { upload_id, recording_id } = body;

      // Check upload status
      const uploadResponse = await fetch(
        `https://api.mux.com/video/v1/uploads/${upload_id}`,
        {
          headers: {
            Authorization: `Basic ${muxAuth}`,
          },
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to check upload status");
      }

      const uploadData = await uploadResponse.json();
      const upload = uploadData.data;

      if (upload.status === "asset_created" && upload.asset_id) {
        // Get asset details
        const assetResponse = await fetch(
          `https://api.mux.com/video/v1/assets/${upload.asset_id}`,
          {
            headers: {
              Authorization: `Basic ${muxAuth}`,
            },
          }
        );

        if (!assetResponse.ok) {
          throw new Error("Failed to get asset details");
        }

        const assetData = await assetResponse.json();
        const asset = assetData.data;

        // Update recording with asset info
        const playbackId = asset.playback_ids?.[0]?.id;
        
        // Determine the correct status - if playback_id exists, it's ready
        const recordingStatus = playbackId ? "ready" : asset.status;
        
        await supabase
          .from("recordings")
          .update({
            mux_asset_id: asset.id,
            mux_playback_id: playbackId,
            status: recordingStatus,
            video_url: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
          })
          .eq("id", recording_id);

        return new Response(
          JSON.stringify({
            status: recordingStatus,
            playback_id: playbackId,
            asset_id: asset.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Update status to preparing if upload is in progress
      if (upload.status === "waiting" || upload.status === "uploading") {
        await supabase
          .from("recordings")
          .update({ status: "preparing" })
          .eq("id", recording_id);
      }

      return new Response(
        JSON.stringify({
          status: upload.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
