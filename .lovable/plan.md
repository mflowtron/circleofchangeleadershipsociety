
# Fix Duplicate Ticket Types in Attendees Filter

## Problem
The ticket type filter dropdown shows many duplicate entries (e.g., "In-Person Early Bird" appears multiple times). This happens because the deduplication logic uses `order_item_id` as the unique key, but each attendee has a unique `order_item_id` even when they share the same ticket type.

## Root Cause
In `Attendees.tsx`, the ticket types are being extracted like this:

```typescript
const ticketTypes = Array.from(
  new Map(
    attendees
      .filter((a) => a.ticket_type)
      .map((a) => [a.order_item_id || '', { id: a.order_item_id || '', name: a.ticket_type?.name || '' }])
  ).values()
);
```

The Map key is `order_item_id`, which is unique per attendee—not per ticket type. So every attendee creates a new entry even if they have the same ticket type.

## Solution
Change the deduplication to use the **ticket type name** as the key. Since ticket types should be unique by name (within an event), this will correctly consolidate duplicates.

---

## Changes

### File: `src/pages/events/manage/Attendees.tsx`

**Before:**
```typescript
const ticketTypes = Array.from(
  new Map(
    attendees
      .filter((a) => a.ticket_type)
      .map((a) => [a.order_item_id || '', { id: a.order_item_id || '', name: a.ticket_type?.name || '' }])
  ).values()
);
```

**After:**
```typescript
const ticketTypes = Array.from(
  new Map(
    attendees
      .filter((a) => a.ticket_type?.name)
      .map((a) => [a.ticket_type!.name, { id: a.ticket_type!.name, name: a.ticket_type!.name }])
  ).values()
);
```

### File: `src/components/events/AttendeesTable.tsx`

Update the filter logic to match by ticket type name directly instead of looking up by ID:

**Before (line 64):**
```typescript
const matchesTicket = ticketFilter === 'all' || attendee.ticket_type?.name === ticketTypes.find(t => t.id === ticketFilter)?.name;
```

**After:**
```typescript
const matchesTicket = ticketFilter === 'all' || attendee.ticket_type?.name === ticketFilter;
```

---

## Visual Result

| Before | After |
|--------|-------|
| In-Person Early Bird | In-Person Early Bird |
| In-Person Early Bird | Virtual Early Bird |
| In-Person Early Bird | |
| Virtual Early Bird | |
| In-Person Early Bird | |
| Virtual Early Bird | |
| ... (many more duplicates) | |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/events/manage/Attendees.tsx` | Use ticket type name as the Map key for deduplication |
| `src/components/events/AttendeesTable.tsx` | Simplify filter matching to compare names directly |

