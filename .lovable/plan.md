

# 3-Day Calendar View for Agenda

## Overview

Create a new calendar-style view for the agenda that displays all items across 3 days with a time grid showing 15-minute intervals. This provides event organizers with a visual timeline similar to Google Calendar or Outlook, making it easier to see the full schedule at a glance and identify gaps or overlaps.

## Design

### Visual Layout

```text
+------------------+------------------+------------------+
|   Day 1 (Mon)    |   Day 2 (Tue)    |   Day 3 (Wed)    |
+------------------+------------------+------------------+
| 8:00 AM   -------|--------|---------|--------|---------|
| 8:15 AM   -------|--------|---------|--------|---------|
| 8:30 AM   -------|--------|---------|--------|---------|
| 8:45 AM   -------|--------|---------|--------|---------|
| 9:00 AM   [Session 1.....][Break   ]|--------|---------|
| 9:15 AM   [...............]        |--------|---------|
| 9:30 AM   [...............]        |--------|---------|
| 9:45 AM   |--------|-------|--------|--------|---------|
| 10:00 AM  [Keynote..........................................]
| ...       [...............................................]
+------------------+------------------+------------------+
```

### Key Features

1. **Time Grid**: 15-minute row intervals from configurable start (default 8:00 AM) to end (default 6:00 PM)
2. **3-Day Columns**: Each day gets a column with date header
3. **Item Blocks**: Agenda items render as positioned blocks spanning their duration
4. **Color Coding**: Different background colors for item types (session, break, meal, etc.)
5. **Clickable Items**: Click to edit, with hover showing full details
6. **Current Time Indicator**: Red line showing current time if viewing today
7. **Day Navigation**: Arrow buttons to shift the 3-day window forward/backward

---

## Implementation

### New Components

**1. `AgendaCalendarView.tsx`** - Main calendar grid component

Responsibilities:
- Render the 3-day column layout with date headers
- Generate the 15-minute time slots as rows
- Position agenda items absolutely within their day columns
- Handle day navigation (previous/next 3 days)

**2. `AgendaCalendarItem.tsx`** - Individual item block

Responsibilities:
- Display item title, time, and type icon
- Calculate height based on duration (15 min = 1 row unit)
- Apply color based on item type
- Show tooltip with full details on hover
- Handle click for editing

**3. `AgendaCalendarTimeSlot.tsx`** - Time row component

Responsibilities:
- Display the time label (hour markers only)
- Render horizontal grid line
- Subtle background for alternate hours

### Updates to Existing Components

**`AgendaBuilder.tsx`**
- Add toggle between "List View" and "Calendar View"
- Pass view mode state to conditionally render AgendaCalendarView

**`Agenda.tsx`**
- No changes needed (already wraps AgendaBuilder)

---

## Technical Details

### Time Slot Calculation

```typescript
// Generate time slots from 8 AM to 6 PM in 15-min intervals
const generateTimeSlots = (startHour = 8, endHour = 18) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push({ hour, minute });
    }
  }
  return slots;
};
```

### Item Positioning

Items are positioned using CSS grid or absolute positioning:

```typescript
// Calculate item position and height
const getItemStyle = (item: AgendaItem, startHour: number) => {
  const itemStart = new Date(item.starts_at);
  const itemEnd = item.ends_at ? new Date(item.ends_at) : addMinutes(itemStart, 30);
  
  // Calculate top position (row offset from start)
  const minutesFromStart = differenceInMinutes(itemStart, setHours(itemStart, startHour));
  const topRow = minutesFromStart / 15;
  
  // Calculate height (number of 15-min slots)
  const durationMinutes = differenceInMinutes(itemEnd, itemStart);
  const heightRows = Math.max(1, durationMinutes / 15);
  
  return {
    top: `${topRow * ROW_HEIGHT}px`,
    height: `${heightRows * ROW_HEIGHT}px`,
  };
};
```

### Day Selection Logic

```typescript
// Default to event start date or first agenda item date
const getInitialStartDate = (event: Event | null, agendaItems: AgendaItem[]) => {
  if (agendaItems.length > 0) {
    return startOfDay(new Date(agendaItems[0].starts_at));
  }
  if (event?.starts_at) {
    return startOfDay(new Date(event.starts_at));
  }
  return startOfDay(new Date());
};
```

### Color Configuration

Reuse existing type colors from `AgendaTypeIcon.tsx`:

```typescript
const ITEM_TYPE_COLORS = {
  session: 'bg-primary/20 border-primary text-primary-foreground',
  break: 'bg-muted border-muted-foreground/30',
  meal: 'bg-orange-500/20 border-orange-500',
  networking: 'bg-green-500/20 border-green-500',
  other: 'bg-purple-500/20 border-purple-500',
};
```

---

## File Structure

```text
src/components/events/agenda/
  AgendaBuilder.tsx          # Update: Add view toggle
  AgendaCalendarView.tsx     # New: Main calendar grid
  AgendaCalendarItem.tsx     # New: Item block component
  AgendaCalendarTimeSlot.tsx # New: Time row component (optional, can inline)
```

---

## User Experience Flow

1. **Access Agenda Page**: Organizer navigates to `/events/manage/agenda`
2. **Default View**: Shows existing list view
3. **Toggle to Calendar**: Click "Calendar View" button
4. **View 3 Days**: See items positioned on a time grid
5. **Navigate Days**: Use arrows to shift the 3-day window
6. **Edit Item**: Click any item block to open the edit dialog
7. **Add Item**: Use existing "Add Item" button (opens form dialog)

---

## Responsive Considerations

- On smaller screens, show 1-day view with horizontal scroll option
- Time labels stick to the left edge when scrolling horizontally
- Item text truncates with ellipsis; full details on hover/click

---

## Additional Features (Optional)

These can be added later:
- Drag-and-drop to reschedule items
- Drag edges to resize item duration
- Click on empty time slot to create new item at that time
- Track columns for multi-track events

