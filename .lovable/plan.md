

# Rename Chapter Tables with `lms_` Prefix

## Overview

Rename the `chapters` and `advisor_chapters` tables to use the `lms_` prefix, consistent with other LMS-exclusive tables.

## Tables to Rename

| Current Name | New Name | Description |
|--------------|----------|-------------|
| `chapters` | `lms_chapters` | Organizational chapters for grouping LMS users |
| `advisor_chapters` | `lms_advisor_chapters` | Links advisors to their assigned chapters |

---

## Files to Modify

### Database
- Create migration to rename both tables

### Frontend Code

| File | Changes |
|------|---------|
| `src/pages/Chapters.tsx` | 4 references: `chapters` -> `lms_chapters` |
| `src/pages/MyChapter.tsx` | 2 references: `chapters` -> `lms_chapters`, `advisor_chapters` -> `lms_advisor_chapters` |
| `src/pages/Users.tsx` | 1 reference: `chapters` -> `lms_chapters` |
| `src/hooks/useModerationPosts.ts` | 1 reference: `chapters` -> `lms_chapters` |

### Documentation
- `docs/DATA_DICTIONARY.md` - Update table names and references

---

## Technical Details

### Migration SQL

```sql
-- Rename chapter tables to use lms_ prefix
ALTER TABLE chapters RENAME TO lms_chapters;
ALTER TABLE advisor_chapters RENAME TO lms_advisor_chapters;
```

### Code Updates

**Chapters.tsx** (4 updates):
```typescript
// All .from('chapters') calls become .from('lms_chapters')
.from('lms_chapters')
```

**MyChapter.tsx** (2 updates):
```typescript
.from('lms_advisor_chapters')  // was 'advisor_chapters'
.from('lms_chapters')          // was 'chapters'
```

**Users.tsx** (1 update):
```typescript
.from('lms_chapters')  // was 'chapters'
```

**useModerationPosts.ts** (1 update):
```typescript
supabase.from('lms_chapters').select('id, name')  // was 'chapters'
```

---

## Notes

- Foreign key from `profiles.chapter_id` to `lms_chapters.id` will be preserved automatically
- RLS policies will be renamed along with the tables
- No edge functions reference these tables
- No event management code references these tables (confirmed via search)

