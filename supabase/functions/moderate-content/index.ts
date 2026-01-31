import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModerationRequest {
  postId: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string; // Mux playback ID
}

interface ThumbnailResult {
  time: string;
  safe: boolean;
  score: number;
  categories: string[];
}

interface ModerationResponse {
  status: "approved" | "flagged" | "auto_flagged";
  score: number;
  reasons: string[];
  imageAnalysis?: { safe: boolean; categories: string[] };
  videoThumbnailAnalysis?: {
    safe: boolean;
    categories: string[];
    thumbnailResults: ThumbnailResult[];
    worstScore: number;
  };
}

const SYSTEM_PROMPT = `You are a content moderator for a professional leadership community called "Circle of Change Leadership Society". This community is focused on professional development, leadership skills, career advancement, and networking among professionals.

Analyze the provided content and determine if it's appropriate for this professional community.

FLAG content that contains:
- Profanity or vulgar language (even mild profanity)
- Discriminatory or hateful speech (racism, sexism, homophobia, etc.)
- Sexual or suggestive content
- Violence or threats
- Spam or irrelevant promotional content
- Personal attacks or harassment
- Content completely unrelated to professional topics
- Illegal activities or drug references

APPROVE content that is:
- Professional discussions about leadership, business, careers
- Networking and collaboration posts
- Industry news and insights
- Motivational and inspirational content (appropriate for workplace)
- Event announcements and community updates
- Questions about professional development

Respond with a JSON object (no markdown code blocks) containing:
{
  "safe": boolean,
  "score": number (0-1, where 1 is definitely inappropriate),
  "categories": string[] (list of violated categories if any, e.g., ["profanity", "off_topic", "spam", "harassment", "hate_speech", "sexual_content", "violence"])
}`;

const IMAGE_PROMPT = `Analyze this image for content appropriateness in a professional leadership community. Check for:
- NSFW or sexual content
- Violence or graphic content
- Hate symbols or discriminatory imagery
- Spam or promotional overlays
- Inappropriate memes

Respond with a JSON object (no markdown code blocks):
{
  "safe": boolean,
  "score": number (0-1, where 1 is definitely inappropriate),
  "categories": string[] (list of issues found, e.g., ["nsfw", "violence", "hate_symbol", "spam"])
}`;

async function analyzeText(
  content: string,
  apiKey: string
): Promise<{ safe: boolean; score: number; categories: string[] }> {
  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this post content:\n\n${content}` },
        ],
      }),
    }
  );

  if (!response.ok) {
    console.error("AI text analysis failed:", response.status);
    return { safe: true, score: 0, categories: [] };
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || "";

  try {
    // Clean response - remove any markdown code blocks
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleanedResponse);
  } catch {
    console.error("Failed to parse text analysis response:", responseText);
    return { safe: true, score: 0, categories: [] };
  }
}

async function analyzeImage(
  imageUrl: string,
  apiKey: string
): Promise<{ safe: boolean; score: number; categories: string[] }> {
  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: IMAGE_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    console.error("AI image analysis failed:", response.status);
    return { safe: true, score: 0, categories: [] };
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || "";

  try {
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleanedResponse);
  } catch {
    console.error("Failed to parse image analysis response:", responseText);
    return { safe: true, score: 0, categories: [] };
  }
}

async function analyzeVideoThumbnails(
  playbackId: string,
  apiKey: string
): Promise<{
  safe: boolean;
  categories: string[];
  thumbnailResults: ThumbnailResult[];
  worstScore: number;
}> {
  // Extract thumbnails at different points in the video
  const timePoints = [
    { time: "0", label: "start" },
    { time: "25%", label: "25%" },
    { time: "50%", label: "50%" },
    { time: "75%", label: "75%" },
    { time: "-1", label: "end" },
  ];

  const thumbnailResults: ThumbnailResult[] = [];
  let worstScore = 0;
  const allCategories = new Set<string>();

  // Analyze thumbnails in parallel
  const analyses = await Promise.all(
    timePoints.map(async ({ time, label }) => {
      const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.png?time=${time}`;
      const result = await analyzeImage(thumbnailUrl, apiKey);
      return { time: label, ...result };
    })
  );

  for (const analysis of analyses) {
    thumbnailResults.push({
      time: analysis.time,
      safe: analysis.safe,
      score: analysis.score,
      categories: analysis.categories,
    });

    if (analysis.score > worstScore) {
      worstScore = analysis.score;
    }

    analysis.categories.forEach((cat) => allCategories.add(cat));
  }

  return {
    safe: worstScore < 0.5,
    categories: Array.from(allCategories),
    thumbnailResults,
    worstScore,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { postId, content, imageUrl, videoUrl }: ModerationRequest =
      await req.json();

    console.log(`Moderating post ${postId}`, {
      hasContent: !!content,
      hasImage: !!imageUrl,
      hasVideo: !!videoUrl,
    });

    // Analyze text content
    const textAnalysis = await analyzeText(content, LOVABLE_API_KEY);
    console.log("Text analysis:", textAnalysis);

    // Analyze image if present
    let imageAnalysis: { safe: boolean; categories: string[] } | undefined;
    if (imageUrl) {
      const imgResult = await analyzeImage(imageUrl, LOVABLE_API_KEY);
      imageAnalysis = { safe: imgResult.safe, categories: imgResult.categories };
      console.log("Image analysis:", imageAnalysis);
    }

    // Analyze video thumbnails if present
    let videoThumbnailAnalysis:
      | {
          safe: boolean;
          categories: string[];
          thumbnailResults: ThumbnailResult[];
          worstScore: number;
        }
      | undefined;
    if (videoUrl) {
      videoThumbnailAnalysis = await analyzeVideoThumbnails(
        videoUrl,
        LOVABLE_API_KEY
      );
      console.log("Video analysis:", videoThumbnailAnalysis);
    }

    // Calculate overall moderation verdict
    const allReasons = new Set<string>(textAnalysis.categories);
    if (imageAnalysis) {
      imageAnalysis.categories.forEach((c) => allReasons.add(c));
    }
    if (videoThumbnailAnalysis) {
      videoThumbnailAnalysis.categories.forEach((c) => allReasons.add(c));
    }

    // Determine worst score across all analyses
    let overallScore = textAnalysis.score;
    if (imageAnalysis && !imageAnalysis.safe) {
      // Image flagged - use higher of text or inferred image score
      const imgScore = imageAnalysis.categories.length > 0 ? 0.8 : 0;
      overallScore = Math.max(overallScore, imgScore);
    }
    if (videoThumbnailAnalysis) {
      overallScore = Math.max(overallScore, videoThumbnailAnalysis.worstScore);
    }

    // Determine status based on score thresholds
    let status: "approved" | "flagged" | "auto_flagged";
    if (overallScore >= 0.8) {
      status = "auto_flagged";
    } else if (overallScore >= 0.5) {
      status = "flagged";
    } else {
      status = "approved";
    }

    // Update post with moderation results
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        moderation_status: status,
        moderation_score: overallScore,
        moderation_reasons: Array.from(allReasons),
        moderated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (updateError) {
      console.error("Failed to update post moderation status:", updateError);
    }

    const response: ModerationResponse = {
      status,
      score: overallScore,
      reasons: Array.from(allReasons),
      imageAnalysis,
      videoThumbnailAnalysis,
    };

    console.log("Moderation complete:", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
