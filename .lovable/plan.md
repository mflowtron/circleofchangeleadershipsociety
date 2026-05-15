## Goal
Drop the 4 unused storage buckets that remain from the event/attendee era.

## Buckets to remove
- `event-images`
- `badge-templates`
- `speaker-images`
- `chat-attachments`

## Code impact
A repo-wide grep for all four bucket names returned zero matches — no frontend hook, edge function, or doc references them. Nothing in `src/` or `supabase/functions/` depends on them, so no code changes are needed.

## Migration
A single SQL migration that:
1. Deletes any leftover objects in each bucket (`DELETE FROM storage.objects WHERE bucket_id IN (...)`).
2. Drops the buckets (`DELETE FROM storage.buckets WHERE id IN (...)`).

Remaining buckets after this change: `avatars`, `post-images`, `recording-resources`, `album-photos` — matching the Society/LMS scope in memory.

## Verification
- Confirm migration runs cleanly.
- Build still succeeds (no bucket references to break).
- Spot-check Album upload + avatar upload still work.