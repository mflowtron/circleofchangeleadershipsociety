
# Event Announcements Feature

## Overview

This feature enables event organizers to create announcements that display prominently on the attendee app home screen, with optional push notification integration. It extends the existing announcements table to support event-scoped announcements while keeping the LMS society-wide announcements working separately.

## What Changes

### User Experience

| User | Before | After |
|------|--------|-------|
| Attendee | No event-specific announcements | See urgent updates on home screen with dismiss option |
| Attendee | - | Can view all announcements history on a dedicated page |
| Organizer | Can only send push notifications | Can create in-app announcements with optional push notification |
| Organizer | Separate systems for announcements vs push | Unified interface to reach attendees via both channels |

## Database Changes

### Alter `announcements` Table

Add new columns to support event-scoping and push integration:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `event_id` | UUID (nullable) | NULL | NULL = society-wide, non-null = event-scoped |
| `push_notification_id` | UUID (nullable) | NULL | Links to push record if a push was sent |
| `priority` | TEXT | 'normal' | Values: 'normal', 'urgent' |
| `audience_type` | TEXT | 'all' | Targeting: 'all', 'in_person', 'virtual', 'ticket_type', 'individual' |
| `audience_filter` | JSONB (nullable) | NULL | Stores `{ ticket_type_ids?: string[], attendee_ids?: string[] }` |

### RLS Policies

Add new policies for event-scoped access:
- **Attendees can view event announcements**: Attendees with completed orders for an event can SELECT announcements where `event_id` matches their event
- **Organizers manage event announcements**: Users with admin or organizer role can INSERT/UPDATE/DELETE event announcements

## Implementation Steps

### Step 1: Database Migration

Create migration to alter the `announcements` table:
- Add the 5 new columns
- Add foreign key constraints with ON DELETE CASCADE
- Add check constraint for priority values
- Create new RLS policies for event-scoped access

### Step 2: Create `useEventAnnouncements` Hook

**New file: `src/hooks/useEventAnnouncements.ts`**

A specialized hook for fetching event-scoped announcements in the attendee app:
- Fetches announcements filtered by `event_id` matching the selected event
- Only returns active, non-expired announcements
- Tracks dismissed announcements in localStorage (separate key from LMS)
- Returns both filtered (non-dismissed) and all announcements for different views

### Step 3: Update Attendee Home Screen

**Modify: `src/pages/attendee/EventHome.tsx`**

Add announcements section between event info and quick actions:
- Display up to 2 announcements prominently
- Urgent announcements get red-tinted styling with pulsing indicator
- Normal announcements use existing gold gradient border
- Dismiss button to hide from home screen
- "View All" link when there are more than 2 announcements
- Link to `/attendee/app/announcements` for full history

### Step 4: Create Attendee Announcements Page

**New file: `src/pages/attendee/Announcements.tsx`**

History page showing all active announcements for the event:
- Shows all announcements (including dismissed ones from home screen)
- Sorted by creation date, newest first
- Full content display with timestamps
- Empty state when no announcements exist

### Step 5: Create Organizer Event Announcements Page

**New file: `src/pages/events/manage/EventAnnouncements.tsx`**

Unified management page combining announcement creation with optional push:

**Form Section:**
- Title and content inputs
- Priority selector (normal/urgent)
- Expiration date picker (optional)
- Toggle to also send push notification
- Audience selector (reuses existing `AudienceSelector` component from push system)

**History Section:**
- List of all announcements for the event
- Active/inactive toggle per announcement
- Delete with confirmation dialog
- Badges showing: status, priority, whether push was sent

### Step 6: Update Existing LMS Announcements Hook

**Modify: `src/hooks/useAnnouncements.ts`**

Filter to only fetch announcements where `event_id IS NULL` to prevent collision with event-scoped announcements:
- Add `.is('event_id', null)` to both the allData and activeData queries
- No other changes needed - LMS announcements continue working as before

### Step 7: Add Routes and Navigation

**Modify: `src/App.tsx`**

Add lazy imports and routes:
- `AttendeeAnnouncements` route at `/attendee/app/announcements`
- `ManageEventAnnouncements` route at `/events/manage/announcements`

**Modify: `src/components/events/EventsDashboardSidebar.tsx`**

Add Announcements to the sidebar navigation:
- Add `Megaphone` icon import from lucide-react
- Add nav item before "Push Notifications" in the eventNavItems array

## File Changes Summary

| Action | File |
|--------|------|
| Create | Database migration for `announcements` table alterations |
| Create | `src/hooks/useEventAnnouncements.ts` |
| Create | `src/pages/attendee/Announcements.tsx` |
| Create | `src/pages/events/manage/EventAnnouncements.tsx` |
| Modify | `src/pages/attendee/EventHome.tsx` |
| Modify | `src/hooks/useAnnouncements.ts` |
| Modify | `src/App.tsx` |
| Modify | `src/components/events/EventsDashboardSidebar.tsx` |

## Technical Details

### Push Notification Integration

When "Also Send Push Notification" is enabled:
1. Create the announcement record first
2. Call the existing `send-push-notification` edge function with the same title/content
3. If push succeeds, optionally update the announcement with the `push_notification_id`
4. Show appropriate success/warning toast based on outcome

### Audience Targeting

Reuses the existing push notification audience system:
- `AudienceSelector` component from `src/components/events/push/`
- `useAudienceCounts` hook from `src/hooks/usePushNotifications.ts`
- Same targeting options: All, In-Person, Virtual, By Ticket Type, Individual

### Announcement Card Styling

- **Normal priority**: Gold gradient border (existing `AnnouncementCard` styling)
- **Urgent priority**: Red-tinted border with `bg-destructive/10`, red pulsing dot indicator

### Local Dismissal Storage

Uses a separate localStorage key `dismissed_event_announcements` to avoid collision with LMS announcements dismissals.
