# Lovable Prompt: Simplify Database Schema

> **Context**: This is a development app with NO real user data. All changes are safe to make as breaking changes. The goal is to simplify the database before migrating to Xano. Drop old tables entirely and rebuild — do NOT try to migrate data.

---

## PROMPT FOR LOVABLE

I need to dramatically simplify the database schema for this app. There is no user data — this is a clean rebuild of the schema only. The app has 3 modules (LMS, Event Management, Attendee App) and currently 31+ tables. I want to reduce to ~18 tables by eliminating redundancy, merging duplicated concepts, and removing over-engineered features.

**IMPORTANT**: Create a single new Supabase migration that:
1. Drops ALL existing tables, enums, functions, triggers, and RLS policies
2. Recreates everything from scratch with the simplified schema below
3. Re-applies RLS policies for the new tables
4. Recreates only the necessary helper functions

Then update ALL TypeScript types, hooks, edge functions, components, and pages to match the new schema.

---

### SCHEMA CHANGES — STEP BY STEP

---

### CHANGE 1: Collapse the Role System

**Current state**: 12-value `app_role` enum (`lms_student`, `lms_advisor`, `lms_admin`, `em_advisor`, `em_manager`, `em_admin`, `attendee_student`, `attendee_advisor`, and more), stored in a separate `user_roles` table allowing multiple roles per user. Helper functions like `has_any_lms_role()`, `has_any_em_role()`, `has_any_attendee_role()` work around the complexity.

**New state**: Replace with a single `user_role` enum of 4 values:
```sql
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'advisor', 'member');
```

Add a `module_access` text array column on the `profiles` table:
```sql
module_access text[] DEFAULT '{lms}' -- possible values: 'lms', 'events', 'attendee'
```

- `admin` → full access to everything (ignore module_access)
- `organizer` → can manage events and attendees
- `advisor` → can manage their chapter in LMS, view events
- `member` → basic LMS access (student)

**Drop**: The `user_roles` table entirely. The `advisor_chapters` / `lms_advisor_chapters` table stays (renamed to `advisor_chapters`).

**Drop these database functions**: `has_any_lms_role()`, `has_any_em_role()`, `has_any_attendee_role()`, `is_any_admin()`, `has_role()`. Replace with a single `check_access(user_id uuid, module text)` function that checks `profiles.role` and `profiles.module_access`.

**Update AuthContext**: Replace `roles[]` array and all role-checking computed properties (`isLMSAdmin`, `isEMManager`, etc.) with:
- `profile.role` (single value)
- `profile.module_access` (array)
- `hasModuleAccess(module: 'lms' | 'events' | 'attendee')` helper
- `isAdmin` computed from `profile.role === 'admin'`

**Update all route guards and permission checks** across the app to use the new role/module_access system.

---

### CHANGE 2: Merge Profile Systems

**Current state**: Two separate profile tables — `profiles` (for LMS/core users linked to auth.users) and `attendee_profiles` (for event attendees, linked to `attendees` table). Both store name, avatar, bio, company, title.

**New state**: Keep only the `profiles` table. Add the missing fields from `attendee_profiles`:
```sql
ALTER TABLE profiles ADD COLUMN bio text;
ALTER TABLE profiles ADD COLUMN company text;
ALTER TABLE profiles ADD COLUMN title text;
ALTER TABLE profiles ADD COLUMN open_to_networking boolean DEFAULT false;
```

**Drop**: The `attendee_profiles` table entirely.

**Update**: All attendee profile hooks (`useAttendeeProfile`, `update-attendee-profile` edge function) to read/write from `profiles` instead. The attendee networking page should query `profiles` joined through `attendees.user_id`.

---

### CHANGE 3: Simplify Attendee Authentication

**Current state**: Attendees authenticate via EITHER `user_id` (Supabase auth) OR `order_access_codes` (email + OTP code, no auth.users account). This creates two parallel auth flows with separate RLS policies and edge functions.

