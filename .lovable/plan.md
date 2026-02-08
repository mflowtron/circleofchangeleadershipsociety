

# Add In-Person/Virtual Filter to Attendees Table

## Overview
Add a new filter dropdown to the Attendees table that allows organizers to filter attendees by their attendance type (in-person or virtual), based on the `is_virtual` property of their ticket type.

---

## Current Filters

The AttendeesTable currently has:
- **Search**: Text search across name, email, order number
- **Ticket Type**: Filter by specific ticket type name
- **Status**: Filter by Complete/Incomplete registration status

## New Filter

Add an **Attendance Type** filter:
- All Types (default)
- In-Person
- Virtual

---

## Changes

### File: `src/components/events/AttendeesTable.tsx`

**1. Add new state for attendance type filter:**
```typescript
const [attendanceFilter, setAttendanceFilter] = useState<string>('all');
```

**2. Update the filtering logic:**
```typescript
// Attendance type filter (in-person vs virtual)
const matchesAttendance =
  attendanceFilter === 'all' ||
  (attendanceFilter === 'in-person' && !attendee.ticket_type?.is_virtual) ||
  (attendanceFilter === 'virtual' && attendee.ticket_type?.is_virtual);

return matchesSearch && matchesTicket && matchesStatus && matchesAttendance;
```

**3. Add filter dropdown in the filters section:**
```tsx
<Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
  <SelectTrigger className="flex-1 sm:flex-none sm:w-[150px]">
    <SelectValue placeholder="Attendance" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Types</SelectItem>
    <SelectItem value="in-person">🏠 In-Person</SelectItem>
    <SelectItem value="virtual">💻 Virtual</SelectItem>
  </SelectContent>
</Select>
```

**4. Update stats to show breakdown:**
Add in-person and virtual counts to the stats bar:
```typescript
const inPersonCount = attendees.filter(a => !a.ticket_type?.is_virtual).length;
const virtualCount = attendees.filter(a => a.ticket_type?.is_virtual).length;
```

---

## Visual Result

### Stats Bar (Updated)
```text
┌─────────────────────────────────────────────────────────────────────┐
│  Total: [125]  Complete: [98]  Incomplete: [27]                     │
│  🏠 In-Person: [85]  💻 Virtual: [40]                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Filters Row (Updated)
```text
┌─────────────────────────────────────────────────────────────────────┐
│  [🔍 Search attendees...                                    ]       │
│                                                                     │
│  [All Tickets ▼]  [All Status ▼]  [All Types ▼]  [📥 Export]       │
│                                    ├──────────────┤                 │
│                                    │ All Types    │                 │
│                                    │ 🏠 In-Person │                 │
│                                    │ 💻 Virtual   │                 │
│                                    └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/AttendeesTable.tsx` | Add attendance type filter state, dropdown, filtering logic, and stats display |

---

## Technical Notes

- The `is_virtual` property is already available on `attendee.ticket_type` from the updated hooks
- Filter uses same pattern as existing ticket type and status filters
- Emojis (🏠, 💻) provide visual consistency with the Manage Tickets page
- Stats breakdown helps organizers quickly see the split between attendance types

