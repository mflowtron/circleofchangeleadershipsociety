
# Admin Activity Dashboard

## Overview

Create a comprehensive admin-only dashboard that provides a real-time, high-level view of all platform activity. This includes recent database changes, user activity, communication logs, and key platform metrics - all in an easy-to-read format.

## Database Design

### New Table: `activity_logs`

This table will capture important platform activities for admin monitoring.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique identifier |
| action | text | Action type: 'create', 'update', 'delete' |
| entity_type | text | Table/entity name: 'post', 'user', 'order', 'event', etc. |
| entity_id | uuid | ID of the affected record |
| entity_title | text | Human-readable title/name of the entity |
| user_id | uuid | Who performed the action (nullable for system actions) |
| user_name | text | Cached user name for display |
| metadata | jsonb | Additional context (old/new values, details) |
| created_at | timestamptz | When the action occurred |

### RLS Policies

- Only admins can SELECT from activity_logs
- System triggers can INSERT (via service role)
- No UPDATE or DELETE allowed (audit trail integrity)

### Database Triggers

Create triggers on key tables to automatically log activity:
- `profiles` - User registrations, approvals, updates
- `posts` - New posts, edits, deletions
- `comments` - New comments, deletions
- `orders` - Order creation, status changes
- `events` - Event creation, updates, publishing
- `recordings` - New recordings uploaded
- `announcements` - Announcements created/updated

---

## Frontend Components

### 1. Admin Dashboard Page

**Route:** `/admin`

A comprehensive dashboard with multiple sections:

#### a) Quick Stats Cards
- Total users (approved/pending)
- Active events
- Total orders (today/this week)
- New posts (today)
- Pending approvals count

#### b) Activity Feed (Main Section)
A real-time scrollable feed showing recent activities:
- Color-coded by action type (green=create, blue=update, red=delete)
- Icons for entity types
- Timestamp with relative time ("2 minutes ago")
- Clickable to navigate to the relevant item
- Filter by: entity type, action type, date range

#### c) Communication Logs
Display recent order_messages with:
- Order number and customer name
- Message preview
- Read/unread status
- Quick reply option

#### d) Recent User Activity
- New user registrations
- Pending approvals (quick action to approve)
- User role changes

#### e) System Health (Optional)
- Recent errors (if any)
- Edge function activity summary

---

## File Structure

```text
src/
  hooks/
    useActivityLogs.ts       # Fetch and filter activity logs
    useAdminStats.ts         # Aggregate statistics for dashboard
  components/
    admin/
      ActivityFeed.tsx       # Main activity log display
      ActivityItem.tsx       # Individual log entry
      StatsCards.tsx         # Quick stats overview
      CommunicationLogs.tsx  # Order messages section
      RecentUsers.tsx        # User registrations section
      ActivityFilters.tsx    # Filter controls
  pages/
    AdminDashboard.tsx       # Main dashboard page
```

---

## Implementation Steps

### Phase 1: Database Setup

1. Create `activity_logs` table with all columns
2. Add RLS policy: admins can SELECT only
3. Create `log_activity()` function for inserting logs
4. Create triggers on key tables:
   - `profiles` (after INSERT/UPDATE)
   - `posts` (after INSERT/UPDATE/DELETE)
   - `comments` (after INSERT/DELETE)
   - `orders` (after INSERT/UPDATE)
   - `events` (after INSERT/UPDATE/DELETE)
   - `recordings` (after INSERT/DELETE)
   - `announcements` (after INSERT/UPDATE/DELETE)

### Phase 2: Backend Hooks

1. Create `useActivityLogs.ts` hook
   - Fetch logs with pagination
   - Filter by entity_type, action, date range
   - Real-time subscription for new entries
   - Join with profiles for user info

2. Create `useAdminStats.ts` hook
   - Aggregate counts from multiple tables
   - Cached with React Query
   - Quick refresh capability

### Phase 3: Dashboard UI