**New state**: Keep the `order_access_codes` flow as-is for now (it's needed for guest ticket purchasers who don't have accounts), but when an attendee's email matches an existing `auth.users` email, automatically link the `attendees.user_id` to that auth user.

Add an `ensure_attendee_user_link()` trigger on the `attendees` table that fires on INSERT:
```sql
-- If attendee_email matches an existing auth.users email, set user_id automatically
CREATE OR REPLACE FUNCTION ensure_attendee_user_link()
RETURNS TRIGGER AS $$
BEGIN
  SELECT id INTO NEW.user_id FROM auth.users WHERE email = NEW.attendee_email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This means attendees who ARE registered users get the full experience automatically, while guest attendees still work via access codes. No code changes needed beyond the trigger.

---

### CHANGE 4: Deduplicate Order/Attendee Data

**Current state**: `attendee_email` and `attendee_name` appear in THREE places: `orders` table, `order_items` table, AND `attendees` table. The `attendees` table also redundantly stores `order_id`, `order_item_id`, AND `ticket_type_id` (derivable from `order_item_id`).

**New state**:
- **`orders` table**: Keep `email` and `full_name` (this is the purchaser's info — may differ from attendee)
- **`order_items` table**: REMOVE `attendee_name` and `attendee_email` columns. These belong on the `attendees` record only.
- **`attendees` table**: Keep `attendee_name` and `attendee_email`. REMOVE `order_id` (derivable via `order_item.order_id`) and `ticket_type_id` (derivable via `order_item.ticket_type_id`). Keep `order_item_id` as the single FK.

Updated `attendees` table:
```sql
CREATE TABLE attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  attendee_name text NOT NULL DEFAULT '',
  attendee_email text NOT NULL DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  additional_info jsonb DEFAULT '{}',
  track_access text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Update**: All queries that previously joined `attendees` to `orders` directly now go through `order_items`. Update hooks: `useEventAttendees`, `useOrderAttendees`, `useAttendeeStats`, the checkout edge functions, and the check-in system.

---

### CHANGE 5: Merge Comments and Likes into Post Interactions

**Current state**: Separate `lms_comments` and `lms_likes` tables for the social feed.

**New state**: Merge into a single `post_interactions` table:
```sql
CREATE TABLE post_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'comment')),
  content text, -- NULL for likes, required for comments
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, type) -- only enforced where type='like' via partial index
);

-- Partial unique index: one like per user per post
CREATE UNIQUE INDEX idx_one_like_per_user ON post_interactions (post_id, user_id) WHERE type = 'like';
```

**Drop**: `lms_comments` and `lms_likes` tables.

**Update**: The `usePosts` hook, `useComments` hook, and all feed components. The feed should query `post_interactions` filtered by type. Likes count = `COUNT(*) WHERE type = 'like'`. Comments = `WHERE type = 'comment' ORDER BY created_at`.

---

### CHANGE 6: Flatten Agenda-Speaker Relationship

**Current state**: A join table `agenda_item_speakers` maps speakers to agenda items with `role` and `sort_order`.

**New state**: Replace with a `speaker_ids` UUID array on `agenda_items`:
```sql
ALTER TABLE agenda_items ADD COLUMN speaker_ids uuid[] DEFAULT '{}';
```

**Drop**: The `agenda_item_speakers` table.

**Update**: The `useAgendaItems` hook to fetch speakers separately and match by ID. The agenda management UI should use a multi-select for speakers instead of the current join-table CRUD. Update the `Agenda.tsx` and `EditEvent.tsx` pages.

---

### CHANGE 7: Inline Event Hotels and Badge Templates

**Current state**: `event_hotels` table (one-to-many with events) and `badge_templates` table (one-to-one with events) are separate tables.

