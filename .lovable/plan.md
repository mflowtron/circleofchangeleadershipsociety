

# Add Scheduled Push Notifications

## Overview
Enable organizers to schedule push notifications for future delivery, in addition to sending them immediately. This involves database changes, a new cron-based processor edge function, and UI updates for date/time selection.

---

## Architecture

### Scheduling Strategy

There are two approaches to scheduling:

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **pg_cron (Recommended)** | Store scheduled notifications in DB, cron job checks every minute | Simple, reliable, no external services | 1-minute granularity |
| OneSignal Scheduling | Use OneSignal's built-in `send_after` parameter | Exact delivery time | Requires UTC conversion, less visibility |

**Decision**: Use **pg_cron** approach for better control, visibility into scheduled items, and ability to cancel/edit scheduled notifications.

### How It Works

```text
1. Organizer composes notification and selects "Schedule for Later"
2. Picks date/time using datepicker + time input
3. Notification saved to DB with status="scheduled" and scheduled_for timestamp
4. pg_cron job runs every minute, checking for due notifications
5. Cron calls edge function to process and send via OneSignal
6. Status updated to "sent" or "failed"
```

---

## Database Changes

### Add columns to push_notifications table

```sql
ALTER TABLE public.push_notifications
ADD COLUMN scheduled_for timestamptz,
ADD COLUMN sent_at timestamptz;

-- Update status enum to include 'scheduled'
-- (status is already text, just need to handle new value)

COMMENT ON COLUMN public.push_notifications.scheduled_for IS 
  'When the notification should be sent. NULL = sent immediately.';
COMMENT ON COLUMN public.push_notifications.sent_at IS 
  'When the notification was actually sent. NULL = not yet sent.';
```

---

## New Edge Function: process-scheduled-notifications

A new edge function that:
1. Queries for notifications where `status = 'scheduled'` AND `scheduled_for <= now()`
2. For each, extracts the audience and sends via OneSignal (reusing existing logic)
3. Updates status to 'sent' or 'failed' with `sent_at` timestamp

This function is called by pg_cron every minute.

---

## UI Changes

### NotificationComposer Updates

Add a toggle between "Send Now" and "Schedule for Later":

```text
┌─────────────────────────────────────────────────────────────────┐
│  Compose Notification                                           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  [Title and Message fields...]                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Delivery                                                   ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                              ││
│  │  ◉ Send Now                                                  ││
│  │  ○ Schedule for Later                                        ││
│  │                                                              ││
│  │  [When "Schedule" selected:]                                 ││
│  │  ┌───────────────────────┐  ┌──────────────┐                ││
│  │  │ Feb 15, 2026      ▼   │  │ 09:30 AM     │                ││
│  │  └───────────────────────┘  └──────────────┘                ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                              [Cancel]  [Schedule Notification]   │
└─────────────────────────────────────────────────────────────────┘
```

### NotificationHistory Updates

Display scheduled notifications with:
- "Scheduled" badge (yellow/orange)
- Scheduled time shown
- Cancel button for pending scheduled notifications

```text
┌─────────────────────────────────────────────────────────────────┐
│ Session 3 Starting Soon                           Scheduled 🕐  │
│ Don't miss the workshop in Room B...                            │
│ All Attendees • 125 recipients • Feb 15 at 2:30 PM  [Cancel]    │
├─────────────────────────────────────────────────────────────────┤
│ Welcome to CLC 2026!                                    Sent ✓  │
│ Doors open in 15 minutes...                                     │
│ All Attendees • 125 recipients • 5 mins ago                     │
└─────────────────────────────────────────────────────────────────┘
```

### Confirmation Dialog Updates

Update text based on scheduling mode:
- "Send Now": "Notifications will be sent immediately..."
- "Scheduled": "This notification will be sent on [date] at [time]..."

---

## Files to Create

| File | Description |
|------|-------------|
| `supabase/functions/process-scheduled-notifications/index.ts` | Cron-triggered function to send due notifications |

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `scheduled_for` and `sent_at` columns |
| `src/components/events/push/NotificationComposer.tsx` | Add scheduling toggle, date picker, time input |
| `src/components/events/push/NotificationHistory.tsx` | Show scheduled badge, scheduled time, cancel button |
| `src/hooks/usePushNotifications.ts` | Add `scheduled_for` to interface and mutation, add cancel mutation |
| `supabase/functions/send-push-notification/index.ts` | Support `scheduled_for` param, save with "scheduled" status |
| `supabase/config.toml` | Add new function config |

---

## Cron Job Setup

After deployment, a SQL statement needs to be run to create the cron schedule:

```sql
SELECT cron.schedule(
  'process-scheduled-push-notifications',
  '* * * * *',  -- Every minute
  $$
  SELECT net.http_post(
    url:='https://<project-id>.supabase.co/functions/v1/process-scheduled-notifications',
    headers:='{"Authorization": "Bearer <anon-key>"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

This will be provided as a follow-up step after the code is deployed.

---

## Implementation Flow

### 1. Database Migration
Add `scheduled_for` and `sent_at` columns to `push_notifications`

### 2. Update send-push-notification Edge Function
- Accept optional `scheduled_for` parameter
- If provided, save with `status: 'scheduled'` instead of sending
- If not provided, send immediately (current behavior)

### 3. Create process-scheduled-notifications Edge Function
- Query for due notifications
- Reuse sending logic from send-push-notification
- Update status after sending

### 4. Update UI Components
- Add scheduling toggle and datetime picker to NotificationComposer
- Update confirmation dialog text
- Add scheduled badge and cancel button to NotificationHistory

### 5. Update Hook
- Add `scheduled_for` to interfaces
- Add `cancelNotification` mutation

---

## Technical Notes

### Timezone Handling
- UI displays local browser time with clear labeling
- Stored in database as UTC timestamptz
- Displayed in history relative to user's timezone

### Validation Rules
- Scheduled time must be at least 5 minutes in the future
- Scheduled time must not be more than 30 days ahead
- Cannot schedule for past times

### Status Values
| Status | Meaning |
|--------|---------|
| `scheduled` | Saved, waiting to be sent |
| `sent` | Successfully delivered |
| `failed` | Delivery failed |

### Cancellation
- Only notifications with `status: 'scheduled'` can be cancelled
- Cancellation sets `status: 'cancelled'` (new status)
- Cancelled notifications remain in history for audit

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create |
| `supabase/functions/process-scheduled-notifications/index.ts` | Create |
| `supabase/functions/send-push-notification/index.ts` | Modify |
| `src/components/events/push/NotificationComposer.tsx` | Modify |
| `src/components/events/push/NotificationHistory.tsx` | Modify |
| `src/hooks/usePushNotifications.ts` | Modify |
| `supabase/config.toml` | Modify |

---

## User Experience

1. Organizer selects "Schedule for Later" toggle
2. Date picker and time input appear
3. Picks date and time (e.g., "Feb 15, 2026 at 2:30 PM")
4. Clicks "Schedule Notification"
5. Confirmation shows scheduled delivery time
6. Notification appears in history with "Scheduled" badge
7. Can cancel before send time if needed
8. At scheduled time, cron job sends notification
9. Status updates to "Sent" in history

