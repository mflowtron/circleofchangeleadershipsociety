

# Separate Events Dashboard from LMS Dashboard

## Overview
Create a completely independent Events Dashboard with its own layout, navigation, and branding - separate from the Circle of Change Society LMS. Users with access to both dashboards will see a selection screen after login to choose which dashboard to enter.

## Current State
- The LMS uses `AppLayout` with a sidebar containing navigation
- Event management pages currently use the same `AppLayout`
- Public event pages use `EventsLayout` (simpler, no sidebar)
- Roles: `admin`, `advisor`, `student`, `event_organizer`
- Admins and event_organizers can manage events

## What You'll Get
- A dedicated Events Dashboard with its own header, navigation, and styling
- A dashboard selector page shown after login for users with dual access
- Clean separation between LMS and Events functionality
- Persistent dashboard preference (remembered for convenience)

## Implementation Steps

### Step 1: Create Events Dashboard Layout
Create `src/layouts/EventsDashboardLayout.tsx`:
- Header with Events branding and navigation
- Sidebar with event management menu (Events list, Create Event, Analytics)
- Different color scheme/branding to distinguish from LMS
- Links: Dashboard, Events, Orders overview
- Sign out and "Switch to LMS" option for users with LMS access

### Step 2: Create Dashboard Selector Page
Create `src/pages/DashboardSelector.tsx`:
- Shown after successful login for users with access to both dashboards
- Two cards: "LMS Dashboard" and "Events Dashboard"
- Each card shows description and role-appropriate access
- "Remember my choice" checkbox option
- Stores preference in localStorage

### Step 3: Create Auth Context Enhancement
Update `src/contexts/AuthContext.tsx`:
- Add helper to check if user has LMS access (admin, advisor, student roles)
- Add helper to check if user has Events access (admin, event_organizer roles)
- Add `hasDualAccess` computed property

### Step 4: Update Event Management Pages
Modify all pages in `src/pages/events/manage/`:
- `Index.tsx` - Use EventsDashboardLayout instead of AppLayout
- `NewEvent.tsx` - Use EventsDashboardLayout
- `EditEvent.tsx` - Use EventsDashboardLayout
- `ManageTickets.tsx` - Use EventsDashboardLayout
- `EventOrders.tsx` - Use EventsDashboardLayout

### Step 5: Update Routing Logic
Modify `src/App.tsx`:
- Add DashboardSelector route
- Redirect users with dual access to selector after login (if no preference saved)
- Update ProtectedRoute to handle dashboard context
- Keep event_organizer-only users going directly to Events Dashboard
- Keep LMS-only users going directly to LMS

### Step 6: Update Sidebar Navigation
Modify `src/components/layout/Sidebar.tsx`:
- Remove Events link from admin navigation (they'll access via Events Dashboard)
- Add "Switch to Events Dashboard" link for admins
- Clean separation of concerns

## Technical Details

**New files to create:**
- `src/layouts/EventsDashboardLayout.tsx` - Complete events dashboard layout
- `src/components/events/EventsDashboardSidebar.tsx` - Events-specific sidebar
- `src/components/events/EventsDashboardHeader.tsx` - Events-specific header
- `src/pages/DashboardSelector.tsx` - Dashboard selection page

**Files to modify:**
- `src/contexts/AuthContext.tsx` - Add access helpers
- `src/App.tsx` - Update routing
- `src/pages/events/manage/Index.tsx` - Use new layout
- `src/pages/events/manage/NewEvent.tsx` - Use new layout
- `src/pages/events/manage/EditEvent.tsx` - Use new layout
- `src/pages/events/manage/ManageTickets.tsx` - Use new layout
- `src/pages/events/manage/EventOrders.tsx` - Use new layout
- `src/components/layout/Sidebar.tsx` - Remove Events from LMS sidebar

**Access Logic:**
```text
LMS Access: admin, advisor, student
Events Access: admin, event_organizer
Dual Access: admin (has both roles implicitly)
```

**Dashboard Selector Flow:**
```text
Login -> Check roles -> 
  If only LMS roles -> Go to LMS (/)
  If only event_organizer -> Go to Events Dashboard (/events/manage)
  If dual access (admin) -> Check localStorage preference ->
    If preference set -> Go to preferred dashboard
    If no preference -> Show Dashboard Selector
```

