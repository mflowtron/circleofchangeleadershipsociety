

# Add 3 Users to Attendee App

## Summary

Create attendee records for all 3 existing users (Michael Flotron, Leanna Mouton, and Joshua Fredenburg) by adding them to orders for the First Gen Career Conference 2026 event.

---

## Users to Add

| User | Email | User ID |
|------|-------|---------|
| Michael Flotron | mflotron91@gmail.com | 6d8fab70-f16c-4092-917c-0da9af673f9a |
| Leanna Mouton | leanna@coclc.org | 18628588-8533-4472-8ab5-3704f4fc5414 |
| Joshua Fredenburg | circleofchangeleadconference@gmail.com | f3387031-a52b-43f8-bf8c-f58abb023cde |

---

## Event Details

| Field | Value |
|-------|-------|
| Event | 2026 First Generation Student Career Leadership Experience |
| Event ID | f47ac10b-58cc-4372-a567-0e02b2c3d479 |
| Ticket Type | In-Person Early Bird ($325) |

---

## Database Operations

### 1. Create 3 Orders (one per user)

Each order will:
- Be linked to the user's `user_id`
- Use the user's email as the order email
- Have status = 'completed'
- Include 1 In-Person Early Bird ticket

### 2. Create 3 Order Items

Link each order to the In-Person Early Bird ticket type with quantity 1.

### 3. Create 3 Attendees

Create attendee records with:
- `attendee_name` = user's full name
- `attendee_email` = user's email
- `user_id` = linked to their auth user
- `order_item_id` = linked to their order item

---

## SQL Migration

```sql
-- Order 1: Michael Flotron
INSERT INTO orders (id, event_id, user_id, order_number, email, full_name, status, subtotal_cents, total_cents, completed_at)
VALUES ('ord-michael-001', 'f47ac10b-...', '6d8fab70-...', 'ORD-STAFF-0001', 'mflotron91@gmail.com', 'Michael Flotron', 'completed', 32500, 32500, now());

INSERT INTO order_items (id, order_id, ticket_type_id, quantity, unit_price_cents)
VALUES ('oi-michael-001', 'ord-michael-001', 'a1b2c3d4-e5f6-4789-abcd-111111111111', 1, 32500);

INSERT INTO attendees (order_item_id, attendee_name, attendee_email, user_id)
VALUES ('oi-michael-001', 'Michael Flotron', 'mflotron91@gmail.com', '6d8fab70-...');

-- (Repeat for Leanna and Joshua)
```

---

## Result

After implementation:
- All 3 users will have completed orders for the First Gen Career Conference
- Each user will have an attendee record linked to their auth account
- They will be able to access the Attendee app at `/attendee` using their email
- Their attendee profiles will be pre-populated with their names and emails

