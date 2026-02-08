
# Remove Event Checkin Login Page and Consolidate Authentication

## Overview
This plan removes the separate "Event Check-In" login page (`/attendee`) and the "Order Portal" login page (`/my-orders`), consolidating all authentication through the main `/auth` page. Both the Attendee App and Order Portal currently use magic link (OTP) authentication through Supabase, which is the same underlying system as the main auth.

## Current State Analysis

### Separate Login Pages to Remove
1. **Attendee Login** (`/attendee` → `src/pages/attendee/Index.tsx`)
   - Title: "Event Check-In"
   - Uses magic link via `useOrderPortal` hook
   - Redirects to `/attendee/app/home` after login

2. **Order Portal Login** (`/my-orders` → `src/pages/orders/Index.tsx`)
   - Title: "Manage Your Orders"  
   - Uses magic link via `useOrderPortal` hook
   - Redirects to `/my-orders/dashboard` after login

### Authentication System
- Both pages use `useOrderPortal` hook for magic link auth
- The magic link redirects to `/my-orders/dashboard`
- Both share the same Supabase auth session as the main `/auth` page

## Solution

Since all authentication now goes through the main `/auth` page (which uses standard email/password), we need to:

1. **Remove the separate login pages** - Delete the magic link login pages
2. **Update route redirects** - Unauthenticated users go to `/auth` instead of separate login pages
3. **Remove magic link functionality** - The `sendMagicLink` function in `useOrderPortal` is no longer needed
4. **Clean up related context/hooks** - Remove `AttendeeAuthContext` wrapper that exposes `sendMagicLink`
5. **Update dashboard pages** - Redirect to `/auth` instead of their respective login pages

---

## Technical Changes

### 1. Delete Files (2 files)
- `src/pages/attendee/Index.tsx` - Attendee magic link login page
- `src/pages/orders/Index.tsx` - Order portal magic link login page

### 2. Update Routes in `src/App.tsx`
Remove the following routes:
- `/attendee` route (line 329-333)
- `/my-orders` route (line 317-321)

Remove the lazy imports:
- `OrderPortalIndex` (line 57)
- `AttendeeLogin` (line 61)

### 3. Update `src/hooks/useOrderPortal.ts`
Remove the `sendMagicLink` function - it's no longer needed since authentication happens through the main auth page.

### 4. Update `src/contexts/AttendeeAuthContext.tsx`
Remove the `sendMagicLink` property from the context interface and value since it's no longer used.

### 5. Update `src/contexts/AttendeeContext.tsx`
Remove the `sendMagicLink` export from the compatibility layer.

### 6. Update `src/pages/attendee/Dashboard.tsx`
Change the redirect for unauthenticated users from `/attendee` to `/auth`:
```tsx
// Line 41: Change redirect destination
return <Navigate to="/auth" state={{ from: location }} replace />;
```

### 7. Update `src/pages/orders/Dashboard.tsx`
- Change redirect for unauthenticated users from `/my-orders` to `/auth` (line 16)
- Remove the link to `/attendee` since that route no longer exists (line 39-44)
- Update logout to redirect to `/auth` instead of `/my-orders` (line 22)

### 8. Update `src/components/orders/OrderCard.tsx`
Remove or update the "Open Event App" link that points to `/attendee` (lines 100-109). Should link to `/attendee/app/home` directly instead.

### 9. Update `src/utils/nativelyCache.ts`
Remove `/attendee` from the critical routes list (line 30).

### 10. Cleanup Check - Verify No Other References
Search for any remaining references to:
- `/attendee"` (should only be `/attendee/app/*` routes)
- `/my-orders"` (should only be `/my-orders/dashboard`)
- `sendMagicLink`

## Files Modified Summary
| File | Action |
|------|--------|
| `src/pages/attendee/Index.tsx` | DELETE |
| `src/pages/orders/Index.tsx` | DELETE |
| `src/App.tsx` | Remove routes and imports |
| `src/hooks/useOrderPortal.ts` | Remove `sendMagicLink` function |
| `src/contexts/AttendeeAuthContext.tsx` | Remove `sendMagicLink` from interface |
| `src/contexts/AttendeeContext.tsx` | Remove `sendMagicLink` export |
| `src/pages/attendee/Dashboard.tsx` | Redirect to `/auth` |
| `src/pages/orders/Dashboard.tsx` | Redirect to `/auth`, remove Event App link |
| `src/components/orders/OrderCard.tsx` | Update Event App link |
| `src/utils/nativelyCache.ts` | Remove `/attendee` from cache list |

## Post-Implementation Verification
1. Verify `/attendee/app/*` routes still work for authenticated users
2. Verify `/my-orders/dashboard` still works for authenticated users
3. Verify unauthenticated users are redirected to `/auth`
4. Confirm no TypeScript errors after removing `sendMagicLink`
5. Test that logout redirects to `/auth`
