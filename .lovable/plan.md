

# Add Test User to First Gen 2026 Event

## Problem

The user `mflotron91@gmail.com` cannot access the attendee app at `/attendee/app/home` because:
1. They have no orders associated with their email address
2. They are not listed as an attendee on any existing order
3. The `get-orders-by-email` edge function only matches on the **order purchaser email**, not attendee emails

## Solution

Two changes are needed:

### 1. Create Test Order for User

Insert a complete test order with:
- Order for `mflotron91@gmail.com` with status `completed`
- Order item with 1 "In-Person - Early Bird" ticket
- Attendee record linking to the order item

### 2. Update Edge Function (Enhancement)

Modify `get-orders-by-email` to also find orders where the user is listed as an attendee (not just as the purchaser). This ensures:
- Purchasers can see their orders (current behavior)
- Named attendees can also access the app for events they're registered for

---

## Database Changes

### Insert Test Order

| Table | Data |
|-------|------|
| `orders` | Order for mflotron91@gmail.com, status=completed, event=First Gen 2026 |
| `order_items` | 1x In-Person Early Bird ticket ($325) |
| `attendees` | Matt Flotron as attendee with email mflotron91@gmail.com |

SQL will use CTEs to:
1. Insert the order and capture its ID
2. Insert the order item referencing the order
3. Insert the attendee referencing both order and order item

---

## Edge Function Changes

### File: `supabase/functions/get-orders-by-email/index.ts`

Update the query to find orders where:
- The order email matches the user (current), OR
- The user's email appears in the attendees list for that order (new)

This change uses a subquery to find order IDs where the user appears as an attendee, then combines results with the purchaser query.

---

## Technical Details

### Order Data

| Field | Value |
|-------|-------|
| order_number | ORD-20260208-TEST1 |
| email | mflotron91@gmail.com |
| full_name | Matt Flotron |
| status | completed |
| event_id | 2e062f79-1693-4883-a3c5-623121810c57 |
| ticket_type | In-Person - Early Bird (c51357f9-a41a-4e9b-8d77-031f4f65d724) |
| price | $325.00 |

### Updated Query Logic

```text
Current:  WHERE orders.email = user_email
New:      WHERE orders.email = user_email 
             OR orders.id IN (SELECT order_id FROM attendees WHERE attendee_email = user_email)
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Insert order, order_item, attendee records |
| `supabase/functions/get-orders-by-email/index.ts` | Add attendee email matching |

---

## Expected Result

After these changes:
1. `mflotron91@gmail.com` can log in via magic link at `/attendee`
2. The First Gen 2026 event appears in their event list
3. They can access all attendee app features (agenda, networking, messages, etc.)
4. Other registered attendees (not just purchasers) can also access their events

