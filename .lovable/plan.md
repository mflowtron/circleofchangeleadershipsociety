

# Database Schema Simplification Plan

## Overview

This plan consolidates 31+ tables into 22 tables, simplifies the role system from 12 values to 4, and reduces complexity across the entire codebase. Since this is a development environment with no real user data, we can perform breaking changes safely.

---

## Scope Analysis

### Tables to Drop (13 tables)
| Table | Replacement |
|-------|-------------|
| `user_roles` | `profiles.role` column |
| `attendee_profiles` | Merge into `profiles` |
| `lms_comments` | `post_interactions` |
| `lms_likes` | `post_interactions` |
| `agenda_item_speakers` | `agenda_items.speaker_ids[]` |
| `event_hotels` | `events.hotels` JSONB |
| `badge_templates` | `events.badge_template` JSONB |
| `lms_recording_resources` | `recordings.resources` JSONB |
| `message_reactions` | `messages.reactions` JSONB |
| `order_messages` | Removed (use email) |
| `attendee_conversations` | Renamed to `conversations` |
| `attendee_messages` | Renamed to `messages` |
| `lms_advisor_chapters` | Renamed to `advisor_chapters` |

### Tables with Schema Changes
| Table | Changes |
|-------|---------|
| `profiles` | Add `role`, `module_access[]`, `bio`, `company`, `title`, `open_to_networking` |
| `attendees` | Remove `order_id`, `ticket_type_id`; add `is_speaker`; make `order_item_id` nullable |
| `order_items` | Remove `attendee_name`, `attendee_email` |
| `agenda_items` | Add `speaker_ids[]` column |
| `events` | Add `hotels` JSONB, `badge_template` JSONB |
| `recordings` | Add `resources` JSONB |
| `conversation_participants` | Remove `speaker_id`, keep only `attendee_id` |

### Table Renames (LMS prefix removal)
| Old Name | New Name |
|----------|----------|
| `lms_posts` | `posts` |
| `lms_chapters` | `chapters` |
| `lms_recordings` | `recordings` |
| `lms_announcements` | `announcements` |
| `lms_events` | stays as `lms_events` |

---

## Implementation Phases

### Phase 1: Create Comprehensive Migration File

Create a single migration file that:

1. **Drop all dependent objects** (policies, triggers, functions)
2. **Drop old enum** (`app_role`)
3. **Create new enums** (`user_role`, `order_status`, `moderation_status`)
4. **Create all 22 tables** with new schema
5. **Create database functions** (`check_access`, `generate_order_number`, `reserve_tickets`, `update_updated_at_column`, `handle_new_user`, `ensure_attendee_user_link`)
6. **Create triggers** (updated_at, new user handler, attendee user linker)
7. **Apply RLS policies** to all tables

### Phase 2: Update TypeScript Types

The `types.ts` file is auto-generated, but we need to update all type definitions in hooks and components.

### Phase 3: Update AuthContext

Replace the complex multi-role system with:

```text
// Old: roles[], hasRole(), hasAnyRole(), isLMSAdmin, isEMManager, etc.
// New: profile.role, profile.module_access[], hasModuleAccess(), isAdmin
```

### Phase 4: Update Hooks (15+ files)

| Hook | Changes |
|------|---------|
| `useAgendaItems` | Read `speaker_ids[]` instead of joining `agenda_item_speakers` |
| `usePosts` | Query `post_interactions` instead of `lms_likes` + `lms_comments` |
| `useComments` | Query `post_interactions WHERE type = 'comment'` |
| `useEventHotels` | Read from `events.hotels` JSONB |
| `useBadgeTemplates` | Read from `events.badge_template` JSONB |
| `useRecordingResources` | Read from `recordings.resources` JSONB |
| `useAnnouncements` | Table name `announcements`, localStorage for dismissals |
| `useAttendeeProfile` | Read from `profiles` via `attendees.user_id` |
| `useConversations` | New table names `conversations`, `messages` |
| `useMessages` | New table structure |
| `useOrderMessages` | DELETE this hook |

### Phase 5: Update Edge Functions (16 functions)

| Function | Changes |
|----------|---------|
| `get-attendee-profile` | Read from `profiles` via join |
| `update-attendee-profile` | Write to `profiles` |
| `get-networkable-attendees` | Join `attendees` -> `profiles` |
| `verify-event-payment` | Create attendees with `order_item_id` only |
| `get-attendee-conversations` | New table names |
| `get-conversation-messages` | New table structure |
| `send-attendee-message` | Single `sender_id` |
| `create-dm-conversation` | New table names |
| `create-group-conversation` | New table names |
| `join-session-chat` | New table names |
| `join-event-chat` | New table names |
| `toggle-message-reaction` | JSONB column instead of table |
| `mark-message-read` | New table names |
| `get-message-reactors` | JSONB column instead of table |
| `moderate-content` | Table name `posts` |
| `send-customer-message` | DELETE this function |

### Phase 6: Update Components and Pages

