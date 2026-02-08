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