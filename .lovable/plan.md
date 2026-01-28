

# LMS Scheduled Events Feature Plan

## Overview
Add a new "Upcoming Events" section within the LMS that allows admins to create and manage scheduled events (typically Zoom meetings). All users can view upcoming events and add them to their personal calendar.

This is separate from the existing public ticketed events system - these are internal LMS events for members only.

---

## How It Works

### Admin Experience
1. Admins see a new "Events" link in the LMS sidebar
2. The page displays a list of upcoming scheduled events with create/edit/delete capabilities
3. When creating an event, admin provides:
   - Title
   - Description (optional)
   - Start date/time
   - End date/time (optional)
   - Meeting link (e.g., Zoom URL)
   - Whether it's active/published

### User Experience
1. All approved users can access the Events page
2. View a list of upcoming events in a card layout
3. Click "Add to Calendar" button to download an `.ics` file that works with:
   - Google Calendar
   - Apple Calendar
   - Outlook
   - Any calendar app that supports iCalendar format

---

## Changes Summary

### Database Changes

**New table: `lms_events`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Event title |
| description | text | Optional description |
| starts_at | timestamptz | Event start time |
| ends_at | timestamptz | Optional end time |
| meeting_link | text | Zoom/meeting URL |
| is_active | boolean | Whether event is visible |
| created_by | uuid | Admin who created it |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**RLS Policies:**
- All authenticated & approved users can SELECT active events
- Admins can INSERT, UPDATE, DELETE events

### Frontend Changes

**New Page: `src/pages/LMSEvents.tsx`**
- Tabbed interface similar to existing patterns:
  - **"Upcoming Events" tab**: Grid of event cards (visible to all roles)
  - **"Manage Events" tab**: Admin-only table with create/edit/delete
- Event cards show title, description preview, date/time, and meeting link
- "Add to Calendar" button generates and downloads `.ics` file

**New Hook: `src/hooks/useLMSEvents.ts`**
- Fetch active events (for all users)
- Fetch all events (for admins)
- Create, update, delete events (admin only)
- Uses React Query for caching and optimistic updates

**New Utility: `src/lib/calendarUtils.ts`**
- `generateICSFile()` function to create iCalendar format content
- `downloadICS()` function to trigger file download

**Sidebar Update: `src/components/layout/Sidebar.tsx`**
- Add "Events" nav item for all roles (student, advisor, admin)
- Uses `CalendarDays` icon from Lucide

**Routing Update: `src/App.tsx`**
- Add `/lms-events` route accessible to all approved users

---

## Technical Details

### Database Migration

```sql
CREATE TABLE public.lms_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  meeting_link text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lms_events ENABLE ROW LEVEL SECURITY;

-- Anyone approved can view active events
CREATE POLICY "Approved users can view active lms_events"
ON public.lms_events FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND public.is_user_approved(auth.uid())
);

-- Admins can view all events
CREATE POLICY "Admins can view all lms_events"
ON public.lms_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage events
CREATE POLICY "Admins can insert lms_events"
ON public.lms_events FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lms_events"
ON public.lms_events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lms_events"
ON public.lms_events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### ICS File Generation

```typescript
// src/lib/calendarUtils.ts
export function generateICSContent(event: {
  title: string;
  description?: string;
  startsAt: Date;
  endsAt?: Date;
  meetingLink?: string;
}): string {
  const formatDate = (date: Date) => 
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const endDate = event.endsAt || new Date(event.startsAt.getTime() + 60 * 60 * 1000);
  
  let description = event.description || '';
  if (event.meetingLink) {
    description += `\\n\\nJoin Meeting: ${event.meetingLink}`;
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Circle of Change//LMS Events//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(event.startsAt)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    event.meetingLink ? `URL:${event.meetingLink}` : '',
    `UID:${crypto.randomUUID()}@coclc.com`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

export function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Event Card Component

Each event card will display:
- Event title (with calendar icon)
- Date and time formatted nicely (e.g., "Tue, Feb 4 · 2:00 PM")
- Description preview (2-line clamp)
- "Join Meeting" button (opens Zoom link)
- "Add to Calendar" button (downloads .ics file)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create - New `lms_events` table with RLS |
| `src/lib/calendarUtils.ts` | Create - ICS file generation utilities |
| `src/hooks/useLMSEvents.ts` | Create - Data fetching hook |
| `src/pages/LMSEvents.tsx` | Create - Main events page with tabs |
| `src/components/layout/Sidebar.tsx` | Modify - Add Events nav item |
| `src/App.tsx` | Modify - Add `/lms-events` route |

---

## User Interface Preview

**Event Card Layout:**
```
┌─────────────────────────────────────────┐
│  📅 Weekly Leadership Call              │
│  Tue, Feb 4 · 2:00 PM - 3:00 PM        │
│                                         │
│  Join us for our weekly check-in and   │
│  discussion of current projects...      │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ Join Meeting │  │ Add to Calendar │ │
│  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────┘
```

**Admin Management Table:**
- Event title
- Date/time
- Status badge (Active/Inactive)
- Actions: Edit, Delete

