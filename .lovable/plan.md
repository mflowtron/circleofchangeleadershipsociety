

# Remove Activity Dashboard and Related Infrastructure

## Summary

Completely remove the Admin Activity Dashboard page and all associated infrastructure including frontend components, hooks, database triggers, functions, and the `activity_logs` table.

---

## Files to Delete

| File | Description |
|------|-------------|
| `src/pages/AdminDashboard.tsx` | Main dashboard page component |
| `src/components/admin/ActivityFeed.tsx` | Activity feed component with filters |
| `src/components/admin/ActivityItem.tsx` | Individual activity log item component |
| `src/components/admin/CommunicationLogs.tsx` | Order messages widget |
| `src/components/admin/RecentUsers.tsx` | Recent users widget with approve button |
| `src/components/admin/StatsCards.tsx` | Stats overview cards |
| `src/components/admin/SystemHealthMetrics.tsx` | System health gauges |
| `src/components/admin/HealthGauge.tsx` | Reusable gauge component |
| `src/hooks/useActivityLogs.ts` | Hook for fetching activity logs |
| `src/hooks/useAdminStats.ts` | Hook for admin statistics |

---

## Files to Modify

### 1. `src/App.tsx`

**Remove:**
- Lazy import for `AdminDashboard` (line 31)
- Route for `/lms/admin` (lines 269-278)

### 2. `src/components/layout/Sidebar.tsx`

**Remove from admin navItems array:**
```typescript
{ path: '/lms/admin', label: 'Activity', icon: Activity },
```

**Also remove:**
- `Activity` icon import from lucide-react (if no longer used elsewhere)

### 3. `supabase/functions/get-system-health/index.ts`

**Remove:**
- The query that counts `activity_logs` (lines 84-88)
- Update the activity calculation to not depend on this count

---

## Database Migration

Create a migration to drop all activity logging infrastructure:

```sql
-- Drop triggers first (must drop before functions they depend on)
DROP TRIGGER IF EXISTS log_profile_changes ON profiles;
DROP TRIGGER IF EXISTS log_post_changes ON posts;
DROP TRIGGER IF EXISTS log_comment_changes ON comments;
DROP TRIGGER IF EXISTS log_order_changes ON orders;
DROP TRIGGER IF EXISTS log_event_changes ON events;
DROP TRIGGER IF EXISTS log_recording_changes ON recordings;
DROP TRIGGER IF EXISTS log_announcement_changes ON announcements;

-- Drop trigger functions
DROP FUNCTION IF EXISTS log_profile_activity();
DROP FUNCTION IF EXISTS log_post_activity();
DROP FUNCTION IF EXISTS log_comment_activity();
DROP FUNCTION IF EXISTS log_order_activity();
DROP FUNCTION IF EXISTS log_event_activity();
DROP FUNCTION IF EXISTS log_recording_activity();
DROP FUNCTION IF EXISTS log_announcement_activity();

-- Drop the main log_activity function
DROP FUNCTION IF EXISTS log_activity(text, text, uuid, text, uuid, jsonb);

-- Remove from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.activity_logs;

-- Drop the table (this also drops indexes and RLS policies)
DROP TABLE IF EXISTS public.activity_logs;
```

---

## Deletion Summary

| Category | Count |
|----------|-------|
| Pages | 1 |
| Components | 7 |
| Hooks | 2 |
| Database triggers | 7 |
| Database functions | 8 |
| Database tables | 1 |

---

## Impact Assessment

**No breaking changes expected:**
- The `/lms/admin` route is only linked from the admin sidebar
- No other pages or components import these files
- The `get-system-health` edge function will still work after removing the activity_logs query (it uses other metrics)

**Navigation update:**
- Admin users will no longer see the "Activity" link in their sidebar
- The first admin link will now be "Feed" (same as other roles)

