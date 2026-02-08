
# Push Notifications Feature with Natively OneSignal Integration

## Overview
Add a complete push notifications system for event organizers to send targeted messages to attendees using Natively's OneSignal integration. The OneSignal player ID will be stored on the **profiles** table (user record) rather than the attendees table, enabling the feature to be reused for future non-event notifications (e.g., LMS announcements, chapter updates).

---

## Architecture

### Storage Strategy: Profiles Table

Storing `onesignal_player_id` on `profiles` instead of `attendees` provides:

| Benefit | Description |
|---------|-------------|
| Reusability | Can send push notifications for LMS, chapters, system-wide alerts |
| Single source | One player ID per user, not duplicated across multiple attendee records |
| Future-proof | Ready for features like advisor notifications, chapter announcements |

### How It Works

1. **Client-side registration**: When users open the native app, the Natively SDK requests notification permission and retrieves a OneSignal `player_id`
2. **Storage**: The `player_id` is saved to the user's `profiles` record
3. **Sending**: Organizers compose messages and select audiences; an edge function:
   - Finds attendees matching the audience criteria
   - Joins to profiles via `attendees.user_id → profiles.user_id`
   - Collects `onesignal_player_id` values and calls OneSignal API

---

## Database Changes

### 1. Add `onesignal_player_id` column to profiles table

```sql
ALTER TABLE public.profiles
ADD COLUMN onesignal_player_id text;
```

### 2. Create push notifications table

```sql
CREATE TABLE public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  redirect_url text,
  audience_type text NOT NULL DEFAULT 'all',
  audience_filter jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for organizers to read/create notifications
```

---

## New Secret Required

**ONESIGNAL_API_KEY** - The OneSignal REST API key for sending push notifications server-side

---

## New Files

### Edge Functions

| Function | Purpose |
|----------|---------|
| `send-push-notification` | Receives notification request, queries attendees→profiles for player IDs, calls OneSignal API, records history |
| `register-push-token` | Receives player_id from client, updates the user's profile record |

### React Components

| File | Purpose |
|------|---------|
| `src/pages/events/manage/PushNotifications.tsx` | Management page with compose form and history |
| `src/hooks/usePushNotifications.ts` | Hook for fetching history and sending notifications |
| `src/hooks/useNativelyPush.ts` | Client hook for push registration with Natively SDK |
| `src/components/events/push/AudienceSelector.tsx` | Radio/checkbox controls for targeting audiences |
| `src/components/events/push/NotificationComposer.tsx` | Title, message, and redirect URL form |
| `src/components/events/push/NotificationHistory.tsx` | List of previously sent notifications |

---

## Modified Files

| File | Changes |
|------|---------|
| `src/components/events/EventsDashboardSidebar.tsx` | Add "Push Notifications" nav item with Bell icon |
| `src/App.tsx` | Add `/events/manage/push` route |
| `supabase/config.toml` | Add function configurations |
| `src/pages/attendee/Dashboard.tsx` | Initialize push registration on app launch |

---

## Audience Targeting Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│ Organizer selects audience → Edge function processes           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Query attendees table with filters:                        │
│     - event_id matches selected event                          │
│     - ticket_type.is_virtual matches in-person/virtual filter  │
│     - specific ticket_type_ids if selected                     │
│     - specific attendee_ids if individual selection            │
│                                                                 │
│  2. Join to profiles via user_id:                              │
│     SELECT p.onesignal_player_id                               │
│     FROM attendees a                                           │
│     JOIN profiles p ON p.user_id = a.user_id                   │
│     WHERE a.event_id = $event_id                               │
│       AND p.onesignal_player_id IS NOT NULL                    │
│       AND [audience filters...]                                │
│                                                                 │
│  3. Send to OneSignal with collected player_ids                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Audience Targeting Options

| Option | Description | Database Filter |
|--------|-------------|-----------------|
| All Attendees | Everyone registered for the event | No additional filter |
| In-Person Only | Physical attendance | `ticket_type.is_virtual = false` |
| Virtual Only | Online attendance | `ticket_type.is_virtual = true` |
| By Ticket Type | Specific ticket type(s) | `ticket_type_id IN (...)` |
| Individual(s) | Specific attendee(s) | `attendee_id IN (...)` |

---

## UI Design

### Compose Notification

```text
┌──────────────────────────────────────────────────────────────┐
│  Push Notifications                                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Compose Notification                                   │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │  Title *                                                │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ Welcome to CLC 2026!                            │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                            32/50 chars │ │
│  │                                                         │ │
│  │  Message *                                              │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ Doors open in 15 minutes. Head to the main     │   │ │
│  │  │ ballroom for the opening keynote!              │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                           78/200 chars │ │
│  │                                                         │ │
│  │  Redirect URL (optional)                                │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ /attendee/app/agenda/keynote-123               │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Select Audience                                        │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │  ◉ All Attendees (125)                                  │ │
│  │  ○ In-Person Only (85)                                  │ │
│  │  ○ Virtual Only (40)                                    │ │
│  │  ○ By Ticket Type                                       │ │
│  │  ○ Individual Attendee(s)                               │ │
│  │                                                         │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │ Will be sent to 125 attendees                     │ │ │
│  │  │ (Only those with notifications enabled)           │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│                              [Cancel]  [Send Notification]   │
└──────────────────────────────────────────────────────────────┘
```

### Notification History

```text
┌──────────────────────────────────────────────────────────────┐
│  Notification History                                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Welcome to CLC 2026!                             Sent   │ │
│  │ Doors open in 15 minutes. Head to the main...          │ │
│  │ All Attendees • 125 recipients • 5 mins ago            │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Lunch is Now Being Served                        Sent   │ │
│  │ Join us in the Grand Foyer for lunch...                │ │
│  │ In-Person Only • 85 recipients • 2 hours ago           │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add `onesignal_player_id` to profiles, create `push_notifications` table |
| `supabase/functions/send-push-notification/index.ts` | Create | Edge function to send via OneSignal API |
| `supabase/functions/register-push-token/index.ts` | Create | Edge function to register player IDs |
| `src/pages/events/manage/PushNotifications.tsx` | Create | Management page |
| `src/hooks/usePushNotifications.ts` | Create | Hook for notification management |
| `src/hooks/useNativelyPush.ts` | Create | Client hook for push registration |
| `src/components/events/push/AudienceSelector.tsx` | Create | Audience targeting component |
| `src/components/events/push/NotificationComposer.tsx` | Create | Compose form component |
| `src/components/events/push/NotificationHistory.tsx` | Create | History list component |
| `src/components/events/EventsDashboardSidebar.tsx` | Modify | Add nav item |
| `src/App.tsx` | Modify | Add route |
| `supabase/config.toml` | Modify | Add function configs |
| `src/pages/attendee/Dashboard.tsx` | Modify | Initialize push registration |

---

## Setup Requirements

Before using push notifications:

1. **OneSignal Account**: Create an app in OneSignal dashboard
2. **Natively Configuration**: Add OneSignal App ID in Natively dashboard
3. **API Key Secret**: Add `ONESIGNAL_API_KEY` secret to the project
4. **User Registration**: Users must have the native app installed and notifications enabled

---

## Technical Notes

- The `onesignal_player_id` on `profiles` enables future LMS/system notifications
- Join path: `attendees.user_id → profiles.user_id` to get player IDs
- Attendees without a linked `user_id` or without `onesignal_player_id` are excluded from notifications
- Character limits: 50 for title, 200 for body (push notification best practices)
- Uses Natively's `NativelyNotifications` class for client-side SDK integration
- Server-side uses OneSignal REST API for reliability
