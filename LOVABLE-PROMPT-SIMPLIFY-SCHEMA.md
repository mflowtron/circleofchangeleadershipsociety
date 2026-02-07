# Lovable Prompt: Simplify Database Schema

> **How to use this**: Paste the entire contents below the divider into Lovable as a single prompt. It is long but every section is necessary — Lovable needs the full context to make the migration and code changes correctly. If Lovable stalls or only completes part of the work, follow up with "Continue implementing the schema simplification from where you left off."

---

## PROMPT FOR LOVABLE

I need to dramatically simplify this app's Supabase database schema. This is a **development app with NO real user data** — all changes are safe to make as breaking changes. We are preparing this schema to eventually migrate to Xano, but right now the changes need to happen on the **live Lovable Cloud Supabase instance** via a proper Supabase migration.

The app has 3 modules (LMS, Event Management, Attendee App) and currently 31+ tables across 53 migration files. I want to reduce to ~22 tables by eliminating redundancy, merging duplicated concepts, and removing over-engineered features.

---

## MIGRATION STRATEGY

**You MUST create a new Supabase migration file** (in `supabase/migrations/`) that runs against the live Lovable Cloud Supabase database. Since there is no user data to preserve:

1. Drop ALL existing tables, enums, functions, triggers, and RLS policies in the correct dependency order (children before parents, drop policies before tables)
2. Recreate everything from scratch with the simplified schema defined below
3. Re-apply RLS policies for the new tables
4. Recreate only the necessary helper functions and triggers
5. Re-register the `on_auth_user_created` trigger so new signups still get a profile row

Follow the migration patterns already established in this project:
- Use `IF EXISTS` / `IF NOT EXISTS` for safety
- Use `CASCADE` on drops to handle dependency chains
- Use `SECURITY DEFINER` + `SET search_path = public` on helper functions
- Use `gen_random_uuid()` for all primary keys
- Use `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()` for timestamps
- Include `updated_at` triggers on tables that need them
- Name the file with format `YYYYMMDDHHMMSS_simplify_schema.sql`

After the migration is created, update ALL TypeScript types (`src/integrations/supabase/types.ts`), hooks, edge functions, context providers, components, and pages to match the new schema. **The app must build and function correctly after these changes.**

---

## SCHEMA CHANGES — STEP BY STEP

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
CREATE OR REPLACE FUNCTION ensure_attendee_user_link()
RETURNS TRIGGER AS $$
BEGIN
  SELECT id INTO NEW.user_id FROM auth.users WHERE email = NEW.attendee_email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_attendee_created
  BEFORE INSERT ON public.attendees
  FOR EACH ROW EXECUTE FUNCTION ensure_attendee_user_link();
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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
  created_at timestamptz NOT NULL DEFAULT now()
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
speaker_ids uuid[] DEFAULT '{}'
```

**Drop**: The `agenda_item_speakers` table.

**Update**: The `useAgendaItems` hook to fetch speakers separately and match by ID. The agenda management UI should use a multi-select for speakers instead of the current join-table CRUD. Update the `Agenda.tsx` and `EditEvent.tsx` pages.

---

### CHANGE 7: Inline Event Hotels and Badge Templates

**Current state**: `event_hotels` table (one-to-many with events) and `badge_templates` table (one-to-one with events) are separate tables.

**New state**: Move both into JSON columns on the `events` table:
```sql
hotels jsonb DEFAULT '[]',
-- hotels format: [{ "name": "", "address": "", "phone": "", "description": "", "image_url": "", "booking_url": "" }]

