

# Fix Attendee App Tab Switching Performance

## Problem

When switching between tabs in the Attendee app (Home, Agenda, Messages, Bookmarks, QR), the entire page appears to reload with loading skeletons, creating a jarring user experience.

## Root Causes

After exploring the codebase, I identified **two issues** causing the reload waterfalls:

### 1. SuspenseWithErrorBoundary Key Prop

In `App.tsx`, the `SuspenseWithErrorBoundary` component uses `key={location.pathname}`:

```typescript
function SuspenseWithErrorBoundary({ children }) {
  const location = useLocation();
  return (
    <RouteErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}
```

This causes the entire Suspense boundary and all its children to **unmount and remount** whenever the URL changes. Every tab switch triggers a fresh lazy load and new component mount.

### 2. Each Child Route Wrapped in SuspenseWithErrorBoundary

Each attendee child route is individually wrapped:

```text
<Route path="home" element={
  <SuspenseWithErrorBoundary>    <-- Remounts on path change
    <AttendeeHome />
  </SuspenseWithErrorBoundary>
} />
<Route path="agenda" element={
  <SuspenseWithErrorBoundary>    <-- Also remounts
    <AttendeeAgenda />
  </SuspenseWithErrorBoundary>
} />
```

Combined with the key prop issue, this causes each tab switch to:
1. Unmount the previous component
2. Show the loading fallback
3. Re-fetch lazy loaded code
4. Re-run all useEffect hooks (triggering data fetches)

---

## Solution

### Step 1: Remove Key Prop from Error Boundary

Remove the `key={location.pathname}` from `SuspenseWithErrorBoundary`. The error boundary can reset itself via other means (like a retry button).

### Step 2: Remove Individual Suspense Wrappers from Child Routes

Since the parent route (`AttendeeDashboard`) already handles auth loading states and the pages handle their own loading states via React Query, the individual Suspense boundaries on child routes are unnecessary.

Remove `SuspenseWithErrorBoundary` wrappers from all `/attendee/app/*` child routes. The parent's Suspense boundary is sufficient for the initial lazy load.

### Step 3: Preload Adjacent Tabs (Optional Enhancement)

To make navigation even snappier, preload sibling tab components when the user lands on a tab. This can be done by importing the lazy modules eagerly after initial render.

---

## Implementation Details

### Changes to App.tsx

| Location | Change |
|----------|--------|
| `SuspenseWithErrorBoundary` | Remove `key={location.pathname}` from the error boundary |
| Attendee child routes | Remove individual `SuspenseWithErrorBoundary` wrappers |

### Before (current structure):

```text
<Route path="/attendee/app" element={<SuspenseWithErrorBoundary><AttendeeDashboard /></SuspenseWithErrorBoundary>}>
  <Route path="home" element={<SuspenseWithErrorBoundary><AttendeeHome /></SuspenseWithErrorBoundary>} />
  <Route path="agenda" element={<SuspenseWithErrorBoundary><AttendeeAgenda /></SuspenseWithErrorBoundary>} />
  ...
</Route>
```

### After (optimized structure):

```text
<Route path="/attendee/app" element={<SuspenseWithErrorBoundary><AttendeeDashboard /></SuspenseWithErrorBoundary>}>
  <Route path="home" element={<AttendeeHome />} />
  <Route path="agenda" element={<AttendeeAgenda />} />
  ...
</Route>
```

---

## Technical Considerations

### Why This Works

1. **Lazy loading still works**: The components remain lazy-loaded. The first time a tab is visited, it loads the chunk. Subsequent visits use the cached chunk.

2. **Data fetching is unaffected**: React Query caches data. Components use `useAgendaItems`, `useBookmarks`, etc. which return cached data instantly on remount.

3. **Error boundaries still work**: Errors in child routes bubble up to the parent's error boundary. Each page can optionally have its own error handling.

4. **Context is preserved**: The `AttendeeProviders` (auth, events, bookmarks, conversations) stay mounted at the Dashboard level, so state persists across tab switches.

### What About Error Boundary Reset?

The original `key={location.pathname}` was intended to reset error boundaries on navigation. Instead:

- The error boundary's "Try Again" button already resets state
- Navigation away from an errored route naturally unmounts that component
- If needed, a custom reset mechanism can be added later

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Remove key prop and unwrap child routes |

---

## Expected Result

After this change:

- Switching tabs will be nearly instant (no loading skeleton flash)
- Cached data displays immediately
- Lazy chunks load once and stay cached
- The overall navigation feels native and smooth

