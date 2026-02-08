
# Fix Organizer Access to Orders and Attendees

## Problem

Natalie and Broderick are organizers but cannot see Orders or Attendees because the current RLS policies only grant access to:
1. **Admins** (via `is_admin(auth.uid())`)
2. **Event owners/creators** (via `is_event_owner(auth.uid(), event_id)`)

Since they didn't create the event (Leanna did), and they're not admins, the RLS policies block them.

## Root Cause

The database has a `can_manage_events()` function that correctly checks for organizer role:
```sql
SELECT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = p_user_id AND role IN ('admin', 'organizer')
);
```

However, this function is **not used** in the RLS policies for `orders`, `order_items`, and `attendees`. Instead, they only use `is_event_owner()` which checks if the user created that specific event.

## Solution

Update the RLS policies for `orders`, `order_items`, and `attendees` tables to include `can_manage_events()` in the access checks. This allows any user with the organizer role to view and manage orders/attendees across all events.

---

## Technical Details

### Current RLS Policy (orders)
```sql
-- View own orders policy
USING (
  (user_id = auth.uid()) OR 
  is_admin(auth.uid()) OR 
  is_event_owner(auth.uid(), event_id)
)
```

### Updated RLS Policy (orders)
```sql
USING (
  (user_id = auth.uid()) OR 
  is_admin(auth.uid()) OR 
  is_event_owner(auth.uid(), event_id) OR
  can_manage_events(auth.uid())  -- NEW: Organizers can view all orders
)
```

### Tables to Update

| Table | Policy Name | Change |
|-------|-------------|--------|
| `orders` | "View own orders" | Add `can_manage_events()` check |
| `orders` | "Admins owners update orders" | Add `can_manage_events()` check |
| `order_items` | "View own order items" | Add `can_manage_events()` check |
| `attendees` | "View attendees" | Add `can_manage_events()` check |
| `attendees` | "Update attendees" | Add `can_manage_events()` check |

### SQL Migration

```sql
-- Drop and recreate orders SELECT policy
DROP POLICY IF EXISTS "View own orders" ON orders;
CREATE POLICY "View own orders" ON orders FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    is_admin(auth.uid()) OR 
    is_event_owner(auth.uid(), event_id) OR
    can_manage_events(auth.uid())
  );

-- Drop and recreate orders UPDATE policy
DROP POLICY IF EXISTS "Admins owners update orders" ON orders;
CREATE POLICY "Admins owners update orders" ON orders FOR UPDATE
  USING (
    is_admin(auth.uid()) OR 
    is_event_owner(auth.uid(), event_id) OR
    can_manage_events(auth.uid())
  );

-- Drop and recreate order_items SELECT policy
DROP POLICY IF EXISTS "View own order items" ON order_items;
CREATE POLICY "View own order items" ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid() OR 
        is_admin(auth.uid()) OR 
        is_event_owner(auth.uid(), o.event_id) OR
        can_manage_events(auth.uid())
      )
    )
  );

-- Drop and recreate attendees SELECT policy
DROP POLICY IF EXISTS "View attendees" ON attendees;
CREATE POLICY "View attendees" ON attendees FOR SELECT
  USING (
    (user_id = auth.uid()) OR
    (is_speaker = true) OR
    can_manage_events(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = attendees.order_item_id
      AND (
        o.user_id = auth.uid() OR 
        is_admin(auth.uid()) OR 
        is_event_owner(auth.uid(), o.event_id)
      )
    )
  );

-- Drop and recreate attendees UPDATE policy
DROP POLICY IF EXISTS "Update attendees" ON attendees;
CREATE POLICY "Update attendees" ON attendees FOR UPDATE
  USING (
    (user_id = auth.uid()) OR
    can_manage_events(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = attendees.order_item_id
      AND (
        o.user_id = auth.uid() OR 
        is_admin(auth.uid()) OR 
        is_event_owner(auth.uid(), o.event_id)
      )
    )
  );
```

## Outcome

After this change:
- **Admins**: Full access (unchanged)
- **Organizers** (like Natalie/Broderick): Can view/manage all orders and attendees
- **Event Creators**: Can view/manage their own event's orders/attendees
- **Regular Users**: Can only view their own orders
