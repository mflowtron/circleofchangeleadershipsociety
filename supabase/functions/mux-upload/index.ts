import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error("Mux credentials not configured");
    }

    // Get auth header to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No authorization header");
    }

    // Create client with anon key and auth header for JWT verification
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      throw new Error("Unauthorized: " + (claimsError?.message || "Invalid token"));
    }

    const userId = claimsData.claims.sub as string;

    // Create service role client for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { action, ...body } = await req.json();

    // Check if user is admin or advisor (required for recording upload/delete actions)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const isAdmin = roleData?.role === "admin";
    const isAdvisor = roleData?.role === "advisor";

    // Delete action requires admin only
    if (action === "delete-asset") {
      if (!isAdmin) {
        throw new Error("Only admins can delete recordings");
      }
    } else if (action === "create-upload" || action === "check-status") {
      // Recording uploads require admin or advisor
      if (!isAdmin && !isAdvisor) {
        throw new Error("Only admins and advisors can manage recordings");
      }
    }
    // post-video-upload and check-post-video are allowed for all authenticated users

    const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

    // Create upload URL for post videos (any authenticated user)
    if (action === "post-video-upload") {
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

      return new Response(
        JSON.stringify({
          upload_url: upload.url,
          upload_id: upload.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check post video upload status and get playback ID
    if (action === "check-post-video") {
      const { upload_id } = body;

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
        const playbackId = asset.playback_ids?.[0]?.id;

        return new Response(
          JSON.stringify({
            status: playbackId ? "ready" : asset.status,
            playback_id: playbackId,
            asset_id: asset.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          status: upload.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        .from("lms_recordings")
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
          .from("lms_recordings")
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
          .from("lms_recordings")
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

    if (action === "delete-asset") {
      const { asset_id, recording_id } = body;

      if (!asset_id && !recording_id) {
        throw new Error("asset_id or recording_id is required");
      }

      let muxAssetId = asset_id;

      // If no asset_id provided, look it up from the recording
      if (!muxAssetId && recording_id) {
        const { data: recording } = await supabase
          .from("lms_recordings")
          .select("mux_asset_id")
          .eq("id", recording_id)
          .single();

        muxAssetId = recording?.mux_asset_id;
      }

      // Delete from Mux if asset exists
      if (muxAssetId) {
        const deleteResponse = await fetch(
          `https://api.mux.com/video/v1/assets/${muxAssetId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${muxAuth}`,
            },
          }
        );

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorText = await deleteResponse.text();
          console.error("Mux delete error:", errorText);
          throw new Error(`Failed to delete Mux asset: ${deleteResponse.status}`);
        }

        console.log(`Deleted Mux asset: ${muxAssetId}`);
      }

      // Delete the recording from database
      if (recording_id) {
        const { error: deleteError } = await supabase
          .from("lms_recordings")
          .delete()
          .eq("id", recording_id);

        if (deleteError) {
          console.error("Database delete error:", deleteError);
          throw new Error("Failed to delete recording from database");
        }
      }

      return new Response(
        JSON.stringify({ success: true, deleted_asset: muxAssetId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate captions for a recording using Mux's auto-captioning
    if (action === "generate-captions") {
      if (!isAdmin && !isAdvisor) {
        throw new Error("Only admins and advisors can generate captions");
      }

      const { recording_id, asset_id } = body;

      if (!asset_id) {
        throw new Error("asset_id is required");
      }

      // First, get the asset tracks to find the audio track ID
      const tracksResponse = await fetch(
        `https://api.mux.com/video/v1/assets/${asset_id}`,
        {
          headers: {
            Authorization: `Basic ${muxAuth}`,
          },
        }
      );

      if (!tracksResponse.ok) {
        const error = await tracksResponse.text();
        console.error("Failed to get asset:", error);
        throw new Error(`Failed to get asset details: ${tracksResponse.status}`);
      }

      const assetData = await tracksResponse.json();
      const asset = assetData.data;

      // Find the audio track
      const audioTrack = asset.tracks?.find(
        (track: { type: string }) => track.type === "audio"
      );

      if (!audioTrack) {
        throw new Error("No audio track found on this asset");
      }

      // Generate subtitles for the audio track
      const subtitleResponse = await fetch(
        `https://api.mux.com/video/v1/assets/${asset_id}/tracks/${audioTrack.id}/generate-subtitles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${muxAuth}`,
          },
          body: JSON.stringify({
            generated_subtitles: [
              {
                language_code: "en",
                name: "English",
              },
            ],
          }),
        }
      );

      if (!subtitleResponse.ok) {
        const error = await subtitleResponse.text();
        console.error("Failed to generate subtitles:", error);
        throw new Error(`Failed to generate subtitles: ${subtitleResponse.status}`);
      }

      // Update recording status to generating
      if (recording_id) {
        await supabase
          .from("lms_recordings")
          .update({ captions_status: "generating" })
          .eq("id", recording_id);
      }

      return new Response(
        JSON.stringify({ success: true, status: "generating" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caption track info for a recording
    if (action === "get-caption-track") {
      const { asset_id } = body;

      if (!asset_id) {
        throw new Error("asset_id is required");
      }

      const assetResponse = await fetch(
        `https://api.mux.com/video/v1/assets/${asset_id}`,
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

      // Find text tracks (captions)
      const textTracks = asset.tracks?.filter(
        (track: { type: string; text_source?: string }) =>
          track.type === "text" && track.text_source === "generated_vod"
      );

      const captionTrack = textTracks?.[0];

      return new Response(
        JSON.stringify({
          has_captions: !!captionTrack,
          track_id: captionTrack?.id || null,
          status: captionTrack?.status || null,
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
