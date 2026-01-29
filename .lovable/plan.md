

# Fix Agenda Calendar View Item Positioning

## Problem Summary

Agenda items are not appearing in the correct time slots, and many items are not displaying at all. This is caused by timezone handling issues and the visible time range being too narrow.

## Root Cause

There are two related issues:

### Issue 1: Timezone Mismatch in Position Calculation

In `AgendaCalendarItem.tsx`, the position calculation mixes UTC and local times:

```typescript
const dayStart = new Date(itemStart);       // itemStart is from DB (UTC string)
dayStart.setHours(startHour, 0, 0, 0);      // Sets 8 AM in LOCAL timezone
const minutesFromStart = differenceInMinutes(itemStart, dayStart);
```

When `itemStart` is "2026-01-29 09:00:00+00" (9 AM UTC), and the user is in PST (UTC-8):
- `itemStart` becomes 1 AM local time
- `dayStart` is set to 8 AM local time
- `minutesFromStart` = -420 (7 hours before!)
- Item renders with `top: -168px` (completely off-screen)

### Issue 2: Visible Time Range Too Narrow

The calendar defaults to 8 AM - 6 PM (`startHour = 8`, `endHour = 18`). Database items span 9 AM - 4 PM UTC, which maps to different local hours depending on timezone. Users in timezones behind UTC see empty calendars because all events fall before their 8 AM.

## Solution

### Fix 1: Extend Default Visible Hours

Expand the default time range to capture more events:
- Change `startHour` from 8 to 6 (6 AM)
- Change `endHour` from 18 to 22 (10 PM)

This provides a wider window that accommodates timezone differences.

### Fix 2: Clamp Items to Visible Grid

Add boundary checking in `AgendaCalendarItem` to ensure items that fall outside the visible range are either:
- Clamped to the visible area (partial visibility), OR
- Not rendered if completely outside

### Fix 3: Make Hours Dynamic (Optional Enhancement)

Calculate `startHour` and `endHour` dynamically based on the actual agenda items' local times:
- Find the earliest item start time (in local timezone)
- Find the latest item end time (in local timezone)
- Set visible range to encompass all items with padding

## Implementation Details

### File: `src/components/events/agenda/AgendaCalendarView.tsx`

**Change 1**: Extend default hours

```typescript
// Before
startHour = 8,
endHour = 18,

// After
startHour = 6,
endHour = 22,
```

**Change 2**: Calculate dynamic hours based on agenda items

```typescript
// Calculate earliest and latest times from agenda items
const { dynamicStartHour, dynamicEndHour } = useMemo(() => {
  if (agendaItems.length === 0) {
    return { dynamicStartHour: startHour, dynamicEndHour: endHour };
  }
  
  let earliest = 23;
  let latest = 0;
  
  agendaItems.forEach(item => {
    const start = new Date(item.starts_at);
    const end = item.ends_at ? new Date(item.ends_at) : addMinutes(start, 30);
    earliest = Math.min(earliest, start.getHours());
    latest = Math.max(latest, end.getHours() + 1);
  });
  
  return {
    dynamicStartHour: Math.min(earliest, startHour),
    dynamicEndHour: Math.max(latest, endHour)
  };
}, [agendaItems, startHour, endHour]);
```

### File: `src/components/events/agenda/AgendaCalendarItem.tsx`

**Change 3**: Add visibility check and clamp positioning

```typescript
export function AgendaCalendarItem({ item, startHour, endHour, onClick }) {
  const itemStart = new Date(item.starts_at);
  const itemEnd = item.ends_at ? new Date(item.ends_at) : addMinutes(itemStart, 30);
  
  // Get local hours for visibility check
  const itemStartHour = itemStart.getHours() + itemStart.getMinutes() / 60;
  const itemEndHour = itemEnd.getHours() + itemEnd.getMinutes() / 60;
  
  // Skip rendering if completely outside visible range
  if (itemEndHour <= startHour || itemStartHour >= endHour) {
    return null;
  }
  
  // Calculate position relative to the grid start hour
  const gridStartMinutes = startHour * 60;
  const itemStartMinutes = itemStart.getHours() * 60 + itemStart.getMinutes();
  const minutesFromGridStart = itemStartMinutes - gridStartMinutes;
  
  // Clamp to visible area if item starts before grid
  const clampedMinutesFromStart = Math.max(0, minutesFromGridStart);
  const topPosition = (clampedMinutesFromStart / 15) * ROW_HEIGHT;
  
  // Adjust height if clamped
  const durationMinutes = differenceInMinutes(itemEnd, itemStart);
  const visibleDuration = minutesFromGridStart < 0 
    ? durationMinutes + minutesFromGridStart 
    : durationMinutes;
  const heightRows = Math.max(1, visibleDuration / 15);
  const height = heightRows * ROW_HEIGHT;
  
  // ... rest of component
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/agenda/AgendaCalendarView.tsx` | Add dynamic hour calculation, widen default range, pass `endHour` to items |
| `src/components/events/agenda/AgendaCalendarItem.tsx` | Add `endHour` prop, fix position calculation to use local hours, add visibility bounds check |

## Testing Checklist

After implementation, verify:
- All 26 agenda items appear on the calendar
- Items are positioned at the correct time slots matching their displayed times
- Items that span grid boundaries are partially visible (not hidden)
- Navigation between days works correctly
- Current time indicator still appears correctly

