

# Plan: Add Mux Auto-Generated Captions with Interactive Transcript

## Overview

This plan adds the ability for admins to generate captions for recordings using Mux's built-in captioning feature, and provides users with an interactive transcript tab where they can:
- View the full transcript with timestamps
- Click on any word/phrase to seek the video to that position
- See the currently playing section highlighted in real-time

## How It Works

Mux uses OpenAI's Whisper model to automatically transcribe video content. Once captions are generated:
1. The captions become available as a text track on the video (enabling CC in the player)
2. The transcript can be downloaded as VTT or plain text format
3. The VTT file contains timed cues that we'll parse to create the clickable transcript

---

## Implementation Steps

### Step 1: Database Schema Update

Add columns to track caption status on recordings:

```sql
ALTER TABLE recordings ADD COLUMN captions_status text DEFAULT null;
ALTER TABLE recordings ADD COLUMN captions_track_id text DEFAULT null;
```

**Possible values for `captions_status`:**
- `null` - No captions requested
- `generating` - Caption generation in progress  
- `ready` - Captions are available
- `error` - Generation failed

---

### Step 2: Update Edge Function for Caption Generation

Extend `mux-upload` edge function with a new `generate-captions` action:

**New action flow:**
1. Admin requests caption generation for a recording
2. Edge function calls Mux API: `POST /video/v1/assets/{ASSET_ID}/tracks/{AUDIO_TRACK_ID}/generate-subtitles`
3. Recording's `captions_status` is set to `generating`

**API call structure:**
```text
POST https://api.mux.com/video/v1/assets/{ASSET_ID}/tracks/{AUDIO_TRACK_ID}/generate-subtitles
Body: { "generated_subtitles": [{ "language_code": "en", "name": "English" }] }
```

Also add a `get-asset-tracks` action to retrieve the audio track ID and check caption status.

---

### Step 3: Update Webhook Handler

Extend `mux-webhook` to handle the `video.asset.track.ready` event:

- When a track with `text_source: "generated_vod"` becomes ready
- Update the recording's `captions_status` to `ready`
- Store the `track_id` for transcript retrieval

---

### Step 4: Create Transcript Fetching Hook

Create `src/hooks/useTranscript.ts`:

**Functionality:**
- Fetch the VTT file from: `https://stream.mux.com/{PLAYBACK_ID}/text/{TRACK_ID}.vtt`
- Parse VTT format into structured cue objects with start/end times and text
- Provide the parsed cues to the UI

**VTT parsing logic:**
```text
VTT Format:
WEBVTT

00:00:01.000 --> 00:00:04.500
Hello and welcome to this lecture.

Parsed to:
{ startTime: 1.0, endTime: 4.5, text: "Hello and welcome to this lecture." }
```

---

### Step 5: Create Interactive Transcript Component

Create `src/components/recordings/TranscriptViewer.tsx`:

**Features:**
- Display all transcript cues in a scrollable list
- Show timestamp for each cue (formatted as MM:SS)
- Highlight the currently active cue based on video playback time
- On click, seek the player to that cue's start time
- Auto-scroll to keep the active cue visible

**Component structure:**
```text
┌─────────────────────────────────────────┐
│ 📝 Transcript                           │
├─────────────────────────────────────────┤
│ [0:00] Hello and welcome to this...     │
│ [0:04] Today we'll be discussing...     │
│ [0:08] ▶ First, let's look at...  ◀ ACTIVE │
│ [0:12] The key concept here is...       │
│ [0:16] As you can see in the...         │
└─────────────────────────────────────────┘
```

---

### Step 6: Update Recording Player View

Modify `src/components/recordings/RecordingPlayerView.tsx`:

**Changes:**
1. Add a ref to the MuxPlayer to control playback (`playerRef`)
2. Track current playback time state
3. Add a tabbed interface below the player:
   - **Details** tab: Current recording details and description
   - **Transcript** tab: Interactive transcript viewer
   - **Resources** tab: Existing resources section

**For admins:** Add a "Generate Captions" button that:
- Shows when `captions_status` is null or error
- Shows loading state when `captions_status` is "generating"
- Is hidden when captions are ready

---

### Step 7: Player Time Synchronization

The MuxPlayer exposes the underlying media element. We'll:

1. Access the player ref: `playerRef.current.media.nativeEl`
2. Listen to `timeupdate` events to track current time
3. Use `nativeEl.currentTime = seconds` to seek when clicking transcript

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `recordings` table | Migration | Add `captions_status` and `captions_track_id` columns |
| `supabase/functions/mux-upload/index.ts` | Modify | Add `generate-captions` and `get-asset-tracks` actions |
| `supabase/functions/mux-webhook/index.ts` | Modify | Handle `video.asset.track.ready` for captions |
| `src/hooks/useTranscript.ts` | New | Fetch and parse VTT transcript |
| `src/components/recordings/TranscriptViewer.tsx` | New | Interactive clickable transcript component |
| `src/components/recordings/RecordingPlayerView.tsx` | Modify | Add tabs, player ref, time tracking, caption generation button |
| `src/components/recordings/RecordingCard.tsx` | Modify | Update Recording interface to include caption fields |

---

## Technical Details

### VTT Parser Implementation

```typescript
interface TranscriptCue {
  startTime: number;  // seconds
  endTime: number;    // seconds  
  text: string;
}

function parseVTT(vttContent: string): TranscriptCue[] {
  // Split by double newlines to get cue blocks
  // Parse timestamp format: HH:MM:SS.mmm --> HH:MM:SS.mmm
  // Extract text content
  // Return array of cues
}
```

### Seeking Implementation

```typescript
const handleCueClick = (cue: TranscriptCue) => {
  const player = playerRef.current;
  if (player?.media?.nativeEl) {
    player.media.nativeEl.currentTime = cue.startTime;
    player.media.nativeEl.play();
  }
};
```

### Active Cue Detection

```typescript
const activeCue = cues.find(
  cue => currentTime >= cue.startTime && currentTime < cue.endTime
);
```

---

## User Experience

**For Admins:**
1. Navigate to a recording in player view
2. Click "Generate Captions" button
3. See loading indicator while Mux processes (typically ~6 seconds per minute of video)
4. Once ready, the Transcript tab shows the full transcript

**For All Users:**
1. Open a recording that has captions
2. Video player now shows CC button for closed captions
3. Click "Transcript" tab to see full transcript
4. Click any line to jump to that point in the video
5. Currently playing section is highlighted and auto-scrolls

---

## Cost & Performance Notes

- Mux auto-captioning is included in standard encoding costs (no extra charge)
- Transcript fetched once and cached in component state
- VTT files are typically small (few KB even for hour-long videos)
- Caption generation takes approximately 0.1x video duration (1 hour video = ~6 min)

