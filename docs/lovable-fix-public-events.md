# Lovable Prompt: Fix Public /events/* Pages for Non-Logged-In Users

## Problem

The public `/events/*` pages are missing information when there is no user logged in. Non-authenticated visitors should be able to see ALL event information on these pages, including:

- Event details (title, description, date, venue, cover image)
- Featured speakers (names, bios, photos)
- Schedule/agenda items (sessions, breaks, speakers per session)
- Ticket types and pricing
- Hotel & travel information
- Event cover images and speaker photos

## Root Cause

The issue is with Supabase Row Level Security (RLS) policies and/or storage bucket policies. When a user is not logged in, `auth.uid()` returns NULL, and some policies may be blocking access to data that should be publicly readable for published events.

## What to Fix

### 1. Verify and Fix RLS Policies for Public Event Data

Run this SQL in the Supabase SQL Editor to check and fix the RLS policies. These tables need SELECT policies that allow anonymous (non-authenticated) access for published events:

```sql
-- ============================================================
-- STEP 1: Check current SELECT policies on key tables
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('events', 'ticket_types', 'speakers', 'agenda_items')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- ============================================================
-- STEP 2: Ensure events table has a simple public SELECT policy
-- The policy should NOT require auth.uid() for published events
-- ============================================================

-- Drop and recreate the published events policy to be safe
DROP POLICY IF EXISTS "Published events visible" ON public.events;
DROP POLICY IF EXISTS "Published events are publicly visible" ON public.events;

CREATE POLICY "Published events visible"
  ON public.events
  FOR SELECT
  USING (is_published = true);

-- Keep the unpublished events policy for admins (requires auth)
DROP POLICY IF EXISTS "Unpublished to creator admins" ON public.events;
DROP POLICY IF EXISTS "Unpublished events visible to creator and admins" ON public.events;

CREATE POLICY "Unpublished to creator admins"
  ON public.events
  FOR SELECT
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- STEP 3: Fix ticket_types SELECT policy
-- Must allow anonymous access when parent event is published
-- ============================================================

DROP POLICY IF EXISTS "Ticket types with published events" ON public.ticket_types;
DROP POLICY IF EXISTS "Ticket types visible with published events" ON public.ticket_types;

CREATE POLICY "Ticket types with published events"
  ON public.ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND e.is_published = true
    )
  );

-- Separate policy for unpublished events (admin/creator only)
CREATE POLICY "Ticket types for unpublished events"
  ON public.ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ============================================================
-- STEP 4: Fix speakers SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "Speakers with published events" ON public.speakers;
DROP POLICY IF EXISTS "Speakers visible with published events" ON public.speakers;

CREATE POLICY "Speakers with published events"
  ON public.speakers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Speakers for unpublished events"
  ON public.speakers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ============================================================
-- STEP 5: Fix agenda_items SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "Agenda with published events" ON public.agenda_items;
DROP POLICY IF EXISTS "Agenda items visible with published events" ON public.agenda_items;

CREATE POLICY "Agenda with published events"
  ON public.agenda_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Agenda for unpublished events"
  ON public.agenda_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );
```

### 2. Verify Storage Bucket Policies

Event images (cover photos, speaker photos, hotel images) are stored in the `event-images` storage bucket. Ensure it's configured for public read access:

```sql
-- Check if event-images bucket is public
SELECT id, name, public FROM storage.buckets WHERE id = 'event-images';

-- If public is false, fix it:
UPDATE storage.buckets SET public = true WHERE id = 'event-images';

-- Check storage SELECT policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND cmd = 'SELECT';

-- Ensure there's a public read policy for event-images
-- This should already exist, but recreate if missing:
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;

CREATE POLICY "Event images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-images');

-- Also check the avatars bucket (used for profile/speaker photos)
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
```

### 3. Verify the Event is Published

Make sure the events you're testing with have `is_published = true`:

```sql
SELECT id, title, slug, is_published FROM public.events ORDER BY created_at DESC;

-- If needed, publish an event:
-- UPDATE public.events SET is_published = true WHERE slug = 'your-event-slug';
```

### 4. Verify RLS is Enabled

Make sure RLS is enabled on all relevant tables (it should be, but verify):

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'ticket_types', 'speakers', 'agenda_items');
```

All should show `rowsecurity = true`. If any show `false`, enable it:

```sql
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
```

## Why This Fixes It

The key change is splitting the SELECT policies into two separate policies per table:

1. **Public policy** (no auth required): `WHERE e.is_published = true` — this has NO reference to `auth.uid()`, so it works perfectly for anonymous users.

2. **Admin policy** (auth required): `WHERE e.created_by = auth.uid() OR is_admin(auth.uid())` — this only applies to logged-in users who need to see unpublished events.

Previously, these were combined into a single policy with OR conditions that included `auth.uid()`. While PostgreSQL should handle `NULL` from `auth.uid()` gracefully in OR conditions, splitting them into separate policies eliminates any ambiguity and ensures anonymous access works reliably.

## Testing

After applying the fixes:

1. Open an incognito/private browser window (no login session)
2. Navigate to `/events` — should see published events
3. Click on an event — should see:
   - Hero image and event details
   - Featured speakers with photos
   - Full schedule/agenda with session details
   - Ticket types and pricing
   - Hotel and travel information
4. Compare with a logged-in view — both should show identical event information
