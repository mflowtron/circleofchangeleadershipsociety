

# Keep Users in Events App When Viewing Profile

## Overview
When a user clicks "View Profile" from the Events Management dashboard, they should stay within the Events layout rather than switching to the LMS layout. This requires adding a new profile route under `/events/manage/profile` and updating the Profile component to be context-aware.

---

## Current Behavior

| Action | Result |
|--------|--------|
| Click "View Profile" in Events header | Navigates to `/lms/profile` → switches to LMS layout |

## Desired Behavior

| Action | Result |
|--------|--------|
| Click "View Profile" in Events header | Navigates to `/events/manage/profile` → stays in Events layout |
| Role badge shows | "Admin", "Organizer", or "Staff" (not "Admin", "Advisor", "Student") |

---

## Changes Required

### 1. Add Events Profile Route
**File:** `src/App.tsx`

Add a new route within the `EventsManagementWrapper` that renders the Profile component with the Events layout:

```typescript
<Route 
  path="/events/manage/profile" 
  element={
    <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
      <SuspenseWithErrorBoundary>
        <Profile />
      </SuspenseWithErrorBoundary>
    </ProtectedRoute>
  } 
/>
```

### 2. Update Events Dashboard Header
**File:** `src/components/events/EventsDashboardHeader.tsx`

Change the profile link from `/lms/profile` to `/events/manage/profile`:

```typescript
// Before
<Link to="/lms/profile" ...>

// After  
<Link to="/events/manage/profile" ...>
```

### 3. Make Profile Component Context-Aware
**File:** `src/pages/Profile.tsx`

Detect the current route and show appropriate role labels:

```typescript
import { useLocation } from 'react-router-dom';

// Inside component:
const location = useLocation();
const isEventsContext = location.pathname.startsWith('/events');

const getRoleInfo = () => {
  if (isEventsContext) {
    // Events Management roles
    if (isEMAdmin) return { label: 'Admin', color: 'bg-primary text-primary-foreground' };
    if (isEMManager) return { label: 'Organizer', color: 'bg-secondary text-secondary-foreground' };
    return { label: 'Staff', color: 'bg-muted text-muted-foreground' };
  } else {
    // LMS roles
    if (isLMSAdmin) return { label: 'Admin', color: 'bg-primary text-primary-foreground' };
    if (isLMSAdvisor) return { label: 'Advisor', color: 'bg-secondary text-secondary-foreground' };
    return { label: 'Student', color: 'bg-muted text-muted-foreground' };
  }
};
```

---

## Visual Result

### Events Dashboard (After)
```text
┌─────────────────────────────────────────────────────┐
│  Profile Page - Events Layout                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  [Avatar]  Michael Flotron                    │  │
│  │            michael@example.com                │  │
│  │            [Organizer Badge] ← Events role    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### LMS Dashboard (Unchanged)
```text
┌─────────────────────────────────────────────────────┐
│  Profile Page - LMS Layout                          │
│  ┌───────────────────────────────────────────────┐  │
│  │  [Avatar]  Michael Flotron                    │  │
│  │            michael@example.com                │  │
│  │            [Advisor Badge] ← LMS role         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/events/manage/profile` route with Events layout |
| `src/components/events/EventsDashboardHeader.tsx` | Change profile link to `/events/manage/profile` |
| `src/pages/Profile.tsx` | Add route detection and context-aware role labels |

---

## Technical Notes

- The Profile component already has access to both LMS (`isLMSAdmin`, `isLMSAdvisor`) and Events (`isEMAdmin`, `isEMManager`) role flags via `useAuth()`
- The route is placed inside `EventsManagementWrapper` to maintain event selection context
- Using `location.pathname.startsWith('/events')` provides a simple and reliable way to detect context
- All profile functionality (avatar upload, name editing, etc.) remains identical in both contexts

