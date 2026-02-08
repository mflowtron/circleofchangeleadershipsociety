# Lovable Follow-Up Prompt: Drop advisor_chapters Table

> Paste everything below the divider into Lovable.

---

## PROMPT FOR LOVABLE

Drop the `advisor_chapters` table and update all code that references it. This is a development app with no real data.

### Why

The `advisor_chapters` join table was built for "one advisor manages multiple chapters," but the app only ever uses the first result (`advisorChapters[0].chapter_id` in `MyChapter.tsx`). Every user already has `profiles.chapter_id`. An advisor's chapter is simply their `profiles.chapter_id` where `profiles.role = 'advisor'`. The join table is unnecessary.

### Migration

Create a new Supabase migration file that drops the table and its helper function:
```sql
DROP TABLE IF EXISTS public.advisor_chapters CASCADE;
DROP FUNCTION IF EXISTS public.is_advisor_of_chapter CASCADE;
```

### Update `src/pages/MyChapter.tsx`

Replace the `advisor_chapters` query (lines 44-55) with a direct read of the current user's `profile.chapter_id` from AuthContext:

```ts
const chapterId = profile?.chapter_id;
if (!chapterId) {
  setLoading(false);
  return;
}
```

The page should:
1. Get `profile.chapter_id` from `useAuth()` — no extra Supabase query needed
2. If `profile.chapter_id` is null, show the "no chapter assigned" state
3. Otherwise, fetch chapter details, members, and posts using that chapter_id (the existing logic stays the same)

### Update `src/integrations/supabase/types.ts`

Remove the `advisor_chapters` table type definition entirely (the Row, Insert, Update types and the Relationships array).

### Update `src/pages/Chapters.tsx`

If this page references `advisor_chapters` for assigning advisors to chapters, replace those queries with updates to `profiles.chapter_id` on the advisor's profile row instead.

### What NOT to change

- `profiles.chapter_id` and the `chapters` table stay as-is
- `src/pages/Users.tsx` already assigns chapters via `profiles.chapter_id` — no changes needed there
- Everything else in the app stays the same
