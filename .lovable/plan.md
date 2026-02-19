

# Track Recording Watch Progress & Pass User Data to Mux

## Overview

Add two capabilities to the session recordings player:
1. **Resume playback** -- save the user's last watched position per recording and restore it when they return
2. **Mux Data tracking** -- pass the user's email and name to Mux's analytics metadata so viewing behavior is trackable in the Mux dashboard

## Changes

### 1. New database table: `recording_watch_progress`

Create a table to store each user's playback position per recording.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| user_id | uuid | NOT NULL, references the viewer |
| recording_id | uuid | NOT NULL, references `recordings.id` |
| position_seconds | float | Last watched time in seconds |
| duration_seconds | float | Total video duration (for calculating % progress) |
| updated_at | timestamptz | Auto-updated on each save |
| created_at | timestamptz | Auto-set |

- Add a **unique constraint** on `(user_id, recording_id)` so we upsert cleanly
- **RLS policies**:
  - Users can SELECT/INSERT/UPDATE their own rows (`user_id = auth.uid()`)
  - Admins can SELECT all rows (for analytics)

### 2. New hook: `src/hooks/useWatchProgress.ts`

A custom hook that:
- On mount, fetches the saved position for the current user + recording
- Exposes `startPosition` (number of seconds to seek to on load)
- Exposes a `saveProgress(positionSeconds, durationSeconds)` function that upserts to the database
- Debounces/throttles saves to avoid hammering the database (save every ~5 seconds of playback, and on pause/unmount)

### 3. Update `src/components/recordings/RecordingPlayerView.tsx`

**Pass user metadata to MuxPlayer** (line 246-255):
- Import `useAuth` to get `user.email` and `profile.full_name`
- Add `metadata` fields that Mux Data recognizes:
  - `viewer_user_id` -- the user's auth ID
  - `video_title` -- already present
  - Plus custom metadata keys for email tracking

**Mux Player `metadata` prop** (Mux Data standard fields):
```tsx
metadata={{
  video_title: recording.title,
  video_id: recording.id,
  viewer_user_id: user?.id,
  // Mux Data custom dimensions for email tracking
  custom_1: user?.email,
  custom_2: profile?.full_name,
}}
```

**Resume playback**:
- Call `useWatchProgress(recording.id)` to get `startPosition`
- Set `startTime` on MuxPlayer to seek to the saved position on load
- On `timeupdate` events (already handled), periodically call `saveProgress()` -- throttled to every 5 seconds
- On component unmount and on pause, save final position

**Save triggers**:
- Every 5 seconds during playback (throttled in the timeupdate handler)
- On video pause event
- On component unmount (cleanup effect)

### 4. Optional: Show progress indicator on `RecordingCard.tsx`

Add a subtle progress bar at the bottom of each recording card thumbnail showing how much the user has watched. This requires:
- Fetching all watch progress records for the current user in the Recordings page
- Passing progress percentage to each `RecordingCard`
- Rendering a thin gold bar at the bottom of the thumbnail

## Technical Details

**Throttled save logic** (inside `RecordingPlayerView`):
```tsx
const lastSaveRef = useRef(0);
const SAVE_INTERVAL = 5; // seconds

// Inside timeupdate handler:
const now = currentTime;
if (now - lastSaveRef.current >= SAVE_INTERVAL) {
  lastSaveRef.current = now;
  saveProgress(now, duration);
}
```

**Upsert query** (inside the hook):
```tsx
await supabase
  .from('recording_watch_progress')
  .upsert({
    user_id: userId,
    recording_id: recordingId,
    position_seconds: position,
    duration_seconds: duration,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,recording_id' });
```

**MuxPlayer startTime**:
```tsx
<MuxPlayer
  startTime={startPosition}
  ...
/>
```

## Files Summary

| File | Action |
|------|--------|
| Database migration | CREATE TABLE `recording_watch_progress` with RLS |
| `src/hooks/useWatchProgress.ts` | New hook for fetching/saving progress |
| `src/components/recordings/RecordingPlayerView.tsx` | Add Mux metadata, resume playback, throttled saves |
| `src/components/recordings/RecordingCard.tsx` | Add optional progress bar overlay |
| `src/pages/Recordings.tsx` | Fetch user's watch progress for all recordings, pass to cards |