- All role-checking guards use `hasModuleAccess()` or `profile.role === 'admin'`
- Feed components use `post_interactions`
- Agenda management uses multi-select for `speaker_ids[]`
- Hotels management updates JSONB via event mutation
- Badge designer updates JSONB via event mutation
- Messaging components use simplified table structure
- Order detail page removes message section
- Announcements use localStorage for dismissals

---

## Technical Details

### New Enum: user_role

```sql
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'advisor', 'member');
```

### New check_access Function

```sql
CREATE OR REPLACE FUNCTION check_access(p_user_id uuid, p_module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = p_user_id
    AND is_approved = true
    AND (role = 'admin' OR p_module = ANY(module_access))
  );
$$;
```

### Updated profiles Table

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  headline text,
  linkedin_url text,
  bio text,
  company text,
  title text,
  open_to_networking boolean DEFAULT false,
  role user_role NOT NULL DEFAULT 'member',
  module_access text[] DEFAULT '{lms}',
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  is_approved boolean NOT NULL DEFAULT false,
  default_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Simplified attendees Table

```sql
CREATE TABLE attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  attendee_name text NOT NULL DEFAULT '',
  attendee_email text NOT NULL DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_speaker boolean NOT NULL DEFAULT false,
  additional_info jsonb DEFAULT '{}',
  track_access text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Updated AuthContext API

```typescript
// Old API
hasRole('lms_admin')
hasAnyRole(['lms_admin', 'em_admin'])
isLMSAdmin
isEMManager
hasLMSAccess

// New API
profile.role === 'admin'
hasModuleAccess('lms')
hasModuleAccess('events')
isAdmin  // computed: profile.role === 'admin'
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_simplify_schema.sql` | Complete schema rebuild |

## Files to Modify

### Core (5 files)
- `src/contexts/AuthContext.tsx`
- `src/integrations/supabase/types.ts` (auto-regenerated)
- `docs/DATA_DICTIONARY.md`

### Hooks (15 files)
- `src/hooks/useAgendaItems.ts`
- `src/hooks/usePosts.ts`
- `src/hooks/useComments.ts`
- `src/hooks/useEventHotels.ts`
- `src/hooks/useBadgeTemplates.ts`
- `src/hooks/useRecordingResources.ts`
- `src/hooks/useAnnouncements.ts`
- `src/hooks/useAttendeeProfile.ts`
- `src/hooks/useConversations.ts`
- `src/hooks/useMessages.ts`
- `src/hooks/useOrderMessages.ts` (DELETE)
- `src/hooks/useSpeakers.ts`
- `src/hooks/useNetworking.ts`
- `src/hooks/useAttendees.ts`
- `src/hooks/useCheckins.ts`

### Edge Functions (16 functions)
- `supabase/functions/get-attendee-profile/index.ts`
- `supabase/functions/update-attendee-profile/index.ts`
- `supabase/functions/get-networkable-attendees/index.ts`
- `supabase/functions/verify-event-payment/index.ts`
- `supabase/functions/get-attendee-conversations/index.ts`
- `supabase/functions/get-conversation-messages/index.ts`
- `supabase/functions/send-attendee-message/index.ts`
- `supabase/functions/create-dm-conversation/index.ts`
- `supabase/functions/create-group-conversation/index.ts`
- `supabase/functions/join-session-chat/index.ts`
- `supabase/functions/join-event-chat/index.ts`
- `supabase/functions/toggle-message-reaction/index.ts`
- `supabase/functions/mark-message-read/index.ts`
- `supabase/functions/get-message-reactors/index.ts`
- `supabase/functions/moderate-content/index.ts`
- `supabase/functions/send-customer-message/index.ts` (DELETE)

### Components (20+ files)
- All role-based route guards
- Feed components (`PostCard.tsx`, `CommentsSection.tsx`)
- Agenda management (`AgendaItemForm.tsx`, `SpeakerSelector.tsx`)
- Hotels management (`HotelCard.tsx`, `HotelForm.tsx`)
- Badge designer (`BadgeDesigner.tsx`)
- Messaging components (`MessageBubble.tsx`, `ConversationCard.tsx`, `Conversation.tsx`)
- Order management components
- Announcements components

### Pages (10+ files)
- Event management pages
- LMS pages (Feed, Recordings, etc.)
- Attendee app pages

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Migration failure | Use transactions, test locally first |
| Missing RLS policies | Comprehensive policy review in migration |
| Broken queries | Update all hooks systematically |
| Edge function failures | Deploy and test each function |
| Type mismatches | Types auto-regenerate after migration |

---

## Estimated Scope

- **Migration file**: ~800-1000 lines of SQL
- **TypeScript changes**: ~50+ files
- **Edge functions**: 16 updates, 1 deletion
- **Testing**: Full app walkthrough required

---

## Order of Operations

1. Create and run migration (drops everything, recreates)
2. Update AuthContext with new role system
3. Update all hooks with new table names/structures
4. Update all edge functions
5. Update components with new role checks
6. Test all features end-to-end
7. Update documentation

