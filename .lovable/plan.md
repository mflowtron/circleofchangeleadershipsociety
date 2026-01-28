
# Consolidate User Management with Tabs

## Overview
Instead of having a separate "Pending Users" menu item, we'll add a tabbed interface to the existing Users page. This will display two tabs:
- **All Users** - The current user management table
- **Pending Approval** - The approval queue for new users

## Changes Summary

### Modify `src/pages/Users.tsx`
Transform the page to use a tabbed layout:
- Add `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from the UI components
- **Tab 1: "All Users"** - Contains the existing user table with role/chapter editing
- **Tab 2: "Pending Approval"** - Contains the approval queue functionality from `UserApprovals.tsx`
- Add a badge/count indicator on the Pending tab showing how many users need approval
- Consolidate data fetching to include `is_approved` field from profiles

### Modify `src/components/layout/Sidebar.tsx`
- Remove the "Pending Users" navigation item (with `UserCheck` icon)
- Keep only the "Users" navigation item for admin access

### Modify `src/App.tsx`
- Remove the `/user-approvals` route
- Keep the `/users` route as-is

### Delete `src/pages/UserApprovals.tsx`
- This file will no longer be needed as its functionality moves into `Users.tsx`

---

## Technical Details

### Users Page Structure

```tsx
<Tabs defaultValue="all-users">
  <TabsList>
    <TabsTrigger value="all-users">All Users</TabsTrigger>
    <TabsTrigger value="pending">
      Pending Approval
      {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="all-users">
    {/* Existing user table with edit functionality */}
  </TabsContent>
  
  <TabsContent value="pending">
    {/* Approval queue from UserApprovals.tsx */}
  </TabsContent>
</Tabs>
```

### Data Fetching Updates
- Fetch `is_approved` field along with other profile data
- Filter users into two lists:
  - Approved users for the "All Users" tab
  - Unapproved users for the "Pending Approval" tab
- Use React Query for the pending users to enable optimistic updates on approval

### Sidebar Update
Remove this navigation item:
```tsx
{ path: '/user-approvals', label: 'Pending Users', icon: UserCheck }
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/pages/Users.tsx` | Modify - Add tabbed interface with approval functionality |
| `src/components/layout/Sidebar.tsx` | Modify - Remove "Pending Users" nav item |
| `src/App.tsx` | Modify - Remove `/user-approvals` route |
| `src/pages/UserApprovals.tsx` | Delete - No longer needed |
