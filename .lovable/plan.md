
# Fix: Attendee App Should Only Show for Users with Attendee Records

## Problem

The Area Selector and Root Router both assume the Attendee App is **always accessible** to every authenticated user. This means new signups who have no attendee record or event tickets still see the Attendee App as an option on the dashboard selector.

## Root Cause

Two hardcoded assumptions:

1. **`AreaSelector.tsx` line 63-64**: `accessibleAreas.push('attendee')` is unconditional -- always added.
2. **`RootRouter.tsx` line 64**: `accessCount` always adds `+1` for attendee.

## Solution

Use the existing `hasModuleAccess('attendee')` check (which reads from `profile.module_access`) instead of always including the attendee area. Admins already get access to everything via the `profile.role === 'admin'` check in `hasModuleAccess`.

### Files to Change

**1. `src/pages/AreaSelector.tsx`**

Replace the unconditional attendee push:

```typescript
// Before (line 63-64)
// Attendee access is always available for now
accessibleAreas.push('attendee');

// After
if (hasModuleAccess('attendee')) accessibleAreas.push('attendee');
```

**2. `src/pages/RootRouter.tsx`**

Use `hasModuleAccess('attendee')` in the access count and fallback logic:

```typescript
// Before (lines 59-64)
const hasLMS = hasModuleAccess('lms');
const hasEvents = hasModuleAccess('events');
const accessCount = (hasLMS ? 1 : 0) + (hasEvents ? 1 : 0) + 1; // +1 for attendee (always available)

// After
const hasLMS = hasModuleAccess('lms');
const hasEvents = hasModuleAccess('events');
const hasAttendee = hasModuleAccess('attendee');
const accessCount = (hasLMS ? 1 : 0) + (hasEvents ? 1 : 0) + (hasAttendee ? 1 : 0);
```

Also update the fallback at the bottom (lines 72-82) to handle the case where a user has zero accessible areas:

```typescript
// Single area - go directly
if (hasLMS) {
  navigate('/lms', { replace: true });
} else if (hasEvents) {
  navigate('/events/manage', { replace: true });
} else if (hasAttendee) {
  navigate('/attendee/app/home', { replace: true });
} else {
  // No module access at all - stay on a holding page or show message
  navigate('/pending-approval', { replace: true });
}
```

**3. `src/layouts/EventsDashboardLayout.tsx`** and **`src/components/layout/Sidebar.tsx`**

Both have `const showSwitchOption = true;` hardcoded. These should check whether the user has access to more than one module before showing the "Switch Dashboard" button. This is a minor improvement but keeps behavior consistent.

## How It Works

- New signups get `module_access = '{lms}'` by default, so they only see the Society/LMS area.
- When an attendee record is created and linked, an admin can add `'attendee'` to their `module_access`.
- Admins (`role = 'admin'`) automatically pass all `hasModuleAccess` checks, so they always see all three areas.

## No Database Changes Required

The `module_access` column and `hasModuleAccess` function already exist and handle this correctly. The only issue is the frontend bypassing those checks for the attendee area.
