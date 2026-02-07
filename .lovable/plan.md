
# Add Agenda Item Detail Page

## Overview

Tapping an agenda item card will navigate to a dedicated detail page instead of expanding inline. The detail page will show the full session information in a mobile-optimized layout.

---

## Changes

### 1. Create New Detail Page

**File: `src/pages/attendee/AgendaDetail.tsx`**

A full-screen detail page displaying:
- Header with back button and session title
- Time, date, and location info
- Track badge (if applicable)
- Full description text
- Speaker cards with photos, names, titles, companies, and roles
- Bookmark button in the header

The page will:
- Fetch the agenda item from the existing React Query cache (via `useAgendaItems`)
- Use the same full-screen pattern as the Conversation page
- Include safe area insets for notched devices

### 2. Add Route

**File: `src/App.tsx`**

Add a new child route under `/attendee/app`:

| Path | Component |
|------|-----------|
| `/attendee/app/agenda/:itemId` | `AttendeeAgendaDetail` |

### 3. Update Dashboard to Bypass Layout

**File: `src/pages/attendee/Dashboard.tsx`**

Extend the existing full-screen detection logic to also match agenda detail pages:

```text
Current:  /messages/:conversationId
Add:      /agenda/:itemId
```

Both patterns will render the `<Outlet />` directly without the `AttendeeLayout` wrapper.

### 4. Update AgendaItemCard to Navigate

**File: `src/components/attendee/AgendaItemCard.tsx`**

- Replace the `onToggleExpand` click handler with navigation to `/attendee/app/agenda/:itemId`
- Remove the `isExpanded` and `onToggleExpand` props (no longer needed)
- Keep the bookmark button with its click handler (using `stopPropagation`)

### 5. Update Agenda Page

**File: `src/pages/attendee/Agenda.tsx`**

- Remove `expandedItemId` state and related logic
- Pass only the navigation props to `AgendaItemCard`

### 6. Update MyBookmarks Page

**File: `src/pages/attendee/MyBookmarks.tsx`**

- Remove `expandedItemId` state and related logic
- Pass only the navigation props to `AgendaItemCard`

### 7. Preload Detail Page

**File: `src/pages/attendee/Dashboard.tsx`**

Add the new detail page to the preload list for instant navigation.

---

## Detail Page Layout

```text
+------------------------------------------+
| [<-]  Session Title              [★]     |  <- Header with back + bookmark
+------------------------------------------+
|                                          |
|  📅 Friday, March 14                     |
|  🕐 9:00 AM - 10:30 AM                   |
|  📍 Ballroom A                           |
|  [Track Badge]                           |
|                                          |
+------------------------------------------+
|                                          |
|  Full description text goes here with    |
|  support for longer content that wraps   |
|  across multiple lines...                |
|                                          |
+------------------------------------------+
|  SPEAKERS                                |
|  +------------------------------------+  |
|  | [Photo]  Name                      |  |
|  |          Title · Company           |  |
|  |          (Moderator)               |  |
|  +------------------------------------+  |
|  | [Photo]  Name                      |  |
|  |          Title · Company           |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

## Technical Details

### Data Fetching Strategy

No additional API calls needed. The detail page will:
1. Get the event ID from `useAttendee().selectedEvent`
2. Call `useAgendaItems(eventId)` which returns cached data
3. Find the item by ID from the cached array

This ensures instant page loads since data is already cached from the Agenda list.

### Props Changes

**AgendaItemCard** - Remove:
- `isExpanded?: boolean`
- `onToggleExpand?: () => void`

**AgendaItemCard** - Keep all other props for the card display.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/attendee/AgendaDetail.tsx` | Session detail page component |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add route for agenda detail |
| `src/pages/attendee/Dashboard.tsx` | Bypass layout for detail page, add preload |
| `src/components/attendee/AgendaItemCard.tsx` | Navigate on tap instead of expand |
| `src/pages/attendee/Agenda.tsx` | Remove expand state |
| `src/pages/attendee/MyBookmarks.tsx` | Remove expand state |

---

## Expected Result

- Tapping an agenda item navigates to a full-screen detail page
- Back button returns to the agenda list
- Bookmark button works on the detail page
- Navigation is instant due to cached data
- Detail page has proper safe area handling for notched devices