1. Create `StatsCards.tsx` - Grid of metric cards
2. Create `ActivityItem.tsx` - Single log entry with icon, time, description
3. Create `ActivityFeed.tsx` - Scrollable list with filters
4. Create `CommunicationLogs.tsx` - Recent order messages
5. Create `RecentUsers.tsx` - User activity section
6. Create `ActivityFilters.tsx` - Filter dropdown/tabs
7. Create `AdminDashboard.tsx` - Main page layout

### Phase 4: Routing and Navigation

1. Add route `/admin` with role check for 'admin' only
2. Add "Activity" nav item to admin sidebar

---

## Technical Details

### Activity Types and Icons

```typescript
const ENTITY_CONFIG = {
  user: { icon: User, color: 'text-blue-500', label: 'User' },
  post: { icon: FileText, color: 'text-green-500', label: 'Post' },
  comment: { icon: MessageSquare, color: 'text-cyan-500', label: 'Comment' },
  order: { icon: ShoppingCart, color: 'text-orange-500', label: 'Order' },
  event: { icon: Calendar, color: 'text-purple-500', label: 'Event' },
  recording: { icon: Video, color: 'text-red-500', label: 'Recording' },
  announcement: { icon: Megaphone, color: 'text-yellow-500', label: 'Announcement' },
};

const ACTION_BADGES = {
  create: { variant: 'success', label: 'Created' },
  update: { variant: 'info', label: 'Updated' },
  delete: { variant: 'destructive', label: 'Deleted' },
};
```

### Real-time Updates

Subscribe to `activity_logs` table for live updates:

```typescript
const channel = supabase
  .channel('activity-logs')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activity_logs',
  }, (payload) => {
    // Prepend new activity to the list
  })
  .subscribe();
```

### Trigger Example (for posts table)

```sql
CREATE OR REPLACE FUNCTION log_post_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (action, entity_type, entity_id, entity_title, user_id, user_name, metadata)
    SELECT 'create', 'post', NEW.id, 
           LEFT(NEW.content, 50), NEW.user_id, 
           (SELECT full_name FROM profiles WHERE user_id = NEW.user_id),
           jsonb_build_object('is_global', NEW.is_global);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (action, entity_type, entity_id, entity_title, user_id, user_name, metadata)
    SELECT 'update', 'post', NEW.id,
           LEFT(NEW.content, 50), NEW.user_id,
           (SELECT full_name FROM profiles WHERE user_id = NEW.user_id),
           jsonb_build_object('is_global', NEW.is_global);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (action, entity_type, entity_id, entity_title, user_id, user_name, metadata)
    SELECT 'delete', 'post', OLD.id,
           LEFT(OLD.content, 50), OLD.user_id,
           (SELECT full_name FROM profiles WHERE user_id = OLD.user_id),
           NULL;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Dashboard Layout

```text
+------------------------------------------+
|  Admin Activity Dashboard                |
+------------------------------------------+
|  [Stats] [Stats] [Stats] [Stats]         |
|  Users   Orders  Events  Pending         |
+------------------------------------------+
|                          |               |
|  Activity Feed           | Communication |
|  [Filters: All ▼]        | Logs          |
|  ----------------------  |               |
|  🟢 John created post... | Order #1234   |
|  🔵 Jane updated event...| Message...    |
|  🟢 New user registered  |               |
|  🔵 Order #1234 paid     |               |
|  🔴 Post deleted by...   |               |
|  ...                     |               |
|                          +---------------+
|                          | Recent Users  |
|                          | 👤 John (new) |
|                          | 👤 Jane ⏳    |
+------------------------------------------+
```

---

## Security Considerations

1. Route protected with `allowedRoles={['admin']}` - only admins can access
2. RLS on `activity_logs` ensures only admins can read logs
3. Triggers run as SECURITY DEFINER to bypass RLS for logging
4. No sensitive data (passwords, tokens) stored in metadata
5. User names cached at log time (no joins to auth.users)

---

## Sidebar Navigation Update

Add to admin navigation in `Sidebar.tsx`:

```typescript
admin: [
  { path: '/', label: 'Feed', icon: Home },
  { path: '/admin', label: 'Activity', icon: Activity }, // NEW
  { path: '/recordings', label: 'Recordings', icon: Video },
  // ... rest of admin items
]
```
