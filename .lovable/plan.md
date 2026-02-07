

# Rename "Schedule" to "Bookmarks" in Attendee App

## Overview

Rename all user-facing instances of "Schedule" to "Bookmarks" in the attendee app, including the navigation, page title, file names, and related text. This change affects the attendee-specific bookmarked sessions feature only - it does not affect the public-facing event "Schedule" sections which should remain as-is.

---

## Files to Change

| File | Type of Change |
|------|----------------|
| `src/components/attendee/BottomNavigation.tsx` | Update nav label and route path |
| `src/pages/attendee/Dashboard.tsx` | Update route title mapping |
| `src/pages/attendee/EventHome.tsx` | Update link and card label |
| `src/pages/attendee/MySchedule.tsx` | Rename file to `MyBookmarks.tsx`, update component name and text |
| `src/components/attendee/BookmarkButton.tsx` | Update aria-label text |
| `src/App.tsx` | Update import, variable name, and route path |

---

## Detailed Changes

### 1. `src/components/attendee/BottomNavigation.tsx`

Update the navigation item:
```tsx
// Before
{ path: '/attendee/app/schedule', label: 'Schedule', icon: Bookmark },

// After
{ path: '/attendee/app/bookmarks', label: 'Bookmarks', icon: Bookmark },
```

### 2. `src/pages/attendee/Dashboard.tsx`

Update the title mapping:
```tsx
// Before
if (location.pathname.includes('/schedule')) return 'My Schedule';

// After
if (location.pathname.includes('/bookmarks')) return 'Bookmarks';
```

### 3. `src/pages/attendee/EventHome.tsx`

Update the quick action card:
```tsx
// Before
<Link to="/attendee/app/schedule">
  ...
  <span className="text-sm font-medium">My Schedule</span>

// After
<Link to="/attendee/app/bookmarks">
  ...
  <span className="text-sm font-medium">My Bookmarks</span>
```

### 4. Rename `src/pages/attendee/MySchedule.tsx` to `src/pages/attendee/MyBookmarks.tsx`

Update content within the file:
```tsx
// Component name
export default function MyBookmarks() { ... }

// Empty state text
<p className="text-muted-foreground max-w-xs mb-6">
  Bookmark sessions from the agenda to view them here.
</p>
```

### 5. `src/components/attendee/BookmarkButton.tsx`

Update the aria-label for better accessibility:
```tsx
// Before
aria-label={isBookmarked ? 'Remove from schedule' : 'Add to schedule'}

// After
aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
```

### 6. `src/App.tsx`

Update imports and route:
```tsx
// Before
const AttendeeSchedule = lazy(() => import("@/pages/attendee/MySchedule"));
...
<Route path="schedule" element={
  <Suspense fallback={<PageLoader />}>
    <AttendeeSchedule />
  </Suspense>
} />

// After
const AttendeeBookmarks = lazy(() => import("@/pages/attendee/MyBookmarks"));
...
<Route path="bookmarks" element={
  <Suspense fallback={<PageLoader />}>
    <AttendeeBookmarks />
  </Suspense>
} />
```

---

## Unchanged Files

The following files contain "schedule" references that should **NOT** be changed because they refer to the public-facing event schedule (not the attendee's personal bookmarks):

| File | Reason to Keep |
|------|----------------|
| `src/components/events/agenda/AgendaPublicView.tsx` | "Schedule" header for public event page |
| `src/pages/events/EventDetail.tsx` | "Schedule" section for public event detail |
| `src/pages/events/manage/Agenda.tsx` | Admin copy about building "event schedule" |
| `src/pages/LMSEvents.tsx` | "scheduled meetings" refers to event timing |
| `src/components/events/agenda/AgendaBuilder.tsx` | Admin copy about "event schedule" |

---

## Summary

This change updates 6 files to rename the attendee "Schedule" feature to "Bookmarks", including renaming the page file itself. The route will change from `/attendee/app/schedule` to `/attendee/app/bookmarks`.

