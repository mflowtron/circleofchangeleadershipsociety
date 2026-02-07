
# Fix Event Selector Persistence

## Problem

When you select an event from the EventSelector dropdown and then navigate to a sidebar item like Agenda or Speakers, the selection resets to "Select an event...". This happens because:

1. Each protected route creates a new instance of `EventsDashboardLayout`
2. The `EventSelectionProvider` lives inside `EventsDashboardLayout`
3. When navigating, the layout remounts, resetting the context state

## Solution

Move the `EventSelectionProvider` to a higher level in the component tree so it persists across route changes. The provider should wrap all Events Dashboard routes rather than being inside the layout.

---

## Implementation

### Step 1: Remove Provider from EventsDashboardLayout

Update `src/layouts/EventsDashboardLayout.tsx` to remove the `EventSelectionProvider` wrapper from the return statement. The layout will now just render the sidebar, header, and children directly.

### Step 2: Create Events Route Wrapper in App.tsx

Create a wrapper component that provides the `EventSelectionProvider` context for all `/events/manage/*` routes:

```text
function EventsManagementWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EventSelectionProvider>
      {children}
    </EventSelectionProvider>
  );
}
```

### Step 3: Wrap Events Routes with Provider

In `App.tsx`, wrap the events management routes section with `EventsManagementWrapper` so the context persists across all child routes:

```text
<Route element={<EventsManagementWrapper />}>
  <Route path="/events/manage" ... />
  <Route path="/events/manage/orders" ... />
  <Route path="/events/manage/agenda" ... />
  ...
</Route>
```

Using React Router's nested routes with an `element` that renders an `<Outlet />` will preserve the provider across all child routes.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/layouts/EventsDashboardLayout.tsx` | Remove `EventSelectionProvider` wrapper |
| `src/App.tsx` | Add `EventsManagementWrapper` and restructure routes |

---

## Result

After this change:
- Selecting an event will persist when navigating between Agenda, Speakers, Orders, etc.
- The provider only mounts once when entering the events management area
- Selection will reset when leaving `/events/manage/*` routes (expected behavior)
