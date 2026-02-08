

# Announcement Analytics

## Overview

This feature adds analytics tracking for announcement views and dismissals, enabling organizers to measure engagement with their announcements. The system will record when attendees view announcements, when they dismiss them, and aggregate this data for display in the organizer dashboard.

## What Changes

### User Experience

| User | Before | After |
|------|--------|-------|
| Organizer | No visibility into announcement engagement | See view counts and dismiss rates per announcement |
| Organizer | Cannot measure announcement effectiveness | Dashboard shows total views, unique viewers, dismissals |
| Attendee | No change | Interactions are recorded silently in the background |

## Database Changes

### New Table: `announcement_analytics`

Track individual view and dismissal events for detailed analytics:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Primary key |
| `announcement_id` | UUID (FK) | Reference to announcements table |
| `attendee_id` | UUID (FK, nullable) | Reference to attendees table (nullable for anonymous tracking) |
| `event_type` | TEXT | 'view' or 'dismiss' |
| `created_at` | TIMESTAMPTZ | When the event occurred |

**Unique constraint**: One view event per attendee-announcement pair, but allows both view and dismiss.

### Aggregate Columns on `announcements` Table

Add denormalized counters for quick dashboard display:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `view_count` | INTEGER | 0 | Total number of unique views |
| `dismiss_count` | INTEGER | 0 | Total number of dismissals |

### RLS Policies

- **Attendees can INSERT their own analytics**: Attendees can record view/dismiss events for announcements in their event
- **Organizers can SELECT all analytics**: Users with admin/organizer role can view analytics for their events
- **No UPDATE/DELETE for attendees**: Analytics are append-only

## Implementation Steps

### Step 1: Database Migration

Create the `announcement_analytics` table and add aggregate columns to `announcements`:

```text
+----------------------------+
| announcement_analytics     |
+----------------------------+
| id (UUID PK)              |
| announcement_id (UUID FK)  |
| attendee_id (UUID FK)      |
| event_type (TEXT)          |
| created_at (TIMESTAMPTZ)   |
+----------------------------+
        |
        v
+----------------------------+
| announcements              |
+----------------------------+
| ... existing columns ...   |
| view_count (INTEGER)       |  <- NEW
| dismiss_count (INTEGER)    |  <- NEW
+----------------------------+
```

Create a database trigger to automatically update the aggregate counts when analytics events are inserted.

### Step 2: Create Analytics Tracking Functions

**Modify: `src/hooks/useEventAnnouncements.ts`**

Add functions to record analytics events:

- `trackView(announcementId)` - Called when an announcement becomes visible
- `trackDismiss(announcementId)` - Called when user dismisses an announcement

Both functions will:
1. Check if the attendee exists (from context)
2. Insert a record into `announcement_analytics` via upsert (ignore duplicates)
3. The database trigger handles updating aggregate counts

### Step 3: Implement View Tracking in EventHome

**Modify: `src/pages/attendee/EventHome.tsx`**

Track views when announcements are displayed:
- Use `useEffect` to track views when announcements appear on screen
- Only track once per session using a local Set to prevent duplicate API calls
- Track automatically when the component mounts with announcements

### Step 4: Implement Dismiss Tracking

**Modify: `src/pages/attendee/EventHome.tsx`**

Update the dismiss handler to also record the analytics event:
- When `dismissAnnouncement(id)` is called, also call `trackDismiss(id)`
- The dismissal is already persisted locally; analytics adds server-side tracking

### Step 5: Implement View Tracking in Announcements History

**Modify: `src/pages/attendee/Announcements.tsx`**

Track views when the full announcements list is displayed:
- Track views for all visible announcements on the page
- Use IntersectionObserver or mount effect to track visibility

### Step 6: Display Analytics in Organizer Dashboard

**Modify: `src/pages/events/manage/EventAnnouncements.tsx`**

Add analytics display to each announcement card in the history:
- Show view count with eye icon
- Show dismiss count with X icon
- Show engagement rate (views / audience size if available)

```text
┌─────────────────────────────────────────────────────┐
│ WiFi Network Updated                    [active]    │
│ The conference WiFi password has changed...        │
│                                                     │
│ 📅 Feb 8, 2026 3:45 PM                             │
│ 👁️ 156 views  ·  ❌ 23 dismissed  ·  📊 85% seen   │
└─────────────────────────────────────────────────────┘
```

### Step 7: Create Analytics Hook for Organizers

**New file: `src/hooks/useAnnouncementAnalytics.ts`**

A hook for fetching detailed analytics:
- Get view/dismiss counts per announcement
- Get time-series data for engagement over time (optional)
- Calculate engagement rates

## File Changes Summary

| Action | File |
|--------|------|
| Create | Database migration for `announcement_analytics` table and aggregate columns |
| Create | `src/hooks/useAnnouncementAnalytics.ts` |
| Modify | `src/hooks/useEventAnnouncements.ts` |
| Modify | `src/pages/attendee/EventHome.tsx` |
| Modify | `src/pages/attendee/Announcements.tsx` |
| Modify | `src/pages/events/manage/EventAnnouncements.tsx` |

## Technical Details

### Database Trigger for Aggregate Counts

```sql
CREATE OR REPLACE FUNCTION update_announcement_analytics_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'view' THEN
    UPDATE announcements 
    SET view_count = view_count + 1 
    WHERE id = NEW.announcement_id;
  ELSIF NEW.event_type = 'dismiss' THEN
    UPDATE announcements 
    SET dismiss_count = dismiss_count + 1 
    WHERE id = NEW.announcement_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Preventing Duplicate Tracking

1. **Database level**: Unique constraint on (announcement_id, attendee_id, event_type)
2. **Client level**: Session-based Set to track which announcements have been recorded

### View Tracking Logic

```typescript
// In useEventAnnouncements hook
const trackedViews = useRef(new Set<string>());

const trackView = useCallback(async (announcementId: string) => {
  if (trackedViews.current.has(announcementId)) return;
  if (!selectedAttendee?.id) return;
  
  trackedViews.current.add(announcementId);
  
  await supabase.from('announcement_analytics').upsert({
    announcement_id: announcementId,
    attendee_id: selectedAttendee.id,
    event_type: 'view',
  }, { 
    onConflict: 'announcement_id,attendee_id,event_type',
    ignoreDuplicates: true 
  });
}, [selectedAttendee?.id]);
```

### Analytics Display Component

For the organizer dashboard, a simple inline display:

```tsx
<div className="flex items-center gap-3 text-xs text-muted-foreground">
  <span className="flex items-center gap-1">
    <Eye className="h-3 w-3" />
    {ann.view_count} views
  </span>
  <span className="flex items-center gap-1">
    <X className="h-3 w-3" />
    {ann.dismiss_count} dismissed
  </span>
</div>
```

