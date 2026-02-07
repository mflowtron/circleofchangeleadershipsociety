
# Comprehensive User Roles Restructure

## Overview

Restructure the entire authentication and authorization system to support three distinct areas (LMS, Event Management, Attendee) with multiple permission levels each. Users can hold multiple roles across different areas, and the root `/` route becomes a smart router.

---

## New Role System Architecture

### Extended `app_role` Enum

| Role | System | Description |
|------|--------|-------------|
| `lms_student` | LMS | Basic LMS access - view recordings, posts, events |
| `lms_advisor` | LMS | Student + manage assigned chapter |
| `lms_admin` | LMS | Full LMS control |
| `em_advisor` | Event Management | Purchaser access - manage own orders/registrations |
| `em_manager` | Event Management | Create and manage events, attendees, badges |
| `em_admin` | Event Management | Full event platform control |
| `attendee_student` | Attendee App | Access student track content only |
| `attendee_advisor` | Attendee App | Access all tracks + manage own registrations |

### Home Routes by Role

| Role | Home Route |
|------|------------|
| `lms_student`, `lms_advisor`, `lms_admin` | `/lms` |
| `em_advisor`, `em_manager`, `em_admin` | `/events/manage` (or `/my-orders` for em_advisor) |
| `attendee_student`, `attendee_advisor` | `/attendee/app/home` |

---

## Database Changes

### 1. Update `app_role` Enum

```sql
-- Add new values to the app_role enum
ALTER TYPE app_role ADD VALUE 'lms_student';
ALTER TYPE app_role ADD VALUE 'lms_advisor';
ALTER TYPE app_role ADD VALUE 'lms_admin';
ALTER TYPE app_role ADD VALUE 'em_advisor';
ALTER TYPE app_role ADD VALUE 'em_manager';
ALTER TYPE app_role ADD VALUE 'em_admin';
ALTER TYPE app_role ADD VALUE 'attendee_student';
ALTER TYPE app_role ADD VALUE 'attendee_advisor';

-- Migration: Convert existing roles to new naming
UPDATE user_roles SET role = 'lms_student' WHERE role = 'student';
UPDATE user_roles SET role = 'lms_advisor' WHERE role = 'advisor';
UPDATE user_roles SET role = 'lms_admin' WHERE role = 'admin';
UPDATE user_roles SET role = 'em_manager' WHERE role = 'event_organizer';
```

### 2. Drop Unique Constraint on `user_roles`

```sql
-- Allow users to have multiple roles
ALTER TABLE user_roles DROP CONSTRAINT user_roles_user_id_unique;

-- Add unique constraint for user_id + role combo to prevent duplicates
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role);
```

### 3. Add Default Role Preference

```sql
-- Add default_role column to profiles for "Remember my choice" functionality
ALTER TABLE profiles ADD COLUMN default_role TEXT;
```

### 4. Add Track Permission to Attendees

```sql
-- Add track_access column to attendees table
ALTER TABLE attendees ADD COLUMN track_access TEXT[] DEFAULT '{}';

-- This allows specifying which tracks (e.g., 'Student', 'Advisor') an attendee can view
```

### 5. Update RLS Policies

All existing RLS policies using `has_role(auth.uid(), 'admin')` need to be updated to use the new role names:
- `'admin'` becomes `'lms_admin'::app_role` or check for any admin role
- `'event_organizer'` becomes `'em_manager'::app_role` or `'em_admin'::app_role`

### 6. Update `has_role` Function

Create a helper to check role prefixes:

```sql
CREATE OR REPLACE FUNCTION public.has_any_lms_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text LIKE 'lms_%'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_em_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text LIKE 'em_%'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_attendee_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text LIKE 'attendee_%'
  )
$$;
```

---

## Attendee System Migration

### Convert from Email OTP to Supabase Auth

Currently the attendee app uses a custom session token stored in localStorage. This needs to change:

| Current Flow | New Flow |
|--------------|----------|
| Email + OTP code via edge function | Supabase magic link (email) |
| Custom session token in localStorage | Supabase session |
| `order_access_codes` table | Can be deprecated or kept for backward compatibility |
| No user record in `auth.users` | User created in `auth.users` on first login |

### New Attendee Auth Flow

1. User enters email on `/attendee` login
2. System sends magic link via Supabase Auth
3. On click, user is authenticated and profile is created (if new)
4. User gets `attendee_student` or `attendee_advisor` role based on registration
5. Attendee identity resolved by matching `auth.users.email` with `attendees.attendee_email`

### Link Attendees to Auth Users

```sql
-- Add user_id column to attendees table
ALTER TABLE attendees ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_attendees_user_id ON attendees(user_id);
```

---

## Frontend Changes

### 1. Create Smart Root Router (`/`)

```text
Root Route Logic:
+-------------------------+
| Logged in?              |
+------------+------------+
             |
      No     |     Yes
       |     |       |
  Show Auth  v       v
             +-------------------+
             | Is approved?      |
             +----------+--------+
                        |
                 No     |    Yes
                  |     |      |
             /pending   v      v
                   +--------------------+
                   | Has default_role?  |
                   +----------+---------+
                              |
                       Yes    |    No
                        |     |      |
                 Redirect to  v      v
                 that role's  +----------------------+
                 home         | Count distinct areas |
                              +----------+-----------+
                                         |
                                  1      |    > 1
                                   |     |      |
                            Redirect to  v      v
                            that area's  Show Area
                            home         Selector
```