badge_template jsonb DEFAULT NULL
-- badge_template format: { "background_image_url": "", "orientation": "", "fields": [...] }
```

**Drop**: `event_hotels` and `badge_templates` tables.

**Update**: `useEventHotels` hook → derive from `useEventById().data.hotels`. `useBadgeTemplates` hook → derive from `useEventById().data.badge_template`. Update the Hotels management page and Badge Designer page to read/write the JSON fields via event update mutations.

---

### CHANGE 8: Inline Recording Resources

**Current state**: `lms_recording_resources` / `recording_resources` table stores downloadable files per recording (name, file_url, file_type, file_size).

**New state**: Move to a JSON array column on the `recordings` table:
```sql
resources jsonb DEFAULT '[]'
-- resources format: [{ "name": "", "file_url": "", "file_type": "", "file_size": 0 }]
```

**Drop**: `recording_resources` / `lms_recording_resources` table.

**Update**: `useRecordingResources` hook to read from `recordings.resources`. Update the recordings upload/edit UI.

---

### CHANGE 9: Remove Dismissed Announcements Tracking

**Current state**: `dismissed_announcements` table tracks which users dismissed which announcements.

**New state**: Drop the table. Instead, store dismissed announcement IDs as a JSON array in `localStorage` on the client side. This is simpler and doesn't need server-side tracking.

**Drop**: `dismissed_announcements` table (or `lms_dismissed_announcements` if it was prefixed).

**Update**: The announcements component to use `localStorage.getItem('dismissed_announcements')` instead of querying a table.

---

### CHANGE 10: Simplify Messaging (Reduce Tables from 4+2 to 3)

**Current state**: `attendee_conversations`, `conversation_participants`, `attendee_messages`, `message_reactions` — with nullable `attendee_id` / `speaker_id` columns and CHECK constraints. Supports 4 conversation types (direct, group, session, event).

**New state**: Keep the same 4 conversation types but simplify the participant model. Use a single `sender_id` / `attendee_id` that references `attendees.id`. Speakers who need to participate in chat should have an attendee record created for them (with a null `order_item_id` allowed, or a special flag).

To allow speakers in chat, make `order_item_id` nullable on `attendees` and add an `is_speaker` flag:
```sql
CREATE TABLE attendees (
  ...
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE, -- nullable for speakers
  is_speaker boolean NOT NULL DEFAULT false,
  ...
);
```

Simplified messaging tables:
```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('direct', 'group', 'session', 'event')),
  name text,
  agenda_item_id uuid REFERENCES agenda_items(id) ON DELETE SET NULL,
  created_by uuid REFERENCES attendees(id) ON DELETE SET NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
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
  is_deleted boolean NOT NULL DEFAULT false,
  reactions jsonb DEFAULT '{}',
  -- reactions format: { "👍": ["attendee-uuid-1", "attendee-uuid-2"], "❤️": [...] }
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Drop**: `attendee_conversations`, `attendee_messages`, old `conversation_participants`, `message_reactions` tables.

**Key change**: `message_reactions` is now a JSONB column on `messages` instead of a separate table. The `reactions` field is a JSON object mapping emoji strings to arrays of attendee UUIDs.

**Update**: All 8 messaging edge functions, the `useMessages` and `useConversations` hooks, `ConversationsContext`, and all messaging UI components (Messages.tsx, Conversation.tsx).

---

### CHANGE 11: Remove `order_messages` Table

**Current state**: `order_messages` table for admin-to-customer communication about orders.

**New state**: Drop it. Use email notifications for order communication instead (which is the standard e-commerce pattern).

**Drop**: `order_messages` table.

**Update**: Remove the `useOrderMessages` hook and any admin UI for sending order messages. Remove the `send-customer-message` edge function.

---

### CHANGE 12: Clean Up Table Naming

**Current state**: LMS tables have inconsistent naming — some are prefixed with `lms_` (like `lms_posts`, `lms_comments`) while others aren't (like `profiles`, `chapters`).

**New state**: Remove all `lms_` prefixes EXCEPT for `lms_events` (which would conflict with the main `events` table):
- `lms_posts` → `posts`
- `lms_chapters` → `chapters`
- `lms_recordings` → `recordings`
- `lms_announcements` → `announcements`
- `lms_events` → stays as `lms_events`
- `lms_comments` + `lms_likes` → already replaced by `post_interactions` (Change 5)
- `lms_advisor_chapters` → `advisor_chapters`

Update all TypeScript references, Supabase queries, and edge functions to use the new table names.

---

## FINAL SIMPLIFIED SCHEMA (22 Tables)

### Core & Auth (3 tables)
1. **profiles** — id, user_id (FK auth.users, UNIQUE), full_name, avatar_url, headline, bio, company, title, open_to_networking, role (user_role enum), module_access (text[]), chapter_id (FK chapters), is_approved, linkedin_url, default_role, created_at, updated_at
2. **chapters** — id, name, description, created_at, updated_at
3. **advisor_chapters** — id, user_id (FK auth.users), chapter_id (FK chapters), UNIQUE(user_id, chapter_id)

### LMS (4 tables)
4. **posts** — id, user_id, content, image_url, video_url, link_url, chapter_id, is_global, moderation_status, created_at, updated_at
5. **post_interactions** — id, post_id, user_id, type ('like'|'comment'), content, created_at
6. **recordings** — id, title, description, video_url, thumbnail_url, mux_asset_id, mux_playback_id, mux_upload_id, status, video_aspect_ratio, captions_url, resources (jsonb), uploaded_by, created_at, updated_at
7. **announcements** — id, title, content, is_active, expires_at, created_by, created_at, updated_at
8. **lms_events** — id, title, description, starts_at, ends_at, meeting_link, is_active, created_by, created_at, updated_at

