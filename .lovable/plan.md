
# Drop `advisor_chapters` Table

## Summary

Remove the `advisor_chapters` join table since the app only ever uses one chapter per advisor, which is already stored in `profiles.chapter_id`. This simplifies the schema by eliminating a redundant table.

---

## Changes Required

### 1. Database Migration

Create a new migration file that:
- Drops the `advisor_chapters` table
- Drops and recreates the `is_advisor_for_chapter()` function to check `profiles.chapter_id` instead of the join table

```sql
-- Drop the advisor_chapters table
DROP TABLE IF EXISTS public.advisor_chapters CASCADE;

-- Recreate is_advisor_for_chapter to use profiles.chapter_id
CREATE OR REPLACE FUNCTION public.is_advisor_for_chapter(p_user_id uuid, p_chapter_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id 
    AND chapter_id = p_chapter_id 
    AND role = 'advisor'
  );
$$;
```

The function is still needed because RLS policies on the `posts` table use it to allow advisors to moderate posts in their chapter.

---

### 2. Update `src/pages/MyChapter.tsx`

Replace the `advisor_chapters` query with a direct read from AuthContext:

**Current code (lines 34, 40-57):**
```typescript
const { user } = useAuth();
// ...
const { data: advisorChapters, error: advisorError } = await supabase
  .from('advisor_chapters')
  .select('chapter_id')
  .eq('user_id', user.id);
// ...
const chapterId = advisorChapters[0].chapter_id;
```

**New code:**
```typescript
const { user, profile } = useAuth();
// ...
const chapterId = profile?.chapter_id;
if (!chapterId) {
  setLoading(false);
  return;
}
// Continue with existing chapter details, members, and posts queries
```

This removes the extra Supabase query entirely.

---

### 3. Update `src/integrations/supabase/types.ts`

Remove the `advisor_chapters` table type definition (lines 17-45):
- Remove the `Row`, `Insert`, `Update` types
- Remove the `Relationships` array

The `is_advisor_for_chapter` function type stays since the function still exists.

---

### 4. Update `docs/DATA_DICTIONARY.md`

Remove the `lms_advisor_chapters` / `advisor_chapters` section from the documentation.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDDHHMMSS_drop_advisor_chapters.sql` | New migration to drop table and update function |
| `src/pages/MyChapter.tsx` | Use `profile.chapter_id` from AuthContext instead of querying `advisor_chapters` |
| `src/integrations/supabase/types.ts` | Remove `advisor_chapters` table type definition |
| `docs/DATA_DICTIONARY.md` | Remove advisor_chapters documentation |

---

## What Stays Unchanged

- `profiles.chapter_id` column
- `chapters` table
- `src/pages/Chapters.tsx` - does not reference `advisor_chapters` (already confirmed)
- `src/pages/Users.tsx` - assigns chapters via `profiles.chapter_id`
- `is_advisor_for_chapter()` function - still exists but now checks `profiles.chapter_id`
- RLS policies on `posts` table that use `is_advisor_for_chapter()`
