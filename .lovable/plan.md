
# Authentication Audit - Security Assessment and Fixes

## Executive Summary

After a thorough review of the codebase, I found that the **frontend routing is mostly well-protected**, but there are several **critical database security vulnerabilities** that need to be addressed. Additionally, some RLS policies have issues that could allow unauthenticated or unauthorized access to data.

---

## Current State Analysis

### Frontend Route Protection Status

| Route | Current Status | Expected Access |
|-------|---------------|-----------------|
| `/auth` | Public | Public |
| `/events` | Public | Public |
| `/events/:slug` | Public | Public |
| `/events/:slug/checkout` | Public | Public |
| `/events/:slug/checkout/success` | Public | Public |
| `/events/:slug/order/:orderId/attendees` | Public | Public (token-protected) |
| `/my-orders` | Public | Public (order portal) |
| `/my-orders/dashboard` | Public | Public (code-protected) |
| `/` (Feed) | Protected | Protected |
| `/recordings` | Protected | Protected |
| `/profile` | Protected | Protected |
| `/profile/:userId` | Protected | Protected |
| `/select-dashboard` | **ISSUE** | Protected |
| All `/events/manage/*` | Protected | Protected |
| Admin routes | Protected | Protected |

### Critical Issues Found

#### Issue 1: Dashboard Selector Not Protected
The `/select-dashboard` route lacks the `ProtectedRoute` wrapper, allowing unauthenticated users to access it (though it redirects if no user).

#### Issue 2: RLS Policies with `USING (true)` for Public Role
Several tables have overly permissive SELECT policies that could leak data to unauthenticated users:

| Table | Policy | Issue |
|-------|--------|-------|
| `announcements` | `Announcements viewable by authenticated users` | Uses `USING (true)` with `public` role - should be `authenticated` only |
| `recording_resources` | `Anyone can view recording resources` | Uses `USING (true)` with `public` role - should be `authenticated` only |

#### Issue 3: INSERT Policies with `WITH CHECK (true)`
Three tables have INSERT policies that allow anyone to insert:

| Table | Policy | Risk |
|-------|--------|------|
| `orders` | `Anyone can create orders` | Expected for checkout - acceptable |
| `order_items` | `Order items can be inserted with order` | Expected for checkout - acceptable |
| `attendees` | `Service role can insert attendees` | Expected for checkout - acceptable |

These INSERT policies are intentionally permissive to support the public checkout flow. The edge function creates these records using the service role key.

#### Issue 4: `order_access_codes` Table Missing RLS Policies
This table has RLS enabled but **no policies**, which means it's completely inaccessible. This is actually secure for data protection, but the table should have explicit policies for service role access clarity.

---

## Recommended Fixes

### Fix 1: Protect Dashboard Selector Route
Wrap the `/select-dashboard` route with `ProtectedRoute`.

**File:** `src/App.tsx`
```tsx
// Change from:
<Route path="/select-dashboard" element={
  <Suspense fallback={<PageLoader />}>
    <DashboardSelector />
  </Suspense>
} />

// Change to:
<Route path="/select-dashboard" element={
  <ProtectedRoute requireApproval={false}>
    <Suspense fallback={<PageLoader />}>
      <DashboardSelector />
    </Suspense>
  </ProtectedRoute>
} />
```

### Fix 2: Update RLS Policies to Require Authentication
Update the following policies to restrict SELECT to authenticated users only:

**SQL Migration:**
```sql
-- Fix announcements policy
DROP POLICY IF EXISTS "Announcements viewable by authenticated users" ON public.announcements;
CREATE POLICY "Announcements viewable by authenticated users" 
  ON public.announcements FOR SELECT 
  TO authenticated 
  USING (true);

-- Fix recording_resources policy
DROP POLICY IF EXISTS "Anyone can view recording resources" ON public.recording_resources;
CREATE POLICY "Recording resources viewable by authenticated users" 
  ON public.recording_resources FOR SELECT 
  TO authenticated 
  USING (true);
```

### Fix 3: Update Events RLS for Public Access (Correct Behavior)
The events table correctly allows public SELECT for published events, which is required for the public event browsing feature. **No changes needed here.**

### Fix 4: Update Ticket Types RLS for Public Access (Correct Behavior)
The ticket_types table correctly allows SELECT when the associated event is published. **No changes needed here.**

---

## Files to Modify

1. **`src/App.tsx`** - Wrap `/select-dashboard` with `ProtectedRoute`

2. **Database Migration** - Update RLS policies:
   - `announcements` - Restrict to `authenticated` role
   - `recording_resources` - Restrict to `authenticated` role

---

## Summary of Changes

```text
+---------------------------------------+
|        Route Protection Fix           |
+---------------------------------------+
| /select-dashboard                     |
| FROM: Unprotected                     |
| TO: ProtectedRoute (requireApproval   |
|     = false for pending users)        |
+---------------------------------------+

+---------------------------------------+
|        RLS Policy Updates             |
+---------------------------------------+
| announcements                         |
| - Restrict SELECT to authenticated    |
+---------------------------------------+
| recording_resources                   |
| - Restrict SELECT to authenticated    |
+---------------------------------------+
```

---

## What Remains Public (By Design)

The following should remain publicly accessible for the event ticketing flow:
- `/events` - Event listing page
- `/events/:slug` - Event detail page
- `/events/:slug/checkout` - Ticket purchase flow
- `/events/:slug/checkout/success` - Order confirmation
- `/events/:slug/order/:orderId/attendees` - Attendee info entry (token-protected)
- `/my-orders` and `/my-orders/dashboard` - Order portal (code-protected via edge functions)
- Published events data in `events` table
- Ticket types for published events
- Public checkout edge functions (with proper validation)

---

## Technical Implementation Details

### Fix 1: Protected Route for Dashboard Selector
The current DashboardSelector page has its own redirect logic if no user is found, but wrapping it in ProtectedRoute ensures consistent protection and prevents any potential race conditions during auth state loading.

### Fix 2: RLS Policy Migration
The migration will:
1. Drop existing permissive policies
2. Create new policies restricted to `authenticated` role only
3. Ensure unauthenticated users cannot read announcements or recording resources

This ensures that logged-out users cannot access any LMS content through direct database queries.
