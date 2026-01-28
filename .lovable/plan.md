

# User Approval System Plan

## Overview
Implement an approval workflow where new users who register are placed in a pending queue. An admin can then review, approve, and assign them to a chapter before they gain access to the app.

## How It Works

### User Registration Flow
1. User registers via email/password or Google OAuth
2. A new `is_approved` field on their profile is set to `false` by default
3. User sees a "Pending Approval" screen explaining they need to wait for admin approval
4. They cannot access the main app features until approved

### Admin Approval Flow
1. Admin sees a new "Pending Users" section in the sidebar
2. The page displays all users with `is_approved = false`
3. For each pending user, admin can:
   - Assign a role (student, advisor, event_organizer)
   - Assign a chapter
   - Approve the user
4. Once approved, the user can access the app on their next login/refresh

---

## Changes Summary

### Database Changes

**Modify `profiles` table:**
- Add `is_approved` boolean column (default: `false`)

**Update `handle_new_user` trigger:**
- Ensure new profiles are created with `is_approved = false`

**RLS Policy Updates:**
- Allow admins to read all profiles (for the approval queue)
- Allow admins to update `is_approved` and `chapter_id` on any profile

### Frontend Changes

**New Page: `src/pages/PendingApproval.tsx`**
- Simple page shown to unapproved users
- Displays message: "Your account is pending approval"
- Includes sign out button

**New Page: `src/pages/UserApprovals.tsx`**
- Admin-only page for managing pending users
- Lists users where `is_approved = false`
- Each row shows: name, email (from profile), registration date
- Actions: assign role, assign chapter, approve button

**Modify `AuthContext.tsx`:**
- Add `isApproved` field from profile data
- Expose `isApproved` in context

**Modify `App.tsx` routing:**
- Check `isApproved` status
- Redirect unapproved users to `/pending-approval`
- Block access to all protected routes if not approved

**Modify `Sidebar.tsx`:**
- Add "Pending Users" link for admin role

---

## Technical Details

### Database Migration

```sql
-- Add is_approved column to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Update existing users to be approved (they were already in the system)
UPDATE public.profiles SET is_approved = true WHERE is_approved = false;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- RLS policy for admins to view all pending users
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR user_id = auth.uid()
);

-- RLS policy for admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### AuthContext Updates

```typescript
// Add to profile fetch
const { data: profileData } = await supabase
  .from('profiles')
  .select('id, full_name, avatar_url, chapter_id, is_approved')
  .eq('user_id', session.user.id)
  .single();

// Expose in context
isApproved: profile?.is_approved ?? false,
```

### Routing Logic

```typescript
// In AppRoutes component
if (user && !isApproved) {
  // Redirect to pending approval page for unapproved users
  return <Navigate to="/pending-approval" replace />;
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create - Add `is_approved` column, RLS policies |
| `src/contexts/AuthContext.tsx` | Modify - Add `isApproved` to context |
| `src/pages/PendingApproval.tsx` | Create - Pending approval screen |
| `src/pages/UserApprovals.tsx` | Create - Admin approval queue |
| `src/App.tsx` | Modify - Add approval check, new routes |
| `src/components/layout/Sidebar.tsx` | Modify - Add Pending Users link |