**New state**: Move both into JSON columns on the `events` table:
```sql
ALTER TABLE events ADD COLUMN hotels jsonb DEFAULT '[]';
-- hotels format: [{ name, address, phone, description, image_url, booking_url }]

ALTER TABLE events ADD COLUMN badge_template jsonb DEFAULT NULL;
-- badge_template format: { background_image_url, orientation, fields: [...] }
```

**Drop**: `event_hotels` and `badge_templates` tables.

**Update**: `useEventHotels` hook → derive from `useEventById().data.hotels`. `useBadgeTemplates` hook → derive from `useEventById().data.badge_template`. Update the Hotels management page and Badge Designer page to read/write the JSON fields via event update mutations.

---

### CHANGE 8: Inline Recording Resources

**Current state**: `lms_recording_resources` table stores downloadable files per recording (name, file_url, file_type, file_size).

**New state**: Move to a JSON array on `lms_recordings`:
```sql
ALTER TABLE lms_recordings ADD COLUMN resources jsonb DEFAULT '[]';
-- resources format: [{ name, file_url, file_type, file_size }]
```

**Drop**: `lms_recording_resources` table.

**Update**: `useRecordingResources` hook to read from `lms_recordings.resources`. Update the recordings upload/edit UI.

---

### CHANGE 9: Remove Dismissed Announcements Tracking

**Current state**: `dismissed_announcements` table tracks which users dismissed which announcements.

**New state**: Drop the table. Instead, store dismissed announcement IDs as a JSON array in localStorage on the client side. This is simpler and doesn't need server-side tracking.

**Drop**: `dismissed_announcements` table (or `lms_dismissed_announcements` if it was prefixed).

**Update**: The announcements component to use `localStorage.getItem('dismissed_announcements')` instead of querying a table.

---

### CHANGE 10: Simplify Messaging (Reduce 6 Tables to 3)

**Current state**: 6 tables — `attendee_conversations`, `conversation_participants`, `attendee_messages`, `message_reactions` — with nullable `attendee_id` / `speaker_id` columns and CHECK constraints. Supports 4 conversation types (direct, group, session, event).

**New state**: Keep the same 4 conversation types but simplify the participant model. Use a single `sender_id` that references `attendees.id` (speakers who need to chat should also have an attendee record created for them).

Simplified tables:
```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('direct', 'group', 'session', 'event')),
  name text,
  agenda_item_id uuid REFERENCES agenda_items(id) ON DELETE SET NULL,
  created_by uuid REFERENCES attendees(id) ON DELETE SET NULL,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz,
  muted_until timestamptz,
  UNIQUE(conversation_id, attendee_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  is_deleted boolean DEFAULT false,
  reactions jsonb DEFAULT '{}',
  -- reactions format: { "👍": ["attendee-uuid-1", "attendee-uuid-2"], "❤️": [...] }
  created_at timestamptz DEFAULT now()
);
```

**Drop**: `attendee_conversations`, `attendee_messages`, `conversation_participants` (old), `message_reactions` tables.

**Key change**: `message_reactions` is now a JSONB column on `messages` instead of a separate table. This eliminates a table and simplifies reaction queries. The `reactions` field is a JSON object mapping emoji strings to arrays of attendee UUIDs.

