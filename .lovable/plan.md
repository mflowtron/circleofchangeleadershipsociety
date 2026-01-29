

# Fix Calendar View Hours to Match Visible Time Period

## Problem

The calendar currently calculates visible hours based on **all** agenda items across all days in the event. This means:
- Navigating to a 3-day period with events from 9 AM - 4 PM still shows hours based on events from other days
- The visible time range doesn't adapt when you navigate to different date ranges

## Solution

Change the dynamic hour calculation to only consider items from the **currently visible 3-day period** instead of all agenda items.

## Implementation

### File: `src/components/events/agenda/AgendaCalendarView.tsx`

**Current Code (lines 56-75):**
```typescript
const { startHour, endHour } = useMemo(() => {
  if (agendaItems.length === 0) {
    return { startHour: defaultStartHour, endHour: defaultEndHour };
  }
  
  let earliest = 23;
  let latest = 0;
  
  agendaItems.forEach(item => {  // <-- Iterates ALL items
    const start = new Date(item.starts_at);
    const end = item.ends_at ? new Date(item.ends_at) : addMinutes(start, 30);
    earliest = Math.min(earliest, start.getHours());
    latest = Math.max(latest, end.getHours() + 1);
  });
  
  return {
    startHour: Math.min(earliest, defaultStartHour),
    endHour: Math.max(latest, defaultEndHour)
  };
}, [agendaItems, defaultStartHour, defaultEndHour]);
```

**Updated Logic:**

1. Move the hour calculation **after** the `days` and `itemsByDay` computations
2. Filter to only items visible in the current 3-day period
3. Calculate hours from those filtered items only

```typescript
// Move after itemsByDay is computed

const { startHour, endHour } = useMemo(() => {
  // Get only items from the visible 3-day period
  const visibleItems = days.flatMap(day => {
    const dayKey = format(day, 'yyyy-MM-dd');
    return itemsByDay[dayKey] || [];
  });
  
  if (visibleItems.length === 0) {
    return { startHour: defaultStartHour, endHour: defaultEndHour };
  }
  
  let earliest = 23;
  let latest = 0;
  
  visibleItems.forEach(item => {
    const start = new Date(item.starts_at);
    const end = item.ends_at ? new Date(item.ends_at) : addMinutes(start, 30);
    earliest = Math.min(earliest, start.getHours());
    latest = Math.max(latest, end.getHours() + 1);
  });
  
  return {
    startHour: Math.min(earliest, defaultStartHour),
    endHour: Math.max(latest, defaultEndHour)
  };
}, [days, itemsByDay, defaultStartHour, defaultEndHour]);
```

### Dependency Reordering

The current code structure has a circular dependency issue:
- `days` depends on `viewStartDate`
- `itemsByDay` depends on `days` and `agendaItems`
- `startHour/endHour` currently doesn't depend on `days`

We need to reorder the useMemo hooks:

1. Keep `days` first (depends on `viewStartDate`)
2. Create `itemsByDay` second (depends on `days`, `agendaItems`)
3. Move `startHour/endHour` calculation third (depends on `days`, `itemsByDay`)
4. Update `timeSlots` to depend on the new hour values

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/agenda/AgendaCalendarView.tsx` | Reorder useMemo hooks, change hour calculation to filter by visible days only |

## Result

- When viewing Jan 29-31 with events from 9 AM-4 PM, calendar shows 6 AM-10 PM (within defaults)
- When navigating to Feb 1-3 with events from 7 AM-9 PM, calendar adjusts to show that range
- Empty date ranges fall back to default 6 AM-10 PM

