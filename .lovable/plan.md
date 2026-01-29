

# Data Cleanup Plan for mflotron91@gmail.com

## Current State Summary

| Category | Current | Target |
|----------|---------|--------|
| Orders | 7 (6 pending, 1 completed) | 1 completed |
| Attendees | 1 (with wrong email) | 5 (1 with correct login email) |

## Data Cleanup Steps

### Step 1: Delete Pending Orders and Related Records

Delete the 6 pending orders and their associated order_items and attendees:

```sql
-- Delete attendees for pending orders first (foreign key constraint)
DELETE FROM attendees 
WHERE order_id IN (
  '11db91c9-e762-4fab-9c55-e42b5a6efaf2',
  '0313cff7-516d-4bea-9c35-136ea994ec5b',
  '5213170d-327a-4dda-b7e6-99a955b88e27',
  '01897349-5f4d-476d-9180-98ceac1d73d0',
  '48ac4965-743d-4876-b979-2e056d6bfa33',
  '1c352238-57a0-46e9-8565-74d541c0b3b0'
);

-- Delete order_items for pending orders
DELETE FROM order_items 
WHERE order_id IN (
  '11db91c9-e762-4fab-9c55-e42b5a6efaf2',
  '0313cff7-516d-4bea-9c35-136ea994ec5b',
  '5213170d-327a-4dda-b7e6-99a955b88e27',
  '01897349-5f4d-476d-9180-98ceac1d73d0',
  '48ac4965-743d-4876-b979-2e056d6bfa33',
  '1c352238-57a0-46e9-8565-74d541c0b3b0'
);

-- Delete pending orders
DELETE FROM orders 
WHERE id IN (
  '11db91c9-e762-4fab-9c55-e42b5a6efaf2',
  '0313cff7-516d-4bea-9c35-136ea994ec5b',
  '5213170d-327a-4dda-b7e6-99a955b88e27',
  '01897349-5f4d-476d-9180-98ceac1d73d0',
  '48ac4965-743d-4876-b979-2e056d6bfa33',
  '1c352238-57a0-46e9-8565-74d541c0b3b0'
);
```

### Step 2: Update Completed Order for 5 Tickets

Update the completed order to reflect 5 tickets:

```sql
-- Update the order totals (5 x $300 = $1,500)
UPDATE orders 
SET subtotal_cents = 150000, total_cents = 150000
WHERE id = '747b528a-ad22-4ba9-8f1a-9886f111cb1a';

-- Update order_item quantity to 5
UPDATE order_items 
SET quantity = 5
WHERE id = '3096aa03-a7dd-4766-8eae-6152a6ca270a';
```

### Step 3: Fix Existing Attendee Email and Add 4 More

```sql
-- Fix the existing attendee email (currently missing "91")
UPDATE attendees 
SET attendee_email = 'mflotron91@gmail.com'
WHERE id = '1fe2f258-13ab-42cb-a517-18020be38ba8';

-- Add 4 more attendees (names can be updated later)
INSERT INTO attendees (order_id, order_item_id, ticket_type_id, attendee_name, attendee_email)
VALUES 
  ('747b528a-ad22-4ba9-8f1a-9886f111cb1a', '3096aa03-a7dd-4766-8eae-6152a6ca270a', 'f17a649e-1b11-4d49-a6b3-e4b544a8fe12', 'Attendee 2', NULL),
  ('747b528a-ad22-4ba9-8f1a-9886f111cb1a', '3096aa03-a7dd-4766-8eae-6152a6ca270a', 'f17a649e-1b11-4d49-a6b3-e4b544a8fe12', 'Attendee 3', NULL),
  ('747b528a-ad22-4ba9-8f1a-9886f111cb1a', '3096aa03-a7dd-4766-8eae-6152a6ca270a', 'f17a649e-1b11-4d49-a6b3-e4b544a8fe12', 'Attendee 4', NULL),
  ('747b528a-ad22-4ba9-8f1a-9886f111cb1a', '3096aa03-a7dd-4766-8eae-6152a6ca270a', 'f17a649e-1b11-4d49-a6b3-e4b544a8fe12', 'Attendee 5', NULL);
```

## Final State After Cleanup

| Table | Records |
|-------|---------|
| Orders | 1 completed order (ORD-20260128-0009) |
| Order Items | 1 item with quantity = 5 |
| Attendees | 5 attendees (1 with mflotron91@gmail.com for login, 4 placeholders) |

## Technical Notes

- The cleanup uses the Insert Tool (not migrations) since these are data operations
- The attendee with `mflotron91@gmail.com` will be able to log into the attendee app using the OTP flow
- The other 4 attendees can have their names/emails updated later through the order management UI