**Update**: All 8 messaging edge functions, the `useMessages` and `useConversations` hooks, `ConversationsContext`, and all messaging UI components (Messages.tsx, Conversation.tsx). When a speaker needs to participate in chat, create a corresponding `attendees` record for them (with a special `is_speaker` flag or `ticket_type` that indicates they're a speaker, not a ticket holder).

---

### CHANGE 11: Remove `order_messages` Table

**Current state**: `order_messages` table for admin-to-customer communication about orders.

**New state**: Drop it. Use email notifications for order communication instead (which is the standard e-commerce pattern). If in-app messaging is needed later, it can use the simplified messaging system.

**Drop**: `order_messages` table.

**Update**: Remove the `useOrderMessages` hook and any admin UI for sending order messages. Remove the `send-customer-message` edge function.

---

### CHANGE 12: Rename LMS-Prefixed Tables

**Current state**: LMS tables have inconsistent naming — some are prefixed with `lms_` (like `lms_posts`, `lms_comments`) while others aren't (like `profiles`, `chapters`).

**New state**: Since the LMS tables are now distinct from the event/attendee tables, keep the `lms_` prefix for clarity but ensure consistency:
- `lms_posts` (was `posts` or `lms_posts`) — keep as `posts`
- `lms_chapters` (was `chapters`) — keep as `chapters`
- `lms_recordings` — keep as `recordings`
- `lms_announcements` — keep as `announcements`
- `lms_events` — keep as `lms_events` (to distinguish from the main `events` table)
- `post_interactions` — new merged table (replaces `lms_comments` + `lms_likes`)

Remove all `lms_` prefixes EXCEPT for `lms_events` (which would conflict with `events`).

---

## FINAL SIMPLIFIED SCHEMA (18 Tables)

### Core & Auth
1. **profiles** — id, user_id, full_name, avatar_url, headline, bio, company, title, open_to_networking, role (user_role enum), module_access (text[]), chapter_id, is_approved, linkedin_url, created_at, updated_at
2. **chapters** — id, name, description, created_at, updated_at
3. **advisor_chapters** — id, user_id, chapter_id, UNIQUE(user_id, chapter_id)

### LMS
4. **posts** — id, user_id, content, image_url, video_url, link_url, chapter_id, is_global, moderation_status, created_at, updated_at
5. **post_interactions** — id, post_id, user_id, type ('like'|'comment'), content, created_at
6. **recordings** — id, title, description, video_url, thumbnail_url, mux_asset_id, mux_playback_id, mux_upload_id, status, video_aspect_ratio, captions_url, resources (jsonb), uploaded_by, created_at, updated_at
7. **announcements** — id, title, content, is_active, expires_at, created_by, created_at, updated_at
8. **lms_events** — id, title, description, starts_at, ends_at, meeting_link, is_active, created_by, created_at, updated_at

### Events
9. **events** — id, title, slug (UNIQUE), description, starts_at, ends_at, venue_name, venue_address, cover_image_url, is_published, created_by, travel_info, travel_contact_email, hotels (jsonb), badge_template (jsonb), created_at, updated_at
10. **ticket_types** — id, event_id, name, price_cents, quantity_available, quantity_sold, sales_start_at, sales_end_at, max_per_order, sort_order, created_at
11. **speakers** — id, event_id, name, title, company, bio, photo_url, linkedin_url, twitter_url, website_url, sort_order, created_at
12. **agenda_items** — id, event_id, title, description, item_type, starts_at, ends_at, location, track, sort_order, is_highlighted, speaker_ids (uuid[]), created_at
13. **orders** — id, order_number (UNIQUE), event_id, user_id, email, full_name, phone, status (order_status enum), subtotal_cents, fees_cents, total_cents, stripe_payment_intent_id, edit_token, created_at, updated_at
14. **order_items** — id, order_id, ticket_type_id, quantity, unit_price_cents, created_at

### Attendees
15. **attendees** — id, order_item_id, attendee_name, attendee_email, user_id, additional_info (jsonb), track_access (text[]), created_at, updated_at
16. **order_access_codes** — id, email, code, expires_at, used_at, created_at
17. **attendee_bookmarks** — id, attendee_id, agenda_item_id, UNIQUE(attendee_id, agenda_item_id)
18. **attendee_checkins** — id, attendee_id, event_id, check_in_date, checked_in_at, checked_in_by, notes, UNIQUE(attendee_id, check_in_date)

### Messaging (simplified)
19. **conversations** — id, event_id, type, name, agenda_item_id, created_by, is_archived, created_at
20. **conversation_participants** — id, conversation_id, attendee_id, role, joined_at, last_read_at, muted_until, UNIQUE(conversation_id, attendee_id)
21. **messages** — id, conversation_id, sender_id, content, reply_to_id, is_deleted, reactions (jsonb), created_at

### Also keep
22. **push_subscriptions** — id, user_id, endpoint, p256dh, auth, created_at

---

## ENUMS (Simplified)

```sql
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'advisor', 'member');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'flagged');
```

Drop the old `app_role` enum.

---

## DATABASE FUNCTIONS TO KEEP (Simplified)

```sql
-- Check module access
check_access(user_id uuid, module text) RETURNS boolean

-- Generate order numbers
generate_order_number() RETURNS text

-- Reserve tickets atomically
reserve_tickets(ticket_type_id uuid, quantity int) RETURNS boolean

-- Auto-link attendee to auth user
ensure_attendee_user_link() -- TRIGGER on attendees INSERT

-- Auto-update updated_at
update_updated_at_column() -- TRIGGER on tables with updated_at
```

Drop all other helper functions (`has_role`, `has_any_lms_role`, `has_any_em_role`, `has_any_attendee_role`, `is_any_admin`, `is_event_owner`, `is_user_approved`).

---

## EDGE FUNCTIONS TO UPDATE

These edge functions need to be updated for the new schema:

1. **create-event-checkout** — Remove `attendee_name`/`attendee_email` from order_items insert
2. **verify-event-payment** — Create attendees with `order_item_id` only (no `order_id` or `ticket_type_id`)
3. **get-attendee-profile** — Read from `profiles` table instead of `attendee_profiles`
4. **update-attendee-profile** — Write to `profiles` table instead of `attendee_profiles`
5. **get-networkable-attendees** — Join `attendees` → `profiles` (via user_id) for networking data
6. **All 8 messaging functions** — Use new `conversations`, `messages`, `conversation_participants` tables. Use single `sender_id`/`attendee_id` instead of dual `attendee_id`/`speaker_id`. Reactions are now in `messages.reactions` jsonb.
7. **send-customer-message** — DELETE this edge function entirely
8. **moderate-content** — Use new `moderation_status` enum (removed `auto_flagged` value)

---

## HOOKS TO UPDATE

1. **AuthContext** — Replace `roles[]` with `profile.role` + `profile.module_access[]`. Remove all `isLMSAdmin`, `isEMManager` etc. computed props. Add `hasModuleAccess(module)` helper.
2. **usePosts** — Query `post_interactions` instead of separate `lms_likes` + `lms_comments`
3. **useComments** — Query `post_interactions WHERE type = 'comment'`
4. **useEventAttendees** — Join through `order_items` instead of direct `orders` join. Remove `ticket_type_id` from attendees.
5. **useAgendaItems** — Read `speaker_ids` array from agenda_items, fetch speakers separately
6. **useEventHotels** — Read from `events.hotels` jsonb field
7. **useBadgeTemplates** — Read from `events.badge_template` jsonb field
8. **useRecordingResources** — Read from `recordings.resources` jsonb field
9. **useConversations / useMessages** — Adapt to simplified messaging schema
10. **useOrderMessages** — DELETE this hook entirely

---

## COMPONENTS TO UPDATE

- All role-checking components and route guards
- Feed components (posts, comments, likes)
- Agenda management (speaker assignment UI → multi-select)
- Hotels management page → inline JSON editor or form that writes to events.hotels
- Badge designer → reads/writes events.badge_template
- All attendee messaging components
- Attendee profile components (read from profiles, not attendee_profiles)
- Order detail page (remove order messages section)

---

## WHAT NOT TO CHANGE

- Keep Stripe integration as-is
- Keep Mux video integration as-is
- Keep the PWA configuration as-is
- Keep the public event pages and checkout flow structure
- Keep the attendee QR code and check-in system
- Keep Supabase Storage usage for file uploads
- Keep the overall page/route structure — just update data fetching

---

This is a schema-only refactor. The app should look and behave identically to the user — we're just cleaning up the database layer to prepare for a Xano migration.
