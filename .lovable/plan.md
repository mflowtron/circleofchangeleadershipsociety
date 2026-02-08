
# Rename LMS Events to Calendar

## Summary

Rename the database table from `lms_events` to `calendar` and update all references throughout the codebase to reflect the new "Calendar" feature name.

---

## Changes Overview

| Category | Files Affected |
|----------|----------------|
| Database | 1 migration (rename table + update policies) |
| Hook | Rename `useLMSEvents.ts` → `useCalendar.ts` |
| Page | Rename `LMSEvents.tsx` → `Calendar.tsx` |
| Sidebar | Update nav labels from "Events" to "Calendar" |
| Routes | Update path from `/lms/events` to `/lms/calendar` |
| Documentation | Update Data Dictionary |

---

## Technical Details

### 1. Database Migration

Rename the table and update RLS policies:

```sql
-- Rename table
ALTER TABLE public.lms_events RENAME TO calendar;

-- Update triggers
DROP TRIGGER IF EXISTS update_lms_events_updated_at ON public.calendar;
CREATE TRIGGER update_calendar_updated_at 
  BEFORE UPDATE ON public.calendar 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old RLS policies
DROP POLICY IF EXISTS "Active LMS events viewable" ON public.calendar;
DROP POLICY IF EXISTS "Admins view all LMS events" ON public.calendar;
DROP POLICY IF EXISTS "Admins manage LMS events" ON public.calendar;

-- Create new RLS policies with updated names
CREATE POLICY "Active calendar viewable" ON public.calendar 
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Admins view all calendar" ON public.calendar 
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage calendar" ON public.calendar 
  FOR ALL USING (public.is_admin(auth.uid()));
```

### 2. Hook Rename

**File:** `src/hooks/useLMSEvents.ts` → `src/hooks/useCalendar.ts`

- Rename interface `LMSEvent` → `CalendarEvent`
- Rename interface `CreateLMSEventInput` → `CreateCalendarEventInput`
- Rename interface `UpdateLMSEventInput` → `UpdateCalendarEventInput`
- Rename hook `useLMSEvents` → `useCalendar`
- Update query key from `'lms-events'` to `'calendar'`
- Update table reference from `'lms_events'` to `'calendar'`

### 3. Page Rename

**File:** `src/pages/LMSEvents.tsx` → `src/pages/Calendar.tsx`

- Update import from `useLMSEvents` to `useCalendar`
- Update interface references
- Change page title from "Upcoming Events" to "Calendar"
- Update component name from `LMSEvents` to `Calendar`

### 4. Sidebar Navigation

**File:** `src/components/layout/Sidebar.tsx`

Update nav items for all roles:
- Change `path` from `'/lms/events'` to `'/lms/calendar'`
- Change `label` from `'Events'` to `'Calendar'`

### 5. App Router

**File:** `src/App.tsx`

- Update lazy import path
- Update route path from `/lms/events` to `/lms/calendar`

### 6. Documentation Update

**File:** `docs/DATA_DICTIONARY.md`

- Update table name from `lms_events` to `calendar`
- Update policy names

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useCalendar.ts` |
| Create | `src/pages/Calendar.tsx` |
| Delete | `src/hooks/useLMSEvents.ts` |
| Delete | `src/pages/LMSEvents.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/components/layout/Sidebar.tsx` |
| Modify | `docs/DATA_DICTIONARY.md` |
| Database | Rename table and update policies |

---

## Result

After implementation:
- Database table: `calendar`
- Route: `/lms/calendar`
- Navigation label: "Calendar"
- Feature terminology: "Calendar" instead of "Events"

This maintains clear separation between the LMS calendar feature and the separate Event Management module.
