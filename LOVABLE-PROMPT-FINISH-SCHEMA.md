# Lovable Follow-Up Prompt: Finish Schema Simplification

> Paste everything below the divider into Lovable.

---

## PROMPT FOR LOVABLE

The database schema simplification is nearly complete. I have two more tables to collapse (taking us from 22 to 20), plus a few small cleanup items. Please complete all of these:

---

### CHANGE A: Drop `advisor_chapters` Table

**Why**: The `advisor_chapters` join table was built for "one advisor manages multiple chapters," but the app only ever uses the first result (`advisorChapters[0].chapter_id` in `MyChapter.tsx`). Every user already has `profiles.chapter_id`. An advisor's chapter is simply their `profiles.chapter_id` where `profiles.role = 'advisor'`.

**Migration**: Create a new Supabase migration that:
```sql
DROP TABLE IF EXISTS public.advisor_chapters CASCADE;
DROP FUNCTION IF EXISTS public.is_advisor_of_chapter CASCADE;
```

**Update `src/pages/MyChapter.tsx`**: Replace the `advisor_chapters` query with a direct read of the current user's `profile.chapter_id` from AuthContext. The page should:
1. Get `profile.chapter_id` from `useAuth()` (already available — no extra query needed)
2. If `profile.chapter_id` is null, show the "no chapter assigned" state
3. Otherwise, fetch chapter details, members, and posts using that chapter_id (the existing logic after line 57 stays the same)

Delete lines 44-55 (the `advisor_chapters` query) and replace with:
```ts
const chapterId = profile?.chapter_id;
if (!chapterId) {
  setLoading(false);
  return;
}
```

**Update `src/pages/Users.tsx`**: The admin user management page assigns users to chapters via `profiles.chapter_id` already — no changes needed here.

**Update `src/integrations/supabase/types.ts`**: Remove the `advisor_chapters` table type definition entirely.

**Update `src/pages/Chapters.tsx`**: If this page has any references to `advisor_chapters` for assigning advisors to chapters, replace with updating `profiles.chapter_id` for the advisor's profile row instead.

---

### CHANGE B: Merge `lms_events` into `events`

**Why**: `lms_events` and `events` are both "events with a title, description, and date range." The only difference is `lms_events` has a `meeting_link` (for Zoom/Teams calls) and no ticketing. Having two event tables makes the future Xano migration harder and splits a single concept across two tables.

**Migration**: Create a migration (can be in the same file as Change A) that:

1. Add columns to `events`:
```sql
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'ticketed' CHECK (type IN ('ticketed', 'meeting'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_link text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
```

2. Drop the old table:
```sql
DROP TABLE IF EXISTS public.lms_events CASCADE;
```

3. Update RLS on `events` to allow users with LMS module access to SELECT meeting-type events:
```sql
-- Meeting events visible to LMS users
CREATE POLICY "Meeting events visible to LMS users" ON public.events
  FOR SELECT USING (
    type = 'meeting' AND is_active = true AND auth.uid() IS NOT NULL
  );
```

**Update `src/integrations/supabase/types.ts`**: Remove the `lms_events` table definition. Add `type`, `meeting_link`, and `is_active` fields to the `events` table type.

**Update `src/hooks/useLMSEvents.ts`** (or wherever LMS events are fetched): Query the `events` table filtered by `type = 'meeting'` instead of querying `lms_events`. Keep the same return shape.

**Update `src/pages/LMSEvents.tsx`** (or the LMS events page): Read from the updated hook. The UI stays the same — title, description, date, meeting link.

**Update admin event creation**: When creating an LMS meeting event, insert into `events` with `type: 'meeting'` and `meeting_link` set. When creating a ticketed event, insert with `type: 'ticketed'` (the default). The existing event management pages (`/events/manage/*`) should continue to only show `type = 'ticketed'` events.

**Update `src/hooks/useEvents.ts`**: Filter the event management queries to `type = 'ticketed'` so meeting events don't appear in the event management dashboard.

---

### CHANGE C: Add localStorage-based dismissed announcements

The old `dismissed_announcements` table was dropped, but the client-side replacement was never implemented. Update `src/hooks/useAnnouncements.ts` to:

- Add a `dismissAnnouncement(id: string)` function that saves dismissed IDs to `localStorage` under the key `dismissed_announcements` (as a JSON string array)
- On load, read `dismissed_announcements` from `localStorage` and filter them out of the active `announcements` list returned by the hook
- Return `dismissAnnouncement` from the hook so components can call it

Also update the component that displays announcements to include a dismiss/close button that calls `dismissAnnouncement(id)`.

The admin view (`allAnnouncements`) should NOT be filtered — only the active user-facing `announcements` list should respect dismissed state.

---

### CHANGE D: Remove stale comments

1. In `src/hooks/usePosts.ts`, remove the comment `// Build the base query - using new 'posts' table name (not lms_posts)` — the migration is done, referencing old names in comments adds noise.

2. In `src/hooks/useAttendees.ts`, remove the comment `// Updated interface to match new schema - no more order_id, ticket_type_id, is_purchaser columns` — same reason.

---

## WHAT NOT TO CHANGE

- Keep Stripe integration as-is
- Keep Mux video integration as-is
- Keep the overall page/route structure
- Keep all existing event management functionality for ticketed events
- Keep the public event pages and checkout flow
- The `chapters` table stays — it's still needed for chapter names/descriptions
- The `profiles.chapter_id` FK to `chapters` stays

---

## FINAL TABLE COUNT AFTER THESE CHANGES: 20

### Core & Auth (2 tables)
1. **profiles** — includes role, module_access, chapter_id
2. **chapters** — id, name, description

### LMS (4 tables)
3. **posts**
4. **post_interactions**
5. **recordings** (with resources jsonb)
6. **announcements**

### Events (6 tables) — now unified
7. **events** — includes type ('ticketed'|'meeting'), meeting_link, hotels jsonb, badge_template jsonb
8. **ticket_types**
9. **speakers**
10. **agenda_items** (with speaker_ids uuid[])
11. **orders**
12. **order_items**

### Attendees (4 tables)
13. **attendees**
14. **order_access_codes**
15. **attendee_bookmarks**
16. **attendee_checkins**

### Messaging (3 tables)
17. **conversations**
18. **conversation_participants**
19. **messages** (with reactions jsonb)

### Other (1 table)
20. **push_subscriptions**
