
# Server/Database Health Metrics for Admin Dashboard

## Overview

Add a new **System Health** section to the Admin Dashboard that displays real-time server and database performance metrics including:
- Database query response times
- Edge function execution times
- API latency and error rates
- Recent error logs

---

## Implementation Strategy

Since this is a client-side application without direct server access, we'll implement this by:

1. **Creating an edge function** that queries the Supabase analytics logs API
2. **Building a new hook** to fetch and cache health metrics
3. **Adding a HealthMetrics component** with visual gauges and charts

---

## Components to Build

### 1. New Edge Function: `get-system-health`

This edge function will query internal analytics data:

```text
+------------------------------------------+
| get-system-health                        |
+------------------------------------------+
| Queries:                                 |
| - postgres_logs (error counts, latency)  |
| - function_edge_logs (edge fn metrics)   |
| - Count queries per time window          |
+------------------------------------------+
| Returns:                                 |
| - dbResponseTimeAvg (ms)                 |
| - dbErrorCount (last hour)               |
| - edgeFnAvgTime (ms)                     |
| - edgeFnCallCount (last hour)            |
| - recentErrors (list of 5)               |
+------------------------------------------+
```

### 2. New Hook: `useSystemHealth`

Located at `src/hooks/useSystemHealth.ts`:
- Calls the edge function every 60 seconds
- Returns typed health metrics data
- Handles loading and error states

### 3. New Component: `SystemHealthMetrics`

Located at `src/components/admin/SystemHealthMetrics.tsx`:

```text
+---------------------------+---------------------------+
|     Database Health       |    Edge Functions         |
+---------------------------+---------------------------+
| [Gauge] Response Time     | [Gauge] Avg Exec Time     |
|         45ms (Good)       |         120ms (Normal)    |
|                           |                           |
| Errors: 0 (last hour)     | Calls: 156 (last hour)    |
+---------------------------+---------------------------+
|           Recent Errors (if any)                      |
| - 10:32 AM: connection timeout                        |
| - 10:28 AM: query took >5s                            |
+-------------------------------------------------------+
```

### 4. Update Admin Dashboard Layout

Add the new section between StatsCards and the main content grid.

---

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/get-system-health/index.ts` | Create |
| `src/hooks/useSystemHealth.ts` | Create |
| `src/components/admin/SystemHealthMetrics.tsx` | Create |
| `src/components/admin/HealthGauge.tsx` | Create |
| `src/pages/AdminDashboard.tsx` | Update |

---

## Technical Details

### Edge Function Query Logic

The edge function will use Supabase's internal analytics API to gather:

1. **Database metrics** from `postgres_logs`:
   - Count errors by severity (FATAL, ERROR, WARNING)
   - Sample connection times
   
2. **Edge function metrics** from `function_edge_logs`:
   - Average execution time
   - Total call count
   - Error rate (non-200 status codes)

### Health Gauge Visualization

Using the existing Recharts library for a radial gauge:
- Green zone: 0-100ms (Excellent)
- Yellow zone: 100-500ms (Normal)  
- Red zone: 500ms+ (Slow)

### Error Display

Recent errors shown in a collapsible list with:
- Timestamp
- Error severity (color-coded badge)
- Truncated message

---

## Database/Schema Changes

**None required** - This feature reads from Supabase's internal analytics logs which are already available.

---

## Security Considerations

- Edge function requires authentication (admin role check)
- Uses existing RLS patterns for admin-only access
- No sensitive data exposed in metrics

---

## Dependencies

- Existing: `recharts` (already installed for charts)
- Existing: `@tanstack/react-query` (for data fetching)
- No new packages needed
