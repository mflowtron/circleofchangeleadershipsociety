

# Remove Legacy Code and Simplify Roles System

## Overview

Since the app is still in development and not yet published, we can remove all backward-compatibility code for the old role system. This will clean up the codebase and simplify the authorization logic.

---

## Items to Remove

### 1. Legacy Route Redirects (App.tsx)

Remove the entire block of legacy route redirects (lines 297-307):

```text
Current (to be removed):
- /recordings        -> /lms/recordings
- /profile/:userId   -> /lms/profile/:userId
- /profile           -> /lms/profile
- /my-chapter        -> /lms/my-chapter
- /users             -> /lms/admin/users
- /chapters          -> /lms/admin/chapters
- /moderation        -> /lms/admin/moderation
- /announcements     -> /lms/admin/announcements
- /lms-events        -> /lms/events
- /admin             -> /lms/admin
```

### 2. Legacy Role Type Definitions (AuthContext.tsx)

Remove the old role names from the `AppRole` type:

| Remove | Keep |
|--------|------|
| `admin` | `lms_admin` |
| `advisor` | `lms_advisor` |
| `student` | `lms_student` |
| `event_organizer` | `em_manager` |

### 3. Legacy Compatibility Properties (AuthContext.tsx)

Remove from context:

| Property | Reason |
|----------|--------|
| `role: AppRole` | Legacy single-role concept - use `roles[]` instead |
| `hasEventsAccess` | Alias for `hasEMAccess` |
| `hasDualAccess` | Replaced by `accessibleAreas.length > 1` |
| `primaryRole` computation | No longer needed |

### 4. Legacy Role Checks in Access Functions

Simplify role checks to only use new role names:

| Current | New |
|---------|-----|
| `hasAnyRole(['lms_admin', 'admin'])` | `hasRole('lms_admin')` |
| `hasAnyRole(['lms_advisor', 'advisor'])` | `hasRole('lms_advisor')` |
| `hasAnyRole(['em_manager', 'event_organizer'])` | `hasRole('em_manager')` |

### 5. Legacy String Roles in ProtectedRoute (App.tsx)

Update `allowedRoles` to use new role names:

| Current | New |
|---------|-----|
| `['admin']` | `['lms_admin']` |
| `['advisor', 'admin']` | `['lms_advisor', 'lms_admin']` |
| `['admin', 'event_organizer']` | `['em_admin', 'em_manager']` |

### 6. Remove Unused DashboardSelector.tsx

The `AreaSelector.tsx` replaces this file entirely. Delete `DashboardSelector.tsx`.

### 7. Legacy Role Checks in Auth.tsx and PendingApproval.tsx

Both files have inline legacy role checking logic that needs updating to use the new role names.

### 8. Legacy References in RootRouter.tsx

The `getRoleHome` function includes legacy role names in its checks.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Remove legacy role types, remove legacy properties, simplify role checks |
| `src/App.tsx` | Remove legacy redirect routes, update `allowedRoles` to new names, remove legacy role handling in `ProtectedRoute` |
| `src/pages/Auth.tsx` | Update redirect logic to use new role names |
| `src/pages/PendingApproval.tsx` | Update redirect logic to use new role names |
| `src/pages/RootRouter.tsx` | Remove legacy role names from `getRoleHome` function |
| `src/pages/DashboardSelector.tsx` | Delete file |
| `src/components/layout/Sidebar.tsx` | Update to use `hasEMAccess` instead of `hasEventsAccess` |

---

## Detailed Changes

### AuthContext.tsx

**Type definition (line 6-11):**
```typescript
// Before
export type AppRole = 
  | 'lms_student' | 'lms_advisor' | 'lms_admin'
  | 'em_advisor' | 'em_manager' | 'em_admin'
  | 'attendee_student' | 'attendee_advisor'
  | 'admin' | 'advisor' | 'student' | 'event_organizer';

// After
export type AppRole = 
  | 'lms_student' | 'lms_advisor' | 'lms_admin'
  | 'em_advisor' | 'em_manager' | 'em_admin'
  | 'attendee_student' | 'attendee_advisor';
```

**Context interface - remove these properties:**
- `role: AppRole | null` (line 36)
- `hasEventsAccess: boolean` (line 43)
- `hasDualAccess: boolean` (line 45)

