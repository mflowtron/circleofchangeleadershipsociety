import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID");
    const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error("Missing Mux API credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch posts with video but no aspect ratio
    const { data: posts, error: fetchError } = await supabase
      .from("posts")
      .select("id, video_url")
      .not("video_url", "is", null)
      .is("video_aspect_ratio", null);

    if (fetchError) {
      throw fetchError;
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No posts need backfilling", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${posts.length} posts to backfill`);

    const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);
    let updatedCount = 0;
    const errors: string[] = [];

    for (const post of posts) {
      try {
        // Mux playback ID is stored in video_url
        const playbackId = post.video_url;
        
        // Get asset by playback ID - we need to list assets and find the one with this playback ID
        // First, get the asset ID from playback ID
        const assetResponse = await fetch(
          `https://api.mux.com/video/v1/playback-ids/${playbackId}`,
          {
            headers: {
              Authorization: `Basic ${muxAuth}`,
            },
          }
        );

        if (!assetResponse.ok) {
          console.error(`Failed to fetch playback ID ${playbackId}: ${assetResponse.status}`);
          errors.push(`Post ${post.id}: Playback ID lookup failed`);
          continue;
        }

        const playbackData = await assetResponse.json();
        const assetId = playbackData.data?.object?.id;

        if (!assetId) {
          console.error(`No asset ID found for playback ID ${playbackId}`);
          errors.push(`Post ${post.id}: No asset ID found`);
          continue;
        }

        // Now fetch the asset to get aspect ratio
        const assetDetailResponse = await fetch(
          `https://api.mux.com/video/v1/assets/${assetId}`,
          {
            headers: {
              Authorization: `Basic ${muxAuth}`,
            },
          }
        );

        if (!assetDetailResponse.ok) {
          console.error(`Failed to fetch asset ${assetId}: ${assetDetailResponse.status}`);
          errors.push(`Post ${post.id}: Asset lookup failed`);
          continue;
        }

        const assetData = await assetDetailResponse.json();
        const aspectRatio = assetData.data?.aspect_ratio;

        if (aspectRatio) {
          const { error: updateError } = await supabase
            .from("posts")
            .update({ video_aspect_ratio: aspectRatio })
            .eq("id", post.id);

          if (updateError) {
            console.error(`Failed to update post ${post.id}:`, updateError);
            errors.push(`Post ${post.id}: Database update failed`);
          } else {
            console.log(`Updated post ${post.id} with aspect ratio ${aspectRatio}`);
            updatedCount++;
          }
        } else {
          console.log(`No aspect ratio found for asset ${assetId}`);
          errors.push(`Post ${post.id}: No aspect ratio in asset data`);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing post ${post.id}:`, err);
        errors.push(`Post ${post.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Backfill complete`,
        total: posts.length,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
