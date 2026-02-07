
# Rename LMS-Exclusive Tables with `lms_` Prefix

## Overview

Rename database tables that are exclusively used by the Society LMS system to have an `lms_` prefix for clearer organization and to distinguish them from the Event Management system.

## Tables to Rename

| Current Name | New Name | Description |
|--------------|----------|-------------|
| `recordings` | `lms_recordings` | Lecture video recordings |
| `recording_resources` | `lms_recording_resources` | Downloadable files for recordings |
| `posts` | `lms_posts` | Social feed posts |
| `comments` | `lms_comments` | Comments on posts |
| `likes` | `lms_likes` | Post likes |
| `announcements` | `lms_announcements` | System announcements |

**Note:** `lms_events` already has the correct prefix.

## Tables NOT Being Renamed

These tables are shared infrastructure or belong to the Event Management system:

- **User/Auth:** `profiles`, `user_roles`, `chapters`, `advisor_chapters`
- **Events:** `events`, `ticket_types`, `speakers`, `agenda_items`, `agenda_item_speakers`, `event_hotels`, `badge_templates`
- **Registration:** `orders`, `order_items`, `attendees`, `order_access_codes`, `order_messages`, `attendee_checkins`
- **Attendee App:** `attendee_conversations`, `attendee_messages`, `conversation_participants`, `attendee_profiles`, `attendee_bookmarks`, `message_reactions`
- **System:** `activity_logs`, `push_subscriptions`

---

## Implementation Plan

### Phase 1: Database Migration

Create a migration that:
1. Renames each table using `ALTER TABLE ... RENAME TO ...`
2. Updates all RLS policy names to reflect the new table names
3. Updates any triggers that reference the old table names

```sql
-- Example for recordings
ALTER TABLE recordings RENAME TO lms_recordings;
ALTER TABLE recording_resources RENAME TO lms_recording_resources;
ALTER TABLE posts RENAME TO lms_posts;
ALTER TABLE comments RENAME TO lms_comments;
ALTER TABLE likes RENAME TO lms_likes;
ALTER TABLE announcements RENAME TO lms_announcements;
```

### Phase 2: Update Frontend Code

Update all Supabase queries to use the new table names:

| File | Tables Referenced |
|------|-------------------|
| `src/pages/Recordings.tsx` | `recordings` -> `lms_recordings` |
| `src/hooks/useRecordingResources.ts` | `recording_resources` -> `lms_recording_resources` |
| `src/hooks/usePosts.ts` | `posts` -> `lms_posts`, `likes` -> `lms_likes`, `comments` -> `lms_comments` |
| `src/hooks/useUserPosts.ts` | `posts` -> `lms_posts`, `likes` -> `lms_likes`, `comments` -> `lms_comments` |
| `src/hooks/useModerationPosts.ts` | `posts` -> `lms_posts` |
| `src/hooks/useComments.ts` | `comments` -> `lms_comments` |
| `src/hooks/useAnnouncements.ts` | `announcements` -> `lms_announcements` |
| `src/hooks/useAdminStats.ts` | `posts` -> `lms_posts` |
| `src/pages/MyChapter.tsx` | `posts` -> `lms_posts` |

### Phase 3: Update Edge Functions

Check and update any edge functions that reference these tables:
- `mux-upload` - references `recordings`
- `mux-webhook` - references `recordings`
- `moderate-content` - may reference `posts`

### Phase 4: Update Documentation

Update `docs/DATA_DICTIONARY.md` to reflect the new table names.

---

## Files to Modify

| Category | Files |
|----------|-------|
| **Database** | New migration for table renames |
| **Recordings** | `src/pages/Recordings.tsx`, `src/hooks/useRecordingResources.ts` |
| **Posts/Feed** | `src/hooks/usePosts.ts`, `src/hooks/useUserPosts.ts`, `src/hooks/useModerationPosts.ts`, `src/pages/MyChapter.tsx` |
| **Comments** | `src/hooks/useComments.ts` |
| **Announcements** | `src/hooks/useAnnouncements.ts` |
| **Admin** | `src/hooks/useAdminStats.ts` |
| **Edge Functions** | `supabase/functions/mux-upload/index.ts`, `supabase/functions/mux-webhook/index.ts`, `supabase/functions/moderate-content/index.ts` |
| **Documentation** | `docs/DATA_DICTIONARY.md` |

---

## Technical Considerations

1. **Foreign Keys**: The rename operation preserves foreign key relationships automatically in PostgreSQL
2. **Triggers**: Existing triggers will continue to work as they're bound to the table, not the name
3. **RLS Policies**: Will be renamed along with the table automatically
4. **Indexes**: Will be preserved during the rename
5. **Type System**: After migration, the `types.ts` file will be regenerated automatically with the new table names

---

## Risk Mitigation

- Run migration during low-traffic period
- Deploy code changes immediately after migration runs
- The migration and code updates must be deployed together to avoid query failures
