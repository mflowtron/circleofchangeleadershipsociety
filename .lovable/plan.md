

# Fix Speaker Name Overlapping with Session Title in Calendar View

## Problem

In the agenda calendar view, speaker names like "Marta Skull" are overlapping with session titles like "Workshop: Mental Health & Wellness". This creates an unreadable and confusing display.

## Root Cause

Each `AgendaCalendarItem` component has its own `TooltipProvider` wrapper. When multiple agenda items are rendered close together in the calendar grid, their tooltips can overlap and render at incorrect positions. The Radix UI tooltip documentation recommends using a single `TooltipProvider` at the app or container level to coordinate tooltip display.

The current structure:

```text
AgendaCalendarView
  AgendaCalendarItem (TooltipProvider wraps each item)
    Tooltip
      TooltipTrigger
      TooltipContent (shows speakers here)
  AgendaCalendarItem (TooltipProvider wraps each item)
    Tooltip
      ...
  (Many more items, each with their own TooltipProvider)
```

When tooltips from multiple providers overlap, z-index and positioning conflicts occur.

## Solution

1. **Move TooltipProvider up to AgendaCalendarView level** - Wrap the calendar grid with a single `TooltipProvider` so all tooltips are coordinated
2. **Update AgendaCalendarItem** - Remove the individual `TooltipProvider` wrapper from each item
3. **Ensure proper z-index** - Add explicit z-index to tooltip content for agenda items to ensure they render above other items

## Implementation Details

### File: `src/components/events/agenda/AgendaCalendarView.tsx`

**Change 1**: Import TooltipProvider from ui/tooltip

```typescript
import { TooltipProvider } from '@/components/ui/tooltip';
```

**Change 2**: Wrap the calendar grid with TooltipProvider

```typescript
return (
  <TooltipProvider delayDuration={300}>
    <div className="flex flex-col h-full">
      {/* ... existing content ... */}
    </div>
  </TooltipProvider>
);
```

### File: `src/components/events/agenda/AgendaCalendarItem.tsx`

**Change 3**: Remove individual TooltipProvider wrapper

Before:
```typescript
return (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        ...
      </TooltipTrigger>
      <TooltipContent>...</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
```

After:
```typescript
return (
  <Tooltip>
    <TooltipTrigger asChild>
      ...
    </TooltipTrigger>
    <TooltipContent side="right" className="max-w-xs z-50">
      ...
    </TooltipContent>
  </Tooltip>
);
```

**Change 4**: Remove unused TooltipProvider import

```typescript
// Before
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// After
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/agenda/AgendaCalendarView.tsx` | Import TooltipProvider, wrap entire calendar grid |
| `src/components/events/agenda/AgendaCalendarItem.tsx` | Remove TooltipProvider wrapper, remove unused import |

## Testing Checklist

After implementation, verify:
- Hover over calendar items shows tooltip on the right side
- Tooltips don't overlap with item titles
- Speaker names only appear in tooltip, not overlapping with the item
- Tooltips disappear properly when moving to a different item
- Multiple items can be hovered in sequence without visual glitches

