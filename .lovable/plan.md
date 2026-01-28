
# Reorganize Events Dashboard Navigation

## Overview
Restructure the Events Dashboard sidebar to have Orders and Attendees as top-level menu items, with an event multi-select dropdown to filter data across events rather than navigating to individual event pages.

## Current Structure
```text
Sidebar:
├── Events (list page)
└── Create Event

To view Orders/Attendees:
└── Events list → Click event → Orders/Attendees tabs
```

## New Structure
```text
Sidebar:
├── [Event Selector Dropdown - multi-select]
├── Orders (filtered by selected events)
├── Attendees (filtered by selected events)  
├── Events (manage events list)
└── Create Event
```

## What You'll Get
- Quick access to Orders and Attendees from the sidebar
- Multi-select event filter that persists across pages
- View all orders/attendees at once or filter by specific events
- Cleaner navigation with important data front-and-center

## Implementation Steps

### Step 1: Create Multi-Select Event Dropdown Component
Create `src/components/events/EventSelector.tsx`:
- Popover with checkbox list of all events
- Shows selected event count or "All Events" badge
- Stores selection in React context for sharing across pages
- Clear selection option

### Step 2: Create Event Selection Context
Create `src/contexts/EventSelectionContext.tsx`:
- Holds array of selected event IDs
- Provides `selectedEventIds`, `setSelectedEventIds`, `clearSelection`
- Wraps Events Dashboard layout

### Step 3: Create Top-Level Orders Page
Create `src/pages/events/manage/Orders.tsx`:
- Displays orders from all or selected events
- Reuses existing `OrdersTable` component
- Adds event name column to table
- Export filtered orders to CSV

### Step 4: Create Top-Level Attendees Page
Create `src/pages/events/manage/Attendees.tsx`:
- Displays attendees from all or selected events
- Reuses existing `AttendeesTable` component
- Adds event name column
- Export filtered attendees to CSV

### Step 5: Update Data Hooks
Modify `src/hooks/useOrders.ts`:
- Add `useMultiEventOrders(eventIds: string[] | null)` hook
- Fetch orders for multiple events or all events if null

Modify `src/hooks/useAttendees.ts`:
- Add `useMultiEventAttendees(eventIds: string[] | null)` hook
- Fetch attendees for multiple events or all events if null

### Step 6: Update Sidebar Navigation
Modify `src/components/events/EventsDashboardSidebar.tsx`:
- Add EventSelector dropdown at top
- Add Orders nav item
- Add Attendees nav item
- Keep Events and Create Event items

### Step 7: Add Routes
Update `src/App.tsx`:
- Add `/events/manage/orders` route
- Add `/events/manage/attendees` route

### Step 8: Update EventsDashboardLayout
Wrap with EventSelectionProvider context

## New Files
- `src/components/events/EventSelector.tsx` - Multi-select dropdown
- `src/contexts/EventSelectionContext.tsx` - Selection state management
- `src/pages/events/manage/Orders.tsx` - Top-level orders page
- `src/pages/events/manage/Attendees.tsx` - Top-level attendees page

## Files to Modify
- `src/hooks/useOrders.ts` - Add multi-event query
- `src/hooks/useAttendees.ts` - Add multi-event query
- `src/components/events/EventsDashboardSidebar.tsx` - New nav structure
- `src/components/events/OrdersTable.tsx` - Add event name column
- `src/components/events/AttendeesTable.tsx` - Add event name column
- `src/layouts/EventsDashboardLayout.tsx` - Wrap with context
- `src/App.tsx` - Add new routes

## Navigation Flow
```text
User logs in → Events Dashboard →
  - Sees Event Selector showing "All Events"
  - Clicks Orders → Sees all orders across events
  - Selects specific events from dropdown → Orders/Attendees filter automatically
  - Can still go to Events page to edit individual event settings
```
