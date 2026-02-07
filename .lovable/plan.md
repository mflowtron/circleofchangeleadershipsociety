

# Add Reusable Error Boundary Component

## Summary

Create a class-based `RouteErrorBoundary` component that catches rendering errors in route-level components and displays a friendly recovery UI. Then wrap all `<Suspense>` boundaries in `App.tsx` with this component using a helper wrapper.

---

## New File: `src/components/ui/error-boundary.tsx`

Create a React class component with:

| Feature | Implementation |
|---------|----------------|
| Error catching | Implement `getDerivedStateFromError` and `componentDidCatch` |
| Error state | `{ hasError: boolean; error: Error \| null }` |
| Reset on navigation | Accept `key` prop from parent (React remounts when key changes) |
| Fallback UI | Centered Card with AlertTriangle icon, heading, error message, two buttons |

### Component Structure

```text
+-----------------------------------------------+
|               RouteErrorBoundary              |
+-----------------------------------------------+
|  Props:                                       |
|    - children: React.ReactNode                |
|    - key: string (for reset on navigation)   |
|                                               |
|  State:                                       |
|    - hasError: boolean                        |
|    - error: Error | null                      |
|                                               |
|  Methods:                                     |
|    - getDerivedStateFromError(error) -> state |
|    - componentDidCatch(error, info) -> log    |
|    - handleRetry() -> setState({ hasError: false }) |
|    - handleGoHome() -> window.location.href = "/" |
+-----------------------------------------------+
```

### Fallback UI Layout

```text
+--------------------------------------------------+
|                    [AlertTriangle Icon]          |
|                                                  |
|              Something went wrong                |
|                                                  |
|    [Muted error.message text, max 200 chars]     |
|                                                  |
|       [Try Again]          [Go Home]             |
+--------------------------------------------------+
```

**Styling:**
- Use existing `Card`, `CardHeader`, `CardContent`, `CardFooter` components
- Use `Button` component (primary for "Try Again", outline for "Go Home")
- Use `AlertTriangle` icon from `lucide-react`
- Center the card on screen with flex layout
- Use `text-muted-foreground` for the error message

### Exports

- Named export: `RouteErrorBoundary`
- Default export: `RouteErrorBoundary`

---

## File Modification: `src/App.tsx`

### Step 1: Add Import

Add to imports (around line 8):
```typescript
import { useLocation } from "react-router-dom";
import RouteErrorBoundary from "@/components/ui/error-boundary";
```

### Step 2: Create Helper Component

Add after `PageLoader` function (around line 88):

```typescript
function SuspenseWithErrorBoundary({ children }: { children: React.ReactNode }) {
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

### Step 3: Replace All Suspense Wrappers

Replace every occurrence of:
```jsx
<Suspense fallback={<PageLoader />}>
  <SomePage />
</Suspense>
```

With:
```jsx
<SuspenseWithErrorBoundary>
  <SomePage />
</SuspenseWithErrorBoundary>
```

### Suspense Locations to Update (36 total occurrences)

| Line Range | Route/Context |
|------------|---------------|
| 117-119 | `ProtectedRoute` with `useEventsLayout` |
| 149-151 | `/pending-approval` |
| 157-159 | `/` (RootRouter) |
| 164-166 | `/select-dashboard` |
| 172-174 | `/lms` (Feed) |
| 179-181 | `/lms/recordings` |
| 186-188 | `/lms/profile/:userId` |
| 193-195 | `/lms/profile` |
| 204-206 | `/lms/my-chapter` |
| 216-218 | `/lms/admin/users` |
| 226-228 | `/lms/admin/chapters` |
| 236-238 | `/lms/admin/moderation` |
| 246-248 | `/lms/admin/announcements` |
| 256-258 | `/lms/events` |
| 266-268 | `/lms/admin` |
| 277-279 | `/events` |
| 282-284 | `/events/:slug` |
| 287-289 | `/events/:slug/checkout` |
| 291-294 | `/events/:slug/checkout/success` |
| 297-299 | `/events/:slug/order/:orderId/attendees` |
| 304-306 | `/my-orders` |
| 309-311 | `/my-orders/dashboard` |
| 316-318 | `/attendee` |
| 321-323 | `/attendee/app` (AttendeeDashboard) |
| 327-329 | `/attendee/app/home` |
| 332-334 | `/attendee/app/agenda` |
| 337-339 | `/attendee/app/messages` |
| 342-344 | `/attendee/app/messages/:conversationId` |
| 347-349 | `/attendee/app/networking` |
| 352-354 | `/attendee/app/profile` |
| 357-359 | `/attendee/app/bookmarks` |
| 362-364 | `/attendee/app/qr` |
| 372-374 | `/events/manage` (and all other manage routes) |
| ... | All `/events/manage/*` routes (12 total) |

---

## Technical Notes

1. **Why class component?** React error boundaries require `getDerivedStateFromError` or `componentDidCatch` lifecycle methods, which are only available in class components. There is no hooks-based equivalent.

2. **Why `window.location.href` instead of `useNavigate`?** When an error crashes a component tree, the router itself might be part of the crashed tree. Using `window.location.href` is a safe escape hatch that guarantees navigation even if React state is corrupted.

3. **Why key-based reset?** When `location.pathname` changes, the `key` prop changes, causing React to unmount and remount the error boundary. This automatically clears the error state without needing `componentDidUpdate` logic.

4. **Error message truncation:** Display only the first 200 characters of the error message to prevent layout issues with very long error messages.

5. **No new dependencies:** Uses only built-in React APIs and existing shadcn/ui components (Card, Button) and lucide-react icons.

---

## Summary

| Action | Count |
|--------|-------|
| New files | 1 (`error-boundary.tsx`) |
| Modified files | 1 (`App.tsx`) |
| Suspense wrappers to update | 36 |
| New dependencies | 0 |

This adds resilient error handling at the route level, ensuring that if a page component throws an error during render, users see a friendly UI with recovery options rather than a blank white screen.

