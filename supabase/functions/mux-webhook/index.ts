import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mux-signature",
};

// Verify Mux webhook signature (optional but recommended for production)
async function verifyMuxSignature(
  payload: string,
  signature: string | null,
  secret: string | null
): Promise<boolean> {
  if (!signature || !secret) {
    console.log("No signature or secret provided, skipping verification");
    return true; // Skip verification if no secret configured
  }

  try {
    // Mux signature format: t=timestamp,v1=signature
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const sig = parts.find((p) => p.startsWith("v1="))?.slice(3);

    if (!timestamp || !sig) return false;

    // Create signed payload
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );

    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return sig === expectedSig;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const MUX_WEBHOOK_SECRET = Deno.env.get("MUX_WEBHOOK_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const payload = await req.text();
    const signature = req.headers.get("mux-signature");

    // Verify webhook signature if secret is configured
    const isValid = await verifyMuxSignature(
      payload,
      signature,
      MUX_WEBHOOK_SECRET || null
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(payload);
    console.log("Received Mux webhook event:", event.type);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle different event types
    switch (event.type) {
      case "video.asset.ready": {
        const asset = event.data;
        const playbackId = asset.playback_ids?.[0]?.id;
        const assetId = asset.id;
        const aspectRatio = asset.aspect_ratio; // e.g., "16:9", "9:16", "1:1"

        console.log(`Asset ready: ${assetId}, playback_id: ${playbackId}, aspect_ratio: ${aspectRatio}`);

        // Find recording by mux_asset_id or mux_upload_id
        // First try by asset_id
        let { data: recording, error } = await supabase
          .from("lms_recordings")
          .select("id")
          .eq("mux_asset_id", assetId)
          .maybeSingle();

        // If not found, try to find by checking uploads
        if (!recording && asset.upload_id) {
          const result = await supabase
            .from("lms_recordings")
            .select("id")
            .eq("mux_upload_id", asset.upload_id)
            .maybeSingle();
          recording = result.data;
          error = result.error;
        }

        if (recording) {
          await supabase
            .from("lms_recordings")
            .update({
              mux_asset_id: assetId,
              mux_playback_id: playbackId,
              status: "ready",
              video_url: playbackId
                ? `https://stream.mux.com/${playbackId}.m3u8`
                : null,
            })
            .eq("id", recording.id);

          console.log(`Updated recording ${recording.id} to ready`);
        } else {
          console.log(`No recording found for asset ${assetId}`);
        }

        // Also update any posts that use this playback ID with the aspect ratio
        if (playbackId && aspectRatio) {
          await supabase
            .from("lms_posts")
            .update({ video_aspect_ratio: aspectRatio })
            .eq("video_url", playbackId);
          
          console.log(`Updated posts with playbackId ${playbackId} to aspect ratio ${aspectRatio}`);
        }
        break;
      }

      case "video.asset.created": {
        const asset = event.data;
        const uploadId = asset.upload_id;
        const assetId = asset.id;

        console.log(`Asset created: ${assetId} from upload: ${uploadId}`);

        if (uploadId) {
          // Update recording with asset ID
          await supabase
            .from("lms_recordings")
            .update({
              mux_asset_id: assetId,
              status: "preparing",
            })
            .eq("mux_upload_id", uploadId);
        }
        break;
      }

      case "video.asset.errored": {
        const asset = event.data;
        const assetId = asset.id;

        console.log(`Asset errored: ${assetId}`);

        // Update recording status to error
        await supabase
          .from("lms_recordings")
          .update({ status: "error" })
          .eq("mux_asset_id", assetId);
        break;
      }

      case "video.upload.asset_created": {
        const upload = event.data;
        const uploadId = upload.id;
        const assetId = upload.asset_id;

        console.log(`Upload ${uploadId} created asset ${assetId}`);

        // Link upload to asset
        await supabase
          .from("lms_recordings")
          .update({
            mux_asset_id: assetId,
            status: "preparing",
          })
          .eq("mux_upload_id", uploadId);
        break;
      }

      case "video.asset.track.ready": {
        // Handle caption track becoming ready
        const track = event.data;
        const assetId = track.asset_id;
        const trackId = track.id;
        const textSource = track.text_source;

        console.log(`Track ready: ${trackId} for asset ${assetId}, text_source: ${textSource}`);

        // Only process generated captions (auto-generated from Whisper)
        if (textSource === "generated_vod") {
          // Find recording by asset ID
          const { data: recording } = await supabase
            .from("lms_recordings")
            .select("id")
            .eq("mux_asset_id", assetId)
            .maybeSingle();

          if (recording) {
            await supabase
              .from("lms_recordings")
              .update({
                captions_status: "ready",
                captions_track_id: trackId,
              })
              .eq("id", recording.id);

            console.log(`Updated recording ${recording.id} captions to ready, track_id: ${trackId}`);
          } else {
            console.log(`No recording found for asset ${assetId} to update captions`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
