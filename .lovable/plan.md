

# Fix Public /events/* Pages for Non-Logged-In Users

## Overview

This plan addresses two issues:
1. **RLS Policy fixes** to ensure anonymous users can view published event data (speakers, agenda, tickets)
2. **TypeScript build errors** in edge functions that need to be fixed

## Problem Analysis

### RLS Policies
The current RLS policies for `speakers`, `ticket_types`, and `agenda_items` combine published event access with admin/creator access in a single policy using OR conditions. While this should work, splitting them into separate policies (as was done for the `events` table) ensures reliable anonymous access:

**Current (problematic) pattern:**
```sql
-- Single policy with combined conditions
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = speakers.event_id
    AND (e.is_published = true OR e.created_by = auth.uid() OR is_admin(auth.uid()))
  )
)
```

**Recommended pattern (matches events table):**
```sql
-- Policy 1: Public access for published events (no auth required)
USING (EXISTS (SELECT 1 FROM events e WHERE e.id = speakers.event_id AND e.is_published = true))

-- Policy 2: Admin/creator access for unpublished events (auth required)
USING (EXISTS (SELECT 1 FROM events e WHERE e.id = speakers.event_id AND (e.created_by = auth.uid() OR is_admin(auth.uid()))))
```

### Storage Buckets
Already confirmed as public: `event-images`, `avatars`, `speaker-images` ✅

### Edge Function TypeScript Errors
Multiple edge functions have TypeScript errors where:
- `error` is of type `unknown` and needs casting
- Arrays typed as `unknown[]` need proper type assertions

## Implementation Plan

### Phase 1: Database Migration (RLS Policy Updates)

Update policies for `speakers`, `ticket_types`, and `agenda_items` to split public/admin access:

```sql
-- ============================================================
-- SPEAKERS: Split into public + admin policies
-- ============================================================
DROP POLICY IF EXISTS "Speakers with published events" ON public.speakers;

CREATE POLICY "Speakers with published events"
  ON public.speakers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = speakers.event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Speakers for unpublished events"
  ON public.speakers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = speakers.event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ============================================================
-- TICKET_TYPES: Split into public + admin policies
-- ============================================================
DROP POLICY IF EXISTS "Ticket types with published events" ON public.ticket_types;

CREATE POLICY "Ticket types with published events"
  ON public.ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Ticket types for unpublished events"
  ON public.ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ============================================================
-- AGENDA_ITEMS: Split into public + admin policies
-- ============================================================
DROP POLICY IF EXISTS "Agenda with published events" ON public.agenda_items;

CREATE POLICY "Agenda with published events"
  ON public.agenda_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = agenda_items.event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Agenda for unpublished events"
  ON public.agenda_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = agenda_items.event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );
```

### Phase 2: Fix Edge Function TypeScript Errors

Fix TypeScript strict mode errors across multiple edge functions:

| File | Issue | Fix |
|------|-------|-----|
| `get-networkable-attendees/index.ts` | `error.message` on unknown type | Cast error: `(error as Error).message` |
| `get-registration-orders/index.ts` | Array `unknown[]` type with typed predicates | Define interface and cast: `attendees as Attendee[]` |
| `verify-registration-otp/index.ts` | Array `unknown[]` type with typed predicates | Define interface and cast: `attendees as Attendee[]` |
| `join-event-chat/index.ts` | `eventChat` possibly null + error unknown | Add null check before usage, cast error |
| `join-session-chat/index.ts` | `sessionChat` possibly null + error unknown | Add null check before usage, cast error |
| `manage-feed-comments/index.ts` | Accessing `.id` on array type | Fix to access single object, not array |
| `process-scheduled-notifications/index.ts` | `err.message` on unknown type | Cast: `(err as Error).message` |
| `register-push-token/index.ts` | `error.message` on unknown type | Cast error |
| `send-attendee-message/index.ts` | `error.message` on unknown type | Cast error |
| `send-push-notification/index.ts` | `error.message` on unknown type | Cast error |
| `toggle-message-reaction/index.ts` | `error.message` on unknown type | Cast error |
| `update-attendee-profile/index.ts` | `error.message` on unknown type | Cast error |
| `upload-chat-attachment/index.ts` | `error.message` on unknown type | Cast error |

**Common fix pattern for error handling:**
```typescript
// Before
} catch (error) {
  JSON.stringify({ error: error.message })
}

// After
} catch (error) {
  JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
}
```

**Common fix pattern for typed arrays:**
```typescript
// Before
let attendees: unknown[] = [];
attendees.filter((a: { attendee_name?: string }) => ...)

// After
interface AttendeeRecord {
  id: string;
  attendee_name?: string;
  attendee_email?: string;
  form_status?: string;
  // ... other fields
}
let attendees: AttendeeRecord[] = [];
attendees.filter((a) => a.attendee_name && a.attendee_name.trim() !== "")
```

**Fix for manage-feed-comments (accessing array as object):**
```typescript
// Before - attendees is an array due to join, not a single object
const formattedComment = {
  id: newComment.attendees.id,  // Error: .id doesn't exist on array
  name: newComment.attendees.attendee_name,
};

// After - access first element or adjust select
const attendeeData = newComment.attendees as unknown as { id: string; attendee_name: string };
const formattedComment = {
  id: attendeeData.id,
  name: attendeeData.attendee_name,
};
```

## Files to Modify

1. **Database migration** (new file):
   - RLS policy updates for `speakers`, `ticket_types`, `agenda_items`

2. **Edge functions** (12 files):
   - `supabase/functions/get-networkable-attendees/index.ts`
   - `supabase/functions/get-registration-orders/index.ts`
   - `supabase/functions/verify-registration-otp/index.ts`
   - `supabase/functions/join-event-chat/index.ts`
   - `supabase/functions/join-session-chat/index.ts`
   - `supabase/functions/manage-feed-comments/index.ts`
   - `supabase/functions/process-scheduled-notifications/index.ts`
   - `supabase/functions/register-push-token/index.ts`
   - `supabase/functions/send-attendee-message/index.ts`
   - `supabase/functions/send-push-notification/index.ts`
   - `supabase/functions/toggle-message-reaction/index.ts`
   - `supabase/functions/update-attendee-profile/index.ts`
   - `supabase/functions/upload-chat-attachment/index.ts`

## Testing

After implementation:

1. **Anonymous access test**: Open an incognito window and navigate to `/events/{event-slug}` to verify:
   - Event details display (title, description, cover image)
   - Speakers section shows with photos
   - Schedule/agenda displays with session details
   - Ticket types show with pricing
   - Hotel and travel information appears

2. **Authenticated access test**: Log in as an admin/creator and verify you can still:
   - See unpublished events
   - Manage speakers, agenda items, and tickets

