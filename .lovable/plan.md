
# Separate In-Person and Virtual Ticket Types for Check-In

## Overview
Add a flag to distinguish virtual ticket types from in-person ones, so the check-in system only shows and counts attendees with in-person tickets.

---

## Database Changes

### Add `is_virtual` Column to `ticket_types`
Add a boolean column to the `ticket_types` table to indicate whether a ticket is for virtual attendance.

```sql
ALTER TABLE ticket_types 
ADD COLUMN is_virtual boolean NOT NULL DEFAULT false;
```

### Update Existing Data
Set existing virtual ticket types based on their names:

```sql
UPDATE ticket_types 
SET is_virtual = true 
WHERE name ILIKE '%virtual%';
```

---

## Code Changes

### 1. Update TypeScript Interface
**File:** `src/hooks/useTicketTypes.ts`

Add `is_virtual` to the `TicketType` interface and form data types.

### 2. Update Ticket Type Form
**File:** `src/components/events/TicketTypeForm.tsx`

Add a toggle switch to set whether the ticket type is virtual or in-person:

```text
┌─────────────────────────────────────────┐
│  Name: [General Admission          ]   │
│  Description: [                    ]   │
│  Price: [$25.00]  Qty: [100]           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🏠 In-Person   ←→   💻 Virtual │   │
│  │      [Toggle Switch]            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Sales Start: [...]  Sales End: [...]  │
└─────────────────────────────────────────┘
```

### 3. Update Attendee Query in useAttendees.ts
**File:** `src/hooks/useAttendees.ts`

Include `is_virtual` in the `ticket_type` selection so it's available for filtering.

### 4. Filter Check-In to In-Person Only
**File:** `src/components/events/checkin/ManualCheckIn.tsx`

Filter attendees to only show those with non-virtual tickets:

```typescript
const inPersonAttendees = useMemo(() => {
  return attendees.filter(a => !a.ticket_type?.is_virtual);
}, [attendees]);
```

### 5. Update Check-In Stats
**File:** `src/hooks/useCheckins.ts`

Modify `useCheckInStats` to:
- Only count attendees with in-person tickets in the totals
- Only show in-person ticket types in the "By Ticket Type" breakdown

### 6. Update Activity Feed Query
**File:** `src/components/events/checkin/CheckInActivityFeed.tsx`

Include ticket type info so the activity feed can show the ticket type name.

### 7. Update Manage Tickets Table
**File:** `src/pages/events/manage/ManageTickets.tsx`

Add a badge indicator showing "Virtual" or "In-Person" next to each ticket type name.

---

## Visual Changes

### Ticket Management Table
| Name | Type | Price | Sold |
|------|------|-------|------|
| In-Person Early Bird | 🏠 In-Person | $150 | 45/100 |
| Virtual Early Bird | 💻 Virtual | $50 | 120/∞ |

### Check-In Stats
The stats will only show in-person attendees:
- **Total**: 145 (in-person only, excludes 120 virtual)
- **Checked In**: 42
- **Progress**: 29%

### Manual Check-In List
Only shows attendees with in-person tickets. Virtual attendees won't appear.

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `is_virtual` column to `ticket_types` |
| `src/hooks/useTicketTypes.ts` | Add `is_virtual` to interface |
| `src/components/events/TicketTypeForm.tsx` | Add virtual toggle |
| `src/hooks/useAttendees.ts` | Include `is_virtual` in ticket type selection |
| `src/components/events/checkin/ManualCheckIn.tsx` | Filter to in-person only |
| `src/hooks/useCheckins.ts` | Filter stats to in-person only |
| `src/pages/events/manage/ManageTickets.tsx` | Show virtual/in-person badge |

---

## Outcome
- Event organizers can mark ticket types as virtual when creating/editing them
- The check-in system only shows attendees with in-person tickets
- Check-in stats accurately reflect in-person attendance only
- Virtual attendees are still visible in the main Attendees table but excluded from check-in workflows
