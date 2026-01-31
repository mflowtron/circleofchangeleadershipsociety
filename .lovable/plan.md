# Enhanced Content Moderation System

## Overview

Transform the moderation page into an intelligent, AI-powered content moderation platform that:
1. Displays ALL posts regardless of visibility settings
2. Uses AI to detect potentially inappropriate content for a professional community
3. Provides filtering between flagged and all content
4. Scans uploaded images and videos for questionable material

---

## Architecture

```text
+------------------+     +----------------------+     +------------------+
|   Moderation     |     |   moderate-content   |     |   Lovable AI     |
|   Page UI        | --> |   Edge Function      | --> |   (Gemini)       |
+------------------+     +----------------------+     +------------------+
        |                         |                          |
        v                         v                          v
+------------------+     +----------------------+     +------------------+
| Filter Tabs:     |     | - Text Analysis      |     | Image/Text       |
| - All Posts      |     | - Image Moderation   |     | Analysis         |
| - Flagged        |     | - Video Multi-Frame  |     +------------------+
| - Auto-Flagged   |     |   Analysis           |
+------------------+     +----------------------+
```

---

## Implementation Plan

### 1. Database Schema Updates

Add moderation tracking columns to the `posts` table:

| Column | Type | Purpose |
|--------|------|---------|
| `moderation_status` | enum | 'pending', 'approved', 'flagged', 'auto_flagged' |
| `moderation_score` | float | AI confidence score (0-1) |
| `moderation_reasons` | text[] | Array of flagged categories |
| `moderated_at` | timestamp | When last moderated |
| `moderated_by` | uuid | Admin who reviewed (null for auto) |

### 2. New Edge Function: `moderate-content`

Creates a backend function that:
- Receives post content (text, image URL, video URL)
- Calls Lovable AI (Gemini 2.5 Flash) for content analysis
- Returns moderation verdict and reasons

**Content Analysis Categories:**
- Profanity and vulgar language
- Discriminatory or hateful speech
- Sexual or suggestive content
- Violence or threats
- Spam or promotional content
- Off-topic non-professional content
- Personal attacks or harassment

### 3. Automatic Flagging Criteria

Content is **auto-flagged** (moderation_status = 'auto_flagged') when:

| Trigger | Threshold |
|---------|-----------|
| AI confidence score | >= 0.8 (80% likely inappropriate) |
| Explicit profanity detected | Any match from blocklist |
| NSFW image classification | >= 0.7 confidence |
| Hate speech indicators | >= 0.75 confidence |

Content is **flagged for review** (moderation_status = 'flagged') when:
- AI confidence score is 0.5-0.8 (needs human review)
- Contains external links (potential spam)
- First post from a new user

### 4. Image and Video Scanning Process

**Image Scanning:**
- Uses Lovable AI's multimodal capability (Gemini 2.5 Flash)
- Sends image URL to AI for visual content analysis
- Checks for: nudity, violence, inappropriate symbols, spam text overlay

**Video Scanning (Multi-Thumbnail Analysis):**
- Videos use Mux for hosting (already integrated)
- Extract multiple thumbnails at different points in the video using Mux's thumbnail API with the `time` parameter:
  - `https://image.mux.com/{playback_id}/thumbnail.png?time=0` (start of video)
  - `https://image.mux.com/{playback_id}/thumbnail.png?time=25%` (25% through)
  - `https://image.mux.com/{playback_id}/thumbnail.png?time=50%` (midpoint)
  - `https://image.mux.com/{playback_id}/thumbnail.png?time=75%` (75% through)
  - `https://image.mux.com/{playback_id}/thumbnail.png?time=-1` (near end of video)
- Analyze ALL extracted thumbnails using the same image scanning pipeline
- Each thumbnail is individually scored; the **highest severity score** across all thumbnails determines the final video moderation verdict
- If ANY single thumbnail is flagged, the entire video is flagged
- The moderation reasons from all thumbnails are merged into a combined set
- This multi-frame approach catches inappropriate content that may appear at any point in the video, not just at the default thumbnail position

### 5. Updated Moderation Page UI

**New Features:**
- Tab navigation: "All Posts" | "Needs Review" | "Auto-Flagged"
- Post cards show:
  - Moderation status badge (color-coded)
  - AI confidence score
  - Flagged reasons as tags
  - Image/video preview with media indicator
- Action buttons: "Approve", "Delete", "Re-scan"
- Stats summary: Total posts, flagged count, auto-flagged count

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add moderation columns to posts table |
| `supabase/functions/moderate-content/index.ts` | Create | AI content moderation edge function |
| `src/hooks/useModerationPosts.ts` | Create | Fetch and manage moderated posts |
| `src/components/moderation/ModerationPostCard.tsx` | Create | Enhanced post card with moderation info |
| `src/components/moderation/ModerationFilters.tsx` | Create | Tab navigation and stats |
| `src/pages/Moderation.tsx` | Update | Integrate new components |
| `supabase/config.toml` | Update | Add moderate-content function |

---

## Technical Details

### Edge Function: `moderate-content`

```text
POST /functions/v1/moderate-content
Body: {
  postId: string,
  content: string,
  imageUrl?: string,
  videoUrl?: string  // Mux playback ID
}

Response: {
  status: 'approved' | 'flagged' | 'auto_flagged',
  score: number,  // 0-1 confidence
  reasons: string[],  // e.g., ['profanity', 'off_topic']
  imageAnalysis?: { safe: boolean, categories: string[] },
  videoThumbnailAnalysis?: {
    safe: boolean,
    categories: string[],
    thumbnailResults: [
      { time: string, safe: boolean, score: number, categories: string[] }
    ],
    worstScore: number  // highest severity score across all thumbnails
  }
}
```

### AI Prompt Strategy

The moderation prompt will be structured to:
1. Analyze text for professional appropriateness
2. Check for policy violations
3. Return structured JSON with categories and confidence

Example system prompt:
```
You are a content moderator for a professional leadership community.
Analyze the following content and determine if it's appropriate.
This community is for professional development, leadership topics, 
and career advancement discussions.

Flag content that contains:
- Profanity or vulgar language
- Discriminatory or hateful speech
- Sexual or suggestive material
- Violence or threats
- Spam or irrelevant promotional content
- Personal attacks
- Content unrelated to professional topics
```

### Image Analysis

For images, Lovable AI (Gemini) can process image URLs directly:
- Pass image URL in the message content
- AI returns visual content classification
- Categories: safe, suggestive, violent, spam, inappropriate

---

## Security Considerations

- Edge function validates admin role before allowing moderation actions
- All moderation decisions logged in activity_logs for audit trail
- AI analysis happens server-side only (no client exposure)
- Rate limiting on moderation scans to prevent abuse

---

## User Experience Flow

1. **Post Creation**: When a post is created, trigger background moderation scan
2. **Immediate Display**: Post appears in feed while scan runs (async)
3. **Auto-Flag**: If auto-flagged, post is hidden from feed until review
4. **Admin Dashboard**: Admins see flagged posts with one-click actions
5. **Audit Trail**: All moderation actions logged

---

## Dependencies

- **Existing**: Lovable AI (LOVABLE_API_KEY already configured)
- **No new packages required**
- **Uses**: Gemini 2.5 Flash (multimodal for text + images)