### Events (6 tables)
9. **events** — id, title, slug (UNIQUE), description, starts_at, ends_at, venue_name, venue_address, cover_image_url, is_published, created_by, travel_info, travel_contact_email, timezone, hotels (jsonb), badge_template (jsonb), created_at, updated_at
10. **ticket_types** — id, event_id, name, price_cents, quantity_available, quantity_sold, sales_start_at, sales_end_at, max_per_order, sort_order, created_at
11. **speakers** — id, event_id, name, title, company, bio, photo_url, linkedin_url, twitter_url, website_url, sort_order, created_at
12. **agenda_items** — id, event_id, title, description, item_type, starts_at, ends_at, location, track, sort_order, is_highlighted, speaker_ids (uuid[]), created_at
13. **orders** — id, order_number (UNIQUE), event_id, user_id, email, full_name, phone, status (order_status enum), subtotal_cents, fees_cents, total_cents, stripe_payment_intent_id, edit_token, created_at, updated_at
14. **order_items** — id, order_id, ticket_type_id, quantity, unit_price_cents, created_at

### Attendees (5 tables)
15. **attendees** — id, order_item_id (nullable for speakers), attendee_name, attendee_email, user_id, is_speaker, additional_info (jsonb), track_access (text[]), created_at, updated_at
16. **order_access_codes** — id, email, code, expires_at, used_at, created_at
17. **attendee_bookmarks** — id, attendee_id, agenda_item_id, UNIQUE(attendee_id, agenda_item_id)
18. **attendee_checkins** — id, attendee_id, event_id, check_in_date, checked_in_at, checked_in_by, notes, UNIQUE(attendee_id, check_in_date)

### Messaging (3 tables)
19. **conversations** — id, event_id, type, name, agenda_item_id, created_by, is_archived, created_at
20. **conversation_participants** — id, conversation_id, attendee_id, role, joined_at, last_read_at, muted_until, UNIQUE(conversation_id, attendee_id)
21. **messages** — id, conversation_id, sender_id, content, reply_to_id, is_deleted, reactions (jsonb), created_at

### Other (1 table)
22. **push_subscriptions** — id, user_id, endpoint, p256dh, auth, created_at

---

## ENUMS (3 total, down from 4)

```sql
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'advisor', 'member');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'flagged');
```

Drop the old `app_role` enum entirely.

---

## DATABASE FUNCTIONS (5 total, down from 8+)

```sql
-- 1. Check module access (replaces has_role, has_any_lms_role, has_any_em_role, etc.)
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

-- 2. Generate order numbers (keep as-is)
-- generate_order_number() RETURNS text

-- 3. Reserve tickets atomically (keep as-is)
-- reserve_tickets(ticket_type_id uuid, quantity int) RETURNS boolean

-- 4. Auto-link attendee to auth user on INSERT
-- ensure_attendee_user_link() TRIGGER

-- 5. Auto-update updated_at column
-- update_updated_at_column() TRIGGER
```

Drop all other helper functions (`has_role`, `has_any_lms_role`, `has_any_em_role`, `has_any_attendee_role`, `is_any_admin`, `is_event_owner`, `is_user_approved`).

Keep the `handle_new_user()` trigger function that creates a profile row when a new auth.users row is inserted — update it to set the default role:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, module_access)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'member',
    '{lms}'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## RLS POLICIES

Apply RLS to every table. Follow the existing patterns:
- **profiles**: Authenticated users can SELECT all. Users can UPDATE their own. INSERT on auth trigger only.
- **posts**: Authenticated users with LMS access can SELECT. Authors can INSERT/UPDATE/DELETE their own. Admins can moderate.
- **post_interactions**: Authenticated users can SELECT. Users can INSERT/DELETE their own.
- **events**: Published events are SELECT-able by anyone (anon + authenticated). Organizers/admins can INSERT/UPDATE/DELETE.
- **orders**: Users can SELECT their own orders. Edge functions (service role) handle INSERT/UPDATE.
- **attendees**: Users can SELECT their own attendee records. Edge functions handle INSERT/UPDATE.
- **conversations, messages, conversation_participants**: Participants can SELECT. Senders can INSERT. Edge functions handle most operations.
- Use `check_access()` in policies instead of the old `has_role()` / `has_any_*_role()` functions.

---

## EDGE FUNCTIONS TO UPDATE

These Supabase edge functions need to be updated for the new schema:

1. **create-event-checkout** — Remove `attendee_name`/`attendee_email` from order_items insert. Only insert into `order_items`, not directly into `attendees` yet.
2. **verify-event-payment** — Create attendees with `order_item_id` only (no `order_id` or `ticket_type_id`). The `ensure_attendee_user_link` trigger handles user linking.
3. **get-attendee-profile** — Read from `profiles` table (joined via `attendees.user_id`) instead of `attendee_profiles`
4. **update-attendee-profile** — Write to `profiles` table instead of `attendee_profiles`
5. **get-networkable-attendees** — Join `attendees` → `profiles` (via user_id) for networking data. Use `profiles.open_to_networking` instead of `attendee_profiles.open_to_networking`.
6. **All 8 messaging functions** (send-attendee-message, get-conversation-messages, get-attendee-conversations, create-dm-conversation, create-group-conversation, join-session-chat, join-event-chat, toggle-message-reaction, mark-message-read, get-message-reactors) — Use new `conversations`, `messages`, `conversation_participants` table names. Use single `sender_id`/`attendee_id` instead of dual `attendee_id`/`speaker_id` columns. Reactions read/write from `messages.reactions` jsonb field.
7. **send-customer-message** — DELETE this edge function entirely
8. **moderate-content** — Use new `moderation_status` enum (removed `auto_flagged` value). Reference `posts` table (not `lms_posts`).

