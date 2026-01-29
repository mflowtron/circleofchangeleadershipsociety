
# Add Empty Time Slot Clicking to Create Agenda Items

## Overview

Enable clicking on empty time slots in the calendar view to create new agenda items pre-populated with the selected date and time. This provides a more intuitive way to add items directly at specific times instead of using the "Add Item" button and manually setting the time.

## Current State

- `AgendaCalendarView.tsx` renders a 3-day grid with 15-minute time slots
- Grid lines are rendered as divs but have no click handlers
- `AgendaBuilder.tsx` manages the form state and passes `onEditItem` to the calendar view
- `AgendaItemForm.tsx` accepts optional `item` prop to pre-populate the form

## Design

### User Experience

1. User hovers over an empty time slot - cursor changes to crosshair
2. User clicks on empty slot - form opens with date/time pre-filled
3. Default duration of 30 minutes is applied (end time = start time + 30 min)

### Visual Feedback

- Subtle hover effect on time slots (slightly darker background)
- Click area spans the full width of each day column
- Existing agenda items remain clickable (edit behavior unchanged)

## Implementation

### 1. Update AgendaCalendarView Props

Add a new callback for creating items at a specific time:

```typescript
interface AgendaCalendarViewProps {
  agendaItems: AgendaItem[];
  onEditItem: (item: AgendaItem) => void;
  onCreateItem: (dateTime: Date) => void;  // NEW
  eventStartDate?: Date;
  startHour?: number;
  endHour?: number;
}
```

### 2. Create Clickable Time Slot Component

Create a new `AgendaCalendarTimeSlotRow.tsx` component or inline clickable areas that:
- Handle click events on empty parts of the grid
- Calculate the exact time based on click position
- Call `onCreateItem` with the computed datetime

### 3. Modify Grid Rendering

Replace the passive grid line divs with interactive clickable areas:

```typescript
// In AgendaCalendarView.tsx - Day column time grid section
{timeSlots.map((slot, index) => (
  <div
    key={`slot-${slot.hour}-${slot.minute}`}
    className="absolute w-full cursor-crosshair hover:bg-muted/50 transition-colors"
    style={{ 
      top: `${index * ROW_HEIGHT}px`, 
      height: `${ROW_HEIGHT}px` 
    }}
    onClick={() => handleSlotClick(day, slot)}
  />
))}
```

### 4. Add Click Handler

```typescript
const handleSlotClick = (day: Date, slot: TimeSlot) => {
  const dateTime = new Date(day);
  dateTime.setHours(slot.hour, slot.minute, 0, 0);
  onCreateItem(dateTime);
};
```

### 5. Update AgendaBuilder

Add state to track default date/time for new items:

```typescript
const [defaultDateTime, setDefaultDateTime] = useState<Date | null>(null);

const handleCreateAtTime = (dateTime: Date) => {
  setDefaultDateTime(dateTime);
  setDefaultItemType('session');
  setEditingItem(null);
  setFormOpen(true);
};
```

Pass the new callback to AgendaCalendarView:

```typescript
<AgendaCalendarView
  agendaItems={agendaItems}
  onEditItem={handleEditItem}
  onCreateItem={handleCreateAtTime}  // NEW
/>
```

### 6. Update AgendaItemForm

Add optional `defaultDateTime` prop and use it when no `item` is provided:

```typescript
interface AgendaItemFormProps {
  // ... existing props
  defaultDateTime?: Date | null;  // NEW
}
```

Update the default values logic:

```typescript
const getDefaultDate = () => {
  if (item?.starts_at) {
    return new Date(item.starts_at);
  }
  if (defaultDateTime) {
    return defaultDateTime;
  }
  return new Date();
};

const getDefaultStartTime = () => {
  if (item?.starts_at) {
    return format(new Date(item.starts_at), 'HH:mm');
  }
  if (defaultDateTime) {
    return format(defaultDateTime, 'HH:mm');
  }
  return '09:00';
};

const getDefaultEndTime = () => {
  if (item?.ends_at) {
    return format(new Date(item.ends_at), 'HH:mm');
  }
  if (defaultDateTime) {
    // Default 30 min duration
    return format(addMinutes(defaultDateTime, 30), 'HH:mm');
  }
  return '';
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/agenda/AgendaCalendarView.tsx` | Add `onCreateItem` prop, make time slots clickable |
| `src/components/events/agenda/AgendaBuilder.tsx` | Add `defaultDateTime` state, pass `onCreateItem` to calendar, pass `defaultDateTime` to form |
| `src/components/events/agenda/AgendaItemForm.tsx` | Add `defaultDateTime` prop, use it for default form values |

## Technical Considerations

1. **Click vs Item Collision**: Time slot click handlers are at z-index below agenda items, so clicking an item still triggers edit (not create)

2. **Event Propagation**: Stop propagation on agenda item clicks to prevent triggering slot click underneath

3. **Snap to 15 Minutes**: Clicks always snap to the nearest 15-minute slot

4. **Mobile**: Touch events work the same as clicks
