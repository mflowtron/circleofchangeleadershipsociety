

# Add Timezone Toggle to Agenda Calendar View

## Overview

Currently, the Agenda Calendar displays times based on the browser's local timezone with no indication of the event's actual timezone. Since event organizers work across many timezones, this causes confusion when the event is held in a different timezone than the viewer.

This feature adds:
1. A **timezone field** for events (stored in the database)
2. A **toggle switch** in the calendar header to switch between "My Time" (local) and "Event Time"
3. Proper timezone conversion for all displayed times and item positioning

---

## Current State

- **Events table**: No timezone column exists
- **Agenda times**: Stored as UTC `timestamp with time zone` in the database
- **Display**: Uses browser's local timezone via JavaScript `Date` object
- **Dependencies**: Only `date-fns` is available (no timezone library yet)

---

## Implementation Steps

### Step 1: Add Timezone Column to Events Table

Add a new `timezone` column to store the event's timezone as an IANA timezone identifier (e.g., "America/New_York"):

```text
Column: timezone
Type: TEXT
Default: 'America/New_York'
Nullable: YES
```

Also update the First Gen 2026 event to use "America/New_York" (Eastern Time for Miami, FL).

### Step 2: Install date-fns-tz Library

Add the `date-fns-tz` package which provides timezone-aware formatting and conversion functions that integrate with the existing `date-fns` library.

### Step 3: Create Timezone Utility Functions

Create a new utility file `src/lib/timezoneUtils.ts` with:

| Function | Purpose |
|----------|---------|
| `getLocalTimezone()` | Returns the user's browser timezone |
| `formatInTimezone(date, timezone, formatStr)` | Formats a date in a specific timezone |
| `getTimezoneAbbreviation(timezone)` | Gets short name like "EST" or "PST" |
| `convertToTimezone(date, fromTz, toTz)` | Converts between timezones |
| `COMMON_TIMEZONES` | List of common US timezones for the dropdown |

### Step 4: Update Event Form

Add a timezone selector to `EventForm.tsx` in the "Date and Time" section:

- Dropdown with common US timezones
- Defaults to "America/New_York"
- Shows timezone abbreviation next to the selection

### Step 5: Update useEvents Hook

Update the `Event` interface and hook to include the timezone field in queries and mutations.

### Step 6: Update AgendaBuilder Component

Pass the event's timezone down to the calendar view:

- Fetch the event data using `useEventById`
- Pass `eventTimezone` prop to `AgendaCalendarView`

### Step 7: Add Timezone Toggle to AgendaCalendarView

Add a toggle switch in the header section:

```text
+-------------------------------------------+
| < Today >     [My Time | Event Time]  Apr 17-19 |
+-------------------------------------------+
```

**UI Elements:**
- Toggle group with two options: "My Time" and "Event Time"
- When "Event Time" selected, show timezone abbreviation (e.g., "EDT")
- State stored in component (not persisted)

### Step 8: Update Time Display Logic

Modify the calendar rendering to respect the selected timezone:

| Component | Change |
|-----------|--------|
| Time column labels | Format hours using selected timezone |
| Current time indicator | Convert "now" to selected timezone |
| `isToday` check | Compare dates in selected timezone |
| Click-to-create | Create Date in event timezone when that mode is active |

### Step 9: Update AgendaCalendarItem

Update the item positioning and time display to use the selected timezone:

- Receive `displayTimezone` prop
- Calculate `topPosition` using timezone-aware hours/minutes
- Format tooltip times in the selected timezone

### Step 10: Update AgendaItemForm (Optional Enhancement)

Show a hint about which timezone times are being entered in when creating/editing items.

---

## Technical Details

### Data Flow

```text
AgendaBuilder
  |-- useEventById(eventId) --> event.timezone
  |
  +-- AgendaCalendarView
        |-- timezoneMode: 'local' | 'event'
        |-- displayTimezone: computed from mode + event.timezone
        |
        +-- AgendaCalendarItem
              |-- displayTimezone prop
              |-- timezone-aware positioning
```

### Timezone Conversion Strategy

Since dates are stored as UTC in the database:

1. **Event Time Mode**: Convert UTC to event timezone for display
2. **My Time Mode**: Convert UTC to browser's local timezone (current behavior)
3. **Creating Items**: When in "Event Time" mode, interpret input times as event timezone

### Common Timezones List

```text
America/New_York    (Eastern)
America/Chicago     (Central)
America/Denver      (Mountain)
America/Los_Angeles (Pacific)
America/Anchorage   (Alaska)
Pacific/Honolulu    (Hawaii)
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/timezoneUtils.ts` | Create - utility functions |
| `src/hooks/useEvents.ts` | Modify - add timezone to Event interface |
| `src/components/events/EventForm.tsx` | Modify - add timezone selector |
| `src/components/events/agenda/AgendaBuilder.tsx` | Modify - fetch event, pass timezone |
| `src/components/events/agenda/AgendaCalendarView.tsx` | Modify - add toggle, timezone logic |
| `src/components/events/agenda/AgendaCalendarItem.tsx` | Modify - accept timezone prop |
| Database migration | Create - add timezone column |

---

## User Experience

### For Event Organizers

1. When creating/editing an event, select the event's timezone
2. In the Agenda Calendar, toggle between viewing in your time or event time
3. Clear indicator shows which timezone is active

### Visual Design

- Toggle styled consistently with existing List/Calendar toggle
- When "Event Time" is selected, show timezone abbreviation like "(EDT)"
- Subtle indicator in the time column header showing current display timezone

