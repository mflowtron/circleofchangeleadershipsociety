

# Registration Data Model Enhancement

## Problem Statement

When an advisor or individual registers for a conference, the system currently captures:
- **Purchaser information** (name, email) on the Order
- **Individual attendee information** (name, email) on each Attendee record

However, there's no way to:
1. Track whether the purchaser/advisor is personally attending
2. Identify which attendee record (if any) represents the purchaser
3. Display this "purchaser attending" status to organizers

---

## Current Data Model

```text
+------------------+          +------------------+          +------------------+
|     orders       |          |   order_items    |          |    attendees     |
+------------------+          +------------------+          +------------------+
| id               |<-------->| order_id         |<-------->| order_id         |
| full_name        |          | ticket_type_id   |          | order_item_id    |
| email            |          | quantity         |          | attendee_name    |
| phone            |          | unit_price_cents |          | attendee_email   |
| status           |          +------------------+          | additional_info  |
+------------------+                                        +------------------+
```

**Gap:** No relationship between the purchaser and whether they are an attendee.

---

## Proposed Solution

Add two fields to track purchaser attendance:

### Database Changes

**1. Add `purchaser_is_attending` to orders table**

Captures at checkout whether the purchaser themselves will attend.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `purchaser_is_attending` | boolean | null | Whether the purchaser plans to attend |

**2. Add `is_purchaser` to attendees table**

Flags the attendee record that represents the order purchaser.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_purchaser` | boolean | false | Whether this attendee is the order purchaser |

---

## Updated Data Flow

### Checkout Flow

1. On checkout page, add a question: **"Will you be attending this event?"**
   - Options: Yes / No / I'm not sure yet
2. Store the answer in `orders.purchaser_is_attending`
3. If "Yes", auto-create one attendee with `is_purchaser = true` and pre-fill with purchaser info

### Order Portal Flow

When the purchaser edits attendees:
- If `purchaser_is_attending = true`, show a prominent first slot for "Your registration"
- Allow the purchaser to toggle their attendance status
- When toggled on, auto-fill their name/email from the order

### Admin Views

- **Orders Table**: Show badge/icon if purchaser is attending
- **Attendees Table**: Show "Purchaser" badge next to the purchaser's attendee record
- **Order Detail**: Highlight the purchaser row in the attendees list

---

## Implementation Plan

### Phase 1: Database Schema

Add new columns via migration:

```sql
-- Add purchaser attendance tracking to orders
ALTER TABLE orders 
ADD COLUMN purchaser_is_attending boolean DEFAULT null;

-- Add purchaser flag to attendees
ALTER TABLE attendees 
ADD COLUMN is_purchaser boolean DEFAULT false;
```

### Phase 2: Checkout Form Updates

**File: `src/pages/events/Checkout.tsx`**

Add a checkbox/radio question:
- "Will you be attending this event?"
- Pass the answer to the checkout edge function

**File: `supabase/functions/create-event-checkout/index.ts`**

- Accept `purchaser_is_attending` in the request body
- Store it on the order
- If true and they purchased a ticket, create one attendee with:
  - `is_purchaser = true`
  - `attendee_name = buyer_name`
  - `attendee_email = buyer_email`

### Phase 3: Order Portal Updates

**File: `src/components/orders/AttendeeList.tsx`**

- Show purchaser attendee first with "You" or "Purchaser" badge
- Add toggle for purchaser to mark themselves as attending
- When toggled on, auto-fill their info

**File: `src/hooks/useOrderPortal.ts`**

- Add function to toggle purchaser attendance
- Handle creating/updating the purchaser's attendee record

### Phase 4: Admin View Updates

**File: `src/components/events/AttendeesTable.tsx`**

- Add "Purchaser" badge column
- Highlight purchaser rows

**File: `src/pages/events/manage/OrderDetail.tsx`**

- Show purchaser attending status in customer info card
- Highlight the purchaser's attendee row

**File: `src/components/events/OrdersTable.tsx`**

- Add icon/badge for orders where purchaser is attending

### Phase 5: Edge Function Updates

**File: `supabase/functions/verify-event-payment/index.ts`**

- Respect `purchaser_is_attending` when creating attendee records
- Create purchaser attendee with `is_purchaser = true`

**File: `supabase/functions/get-orders-by-email/index.ts`**

- Include `purchaser_is_attending` in order response
- Include `is_purchaser` in attendee response

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `purchaser_is_attending` to orders, `is_purchaser` to attendees |
| `src/pages/events/Checkout.tsx` | Add "Will you attend?" question |
| `supabase/functions/create-event-checkout/index.ts` | Handle purchaser attendance flag |
| `supabase/functions/verify-event-payment/index.ts` | Create purchaser attendee correctly |
| `supabase/functions/get-orders-by-email/index.ts` | Include new fields in response |
| `src/components/orders/AttendeeList.tsx` | Show purchaser badge, add toggle |
| `src/hooks/useOrderPortal.ts` | Add toggle purchaser attendance function |
| `src/hooks/useAttendees.ts` | Include `is_purchaser` in type and queries |
| `src/components/events/AttendeesTable.tsx` | Show purchaser badge |
| `src/pages/events/manage/OrderDetail.tsx` | Highlight purchaser, show status |
| `src/components/events/OrdersTable.tsx` | Show attending indicator |
| `docs/DATA_DICTIONARY.md` | Document new columns |

---

## UX Examples

### Checkout Page

```text
+------------------------------------------+
| Your Information                         |
| [Name: John Smith              ]         |
| [Email: john@school.edu        ]         |
|                                          |
| Will you be attending this event?        |
| (●) Yes, I will attend                   |
| ( ) No, I'm registering others only      |
+------------------------------------------+
```

### Order Portal - Attendee List

```text
+------------------------------------------+
| Advisor Ticket (1)                       |
| +--------------------------------------+ |
| | [You - Purchaser]        [Complete]  | |
| | John Smith                           | |
| | john@school.edu                      | |
| +--------------------------------------+ |
|                                          |
| Student Ticket (3)                       |
| +--------------------------------------+ |
| | Attendee 1               [Incomplete]| |
| | Please add attendee details          | |
| +--------------------------------------+ |
```

### Admin - Attendees Table

```text
| Status   | Attendee      | Email           | Ticket  | Purchaser |
|----------|---------------|-----------------|---------|-----------|
| Complete | John Smith    | john@school.edu | Advisor | ✓         |
| Pending  | -             | -               | Student |           |
| Pending  | -             | -               | Student |           |
```