### 2. Update Route Structure

| Current Route | New Route | Notes |
|---------------|-----------|-------|
| `/` | `/` | Smart router (new) |
| `/` (Feed) | `/lms` | LMS home (Feed page) |
| `/recordings` | `/lms/recordings` | Nested under LMS |
| `/profile` | `/lms/profile` | Nested under LMS |
| `/my-chapter` | `/lms/my-chapter` | Nested under LMS |
| `/users` | `/lms/admin/users` | Admin pages |
| `/chapters` | `/lms/admin/chapters` | Admin pages |
| `/moderation` | `/lms/admin/moderation` | Admin pages |
| `/announcements` | `/lms/admin/announcements` | Admin pages |
| `/admin` | `/lms/admin` | Admin dashboard |
| `/events/manage` | `/events/manage` | Keep as-is |
| `/attendee` | `/attendee` | Keep as-is |
| `/my-orders` | `/events/my-orders` | Move under events |

### 3. Update AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: {...};
  roles: AppRole[];  // Array of all user roles
  defaultRole: AppRole | null;
  isApproved: boolean;
  
  // Computed access flags
  hasLMSAccess: boolean;
  hasEMAccess: boolean;
  hasAttendeeAccess: boolean;
  accessibleAreas: ('lms' | 'em' | 'attendee')[];
  
  // Actions
  signOut: () => Promise<void>;
  setDefaultRole: (role: AppRole) => Promise<void>;
}
```

### 4. Update DashboardSelector

- Show cards dynamically based on `accessibleAreas`
- Add "Remember my choice" checkbox
- Save to `profiles.default_role` when checked

### 5. Update Sidebar Components

- LMS Sidebar: Filter nav items based on `lms_student`, `lms_advisor`, `lms_admin`
- Events Sidebar: Filter based on `em_advisor`, `em_manager`, `em_admin`

### 6. Update AttendeeContext

- Remove custom session token logic
- Use Supabase auth instead
- Keep the attendee identity resolution by email match

---

## Edge Function Updates

### Update Order Portal Functions

The following functions need updating to use Supabase auth:
- `send-order-access-code` - Convert to trigger magic link
- `verify-order-access-code` - May be deprecated
- `get-orders-by-email` - Use auth user's email instead of session token
- `update-attendee-public` - Use auth for authorization
- `mark-message-read` - Use auth for authorization
- `send-customer-message` - Use auth for authorization

### Update Attendee App Functions

- `get-attendee-bookmarks` - Use auth
- `toggle-attendee-bookmark` - Use auth
- `get-attendee-conversations` - Use auth
- `get-attendee-profile` - Use auth
- All other attendee functions

---

## Files to Modify

### Database
- New migration for role system changes

### Core Auth
- `src/contexts/AuthContext.tsx` - Multi-role support
- `src/pages/Auth.tsx` - Unified auth page
- `src/pages/AuthCallback.tsx` - Updated routing logic

### New Pages
- `src/pages/RootRouter.tsx` - Smart root router
- `src/pages/AreaSelector.tsx` - Replace DashboardSelector

### LMS Pages (route updates)
- `src/App.tsx` - Route restructure
- `src/components/layout/Sidebar.tsx` - Role-based nav
- All LMS pages (move to `/lms/*` routes)

### Event Management
- `src/layouts/EventsDashboardLayout.tsx` - Role-based nav
- `src/components/events/EventsDashboardSidebar.tsx` - Role-based nav

### Attendee App
- `src/contexts/AttendeeContext.tsx` - Use Supabase auth
- `src/pages/attendee/Index.tsx` - Magic link auth
- `src/hooks/useOrderPortal.ts` - Remove or update

### Edge Functions (13 files)
- All attendee and order portal functions

### RLS Policy Updates
- Multiple migrations to update policies

---

## Migration Strategy

### Phase 1: Database Preparation
1. Add new enum values
2. Drop unique constraint, add new constraint
3. Add helper functions
4. Add new columns

### Phase 2: Data Migration
1. Convert existing roles to new naming
2. Assign appropriate roles to existing users

### Phase 3: Backend Updates
1. Update edge functions for Supabase auth
2. Update RLS policies

### Phase 4: Frontend Updates
1. Update AuthContext
2. Create RootRouter
3. Update routing
4. Update navigation components
5. Update AttendeeContext

### Phase 5: Cleanup
1. Remove deprecated code
2. Update documentation

---

## Technical Considerations

1. **Backward Compatibility**: Existing sessions will need to be refreshed. Users may need to re-authenticate.

2. **Role Assignment**: When migrating attendees to Supabase auth, their role (`attendee_student` or `attendee_advisor`) needs to be determined. Consider adding a UI for event organizers to set this.

3. **Track Access**: The `track_access` column on attendees allows per-attendee customization of which agenda tracks they can see.

4. **Default New Users**: The `handle_new_user()` trigger needs updating to assign `lms_student` as the default role (instead of `student`).

5. **RLS Complexity**: With multiple role types, RLS policies will use `has_role(uid, 'lms_admin')` OR `has_role(uid, 'em_admin')` patterns.

---

## Summary

This is a significant architectural change that:
- Enables users to have multiple roles across different systems
- Converts the attendee/order portal from custom auth to Supabase auth
- Creates a smart root router that directs users based on their roles
- Adds track-based content filtering for attendees
- Maintains backward compatibility during migration