---

## HOOKS TO UPDATE

1. **AuthContext** — Replace `roles[]` with `profile.role` + `profile.module_access[]`. Remove all `isLMSAdmin`, `isEMManager`, `hasLMSAccess` etc. computed props. Add `hasModuleAccess(module)` helper that returns `profile.role === 'admin' || profile.module_access?.includes(module)`.
2. **usePosts** — Query `post_interactions` instead of separate `lms_likes` + `lms_comments`. Table name `posts` (not `lms_posts`).
3. **useComments** — Query `post_interactions WHERE type = 'comment'`
4. **useEventAttendees** — Join through `order_items` to reach `orders` instead of direct `attendees.order_id`. Remove references to `attendees.ticket_type_id`.
5. **useAgendaItems** — Read `speaker_ids` uuid array from `agenda_items`, fetch speakers separately and match by ID.
6. **useEventHotels** — Read from `events.hotels` jsonb field instead of `event_hotels` table.
7. **useBadgeTemplates** — Read from `events.badge_template` jsonb field instead of `badge_templates` table.
8. **useRecordingResources** — Read from `recordings.resources` jsonb field instead of `recording_resources` table.
9. **useConversations / useMessages** — Adapt to new `conversations`, `messages`, `conversation_participants` table names. Single `attendee_id`/`sender_id` instead of dual columns.
10. **useOrderMessages** — DELETE this hook entirely.
11. **useAnnouncements** — Table name `announcements` (not `lms_announcements`). Dismissal state from localStorage.
12. **useRecordings / useTranscript** — Table name `recordings` (not `lms_recordings`).
13. **All hooks referencing `lms_chapters`** — Use `chapters` instead.

---

## COMPONENTS TO UPDATE

- **All role-checking components and route guards** — Use `profile.role` + `hasModuleAccess()` instead of `hasRole()` / `hasAnyRole()`
- **Feed components** (posts, comments, likes) — Use `post_interactions` table
- **Agenda management** (speaker assignment UI) — Use multi-select populating `speaker_ids[]` instead of join-table CRUD
- **Hotels management page** — Read/write `events.hotels` jsonb via event update mutation
- **Badge designer** — Read/write `events.badge_template` jsonb via event update mutation
- **All attendee messaging components** — Use simplified table names and single participant ID
- **Attendee profile components** — Read from `profiles` via `attendees.user_id`, not `attendee_profiles`
- **Order detail page** — Remove order messages section and related UI
- **Announcements component** — Use localStorage for dismissed state
- **Recording resources UI** — Read/write `recordings.resources` jsonb

---

## WHAT NOT TO CHANGE

- Keep Stripe integration (payment intents, checkout flow) as-is
- Keep Mux video integration (upload, webhooks, playback) as-is
- Keep the PWA configuration as-is
- Keep the public event pages and checkout flow structure
- Keep the attendee QR code and check-in system
- Keep Supabase Storage usage for file uploads
- Keep the overall page/route structure — just update the data-fetching layer
- Keep the `order_access_codes` table and attendee OTP auth flow
- Keep `push_subscriptions` table as-is

---

## SUMMARY OF TABLES DROPPED (13 tables removed)

| Dropped Table | Replaced By |
|---------------|------------|
| `user_roles` | `profiles.role` + `profiles.module_access` |
| `attendee_profiles` | Merged into `profiles` |
| `lms_comments` | `post_interactions` (type='comment') |
| `lms_likes` | `post_interactions` (type='like') |
| `agenda_item_speakers` | `agenda_items.speaker_ids` uuid array |
| `event_hotels` | `events.hotels` jsonb |
| `badge_templates` | `events.badge_template` jsonb |
| `recording_resources` | `recordings.resources` jsonb |
| `dismissed_announcements` | localStorage on client |
| `attendee_conversations` | Renamed to `conversations` |
| `attendee_messages` | Renamed to `messages` |
| `message_reactions` | `messages.reactions` jsonb column |
| `order_messages` | Removed entirely (use email) |

This is a schema-only refactor. The app should look and behave identically to users — we're simplifying the database layer to reduce complexity and prepare for an eventual Xano migration.
