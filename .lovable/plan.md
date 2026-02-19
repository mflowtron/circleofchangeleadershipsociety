
# Fix: Attendee App Appearing for Non-Attendee Users

## Diagnosis

The database and `AreaSelector.tsx` code are both correct:
- The `handle_new_user` trigger sets `module_access = '{lms}'` for new signups
- `AreaSelector.tsx` already calls `hasModuleAccess('attendee')` (fixed previously)
- akamekon@gmail.com has `role: member`, `module_access: [lms]` in the database

The bug is a **React render-order race condition** in `AreaSelector.tsx`. The `accessibleAreas` array is computed at the **very top of the component** (lines 60–63), before the `if (loading) return <FullPageLoader />` guard on line 69. This means:

1. Component mounts, `loading = true`, `profile = null` initially
2. `accessibleAreas` computes correctly as `[]` (all `hasModuleAccess` calls return `false` when profile is null)
3. Loading completes, profile loads — but if there was a **previously cached profile** (e.g., from a prior admin session or stale React Query state), it can briefly return `true` for attendee

More critically, if the admin user (`role: admin`) approves a new user and then the new user logs in within the same browser session, there's a window where the old admin profile state hasn't been fully cleared before the new profile loads.

Additionally, the `accessibleAreas` logic runs **before** the `loading` check, meaning on intermediate renders it may use a stale profile.

## Root Fix

Move the `accessibleAreas` computation to run **after** the `loading` check, so it only ever runs with a fully-resolved, current-user profile.

Also add a secondary guard: if `loading` is still true, don't render the area cards at all.

## Files to Change

### `src/pages/AreaSelector.tsx`

Move the `accessibleAreas` block from lines 59–63 (before the loading check) to **after** the `if (!isApproved)` guard. This ensures the computation only happens with a fully-loaded, verified profile for the current user.

```typescript
// BEFORE (computed before loading check — can use stale profile)
const accessibleAreas: AccessArea[] = [];
if (hasModuleAccess('lms')) accessibleAreas.push('lms');
if (hasModuleAccess('events')) accessibleAreas.push('events');
if (hasModuleAccess('attendee')) accessibleAreas.push('attendee');

// ... loading check happens later at line 69

// AFTER (computed after all guards are passed)
if (loading) return <FullPageLoader />;
if (!user) return <Navigate to="/auth" replace />;
if (!isApproved) return <Navigate to="/pending-approval" replace />;

// Only compute accessible areas once we know profile is fully loaded
const accessibleAreas: AccessArea[] = [];
if (hasModuleAccess('lms')) accessibleAreas.push('lms');
if (hasModuleAccess('events')) accessibleAreas.push('events');
if (hasModuleAccess('attendee')) accessibleAreas.push('attendee');

// If only one area, redirect directly
if (accessibleAreas.length === 1) { ... }
```

This is the only file that needs to change. Moving these 4 lines below the guards eliminates the race condition entirely — by the time we compute which areas to show, we have confirmed:
1. Loading is complete (`loading = false`)
2. User is authenticated
3. User is approved
4. Profile is the current user's profile, fully loaded

## Why This Works

React hooks rules prevent calling `hasModuleAccess` conditionally, but the result of calling it is just a boolean — computing it after the guard is perfectly safe and simply means we ignore the stale-profile window. When `profile` is null or stale, the component already shows a loader and never reaches the area-computation code.