**Simplify access flags (lines 152-166):**
```typescript
// Before
const hasLMSAccess = hasAnyRole(['lms_admin', 'lms_advisor', 'lms_student', 'admin', 'advisor', 'student']);
const hasEMAccess = hasAnyRole(['em_admin', 'em_manager', 'em_advisor', 'admin', 'event_organizer']);
const isLMSAdmin = hasAnyRole(['lms_admin', 'admin']);
// etc.

// After
const hasLMSAccess = hasAnyRole(['lms_admin', 'lms_advisor', 'lms_student']);
const hasEMAccess = hasAnyRole(['em_admin', 'em_manager', 'em_advisor']);
const isLMSAdmin = hasRole('lms_admin');
const isLMSAdvisor = hasRole('lms_advisor') || isLMSAdmin;
const isLMSStudent = hasRole('lms_student') || isLMSAdvisor;
const isEMAdmin = hasRole('em_admin');
const isEMManager = hasRole('em_manager') || isEMAdmin;
const isEMAdvisor = hasRole('em_advisor') || isEMManager;
```

**Remove primaryRole computation (lines 177-180):**
```typescript
// Delete this block
const primaryRole: AppRole | null = roles.find(r => 
  ['lms_admin', 'lms_advisor', 'lms_student', 'admin', 'advisor', 'student'].includes(r)
) || roles[0] || null;
```

---

### App.tsx

**Update ProtectedRoute allowedRoles handling (lines 106-114):**
```typescript
// Before
const hasAccess = allowedRoles.some(allowedRole => {
  if (allowedRole === 'admin') return isLMSAdmin;
  if (allowedRole === 'advisor') return isLMSAdvisor;
  if (allowedRole === 'event_organizer') return isEMManager;
  return roles.includes(allowedRole as any);
});

// After (simplified)
const hasAccess = allowedRoles.some(allowedRole => 
  roles.includes(allowedRole as AppRole)
);
```

**Update all route definitions to use new role names:**

| Route | Current | New |
|-------|---------|-----|
| `/lms/my-chapter` | `['advisor', 'admin']` | `['lms_advisor', 'lms_admin']` |
| `/lms/admin/*` | `['admin']` | `['lms_admin']` |
| `/events/manage/*` | `['admin', 'event_organizer']` | `['em_admin', 'em_manager']` |

**Remove legacy redirect routes (lines 297-307):**
Delete entire block.

**Remove unused imports and properties:**
- Remove `hasDualAccess`, `hasEventsAccess` from useAuth destructuring
- Remove `getDefaultRoute` function (unused)

---

### Auth.tsx

**Update redirect logic (lines 95-116):**
```typescript
// Before - fetches single role and checks legacy names
const role = roleResult.data?.role;
const hasLMSAccess = role === 'admin' || role === 'advisor' || role === 'student';
const hasEventsAccess = role === 'admin' || role === 'event_organizer';

// After - fetch all roles and check new names
const { data: rolesData } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', data.user.id);

const userRoles = rolesData?.map(r => r.role) || [];
const hasLMSAccess = userRoles.some(r => r.startsWith('lms_'));
const hasEMAccess = userRoles.some(r => r.startsWith('em_'));

// Redirect to root - let RootRouter handle the logic
navigate('/');
```

---

### PendingApproval.tsx

**Update redirect logic (lines 37-53):**
```typescript
// After - fetch all roles and check new names
const { data: rolesData } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);

const userRoles = rolesData?.map(r => r.role) || [];
// Simply redirect to root - let RootRouter handle routing
navigate('/');
```

---

### RootRouter.tsx

**Update getRoleHome function (lines 42-58):**
```typescript
const getRoleHome = (role: AppRole): string => {
  // LMS roles
  if (['lms_student', 'lms_advisor', 'lms_admin'].includes(role)) {
    return '/lms';
  }
  // EM roles
  if (['em_admin', 'em_manager'].includes(role)) {
    return '/events/manage';
  }
  if (role === 'em_advisor') {
    return '/my-orders';
  }
  // Attendee roles
  if (['attendee_student', 'attendee_advisor'].includes(role)) {
    return '/attendee/app/home';
  }
  return '/lms';
};
```

---

### Sidebar.tsx

**Update import (line 54):**
```typescript
// Before
const { isLMSAdmin, isLMSAdvisor, hasEventsAccess } = useAuth();

// After
const { isLMSAdmin, isLMSAdvisor, hasEMAccess } = useAuth();
```

**Update usage (line 144):**
```typescript
// Before
{hasEventsAccess && (

// After
{hasEMAccess && (
```

---

## Summary

This cleanup will:
- Remove ~20 lines of legacy redirect routes
- Simplify the `AppRole` type from 12 to 8 values
- Remove 3 legacy context properties
- Simplify role-checking logic throughout the app
- Delete 1 unused file (`DashboardSelector.tsx`)
- Make the codebase cleaner and more maintainable

