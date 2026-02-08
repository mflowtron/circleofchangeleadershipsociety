-- Drop the problematic policy that queries auth.users
DROP POLICY IF EXISTS "Attendees can view event announcements" ON public.announcements;

-- Recreate using auth.email() instead of querying auth.users
CREATE POLICY "Attendees can view event announcements"
ON public.announcements
FOR SELECT
USING (
  (event_id IS NOT NULL) 
  AND (is_active = true) 
  AND ((expires_at IS NULL) OR (expires_at > now())) 
  AND (EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.event_id = announcements.event_id
      AND o.status = 'completed'::order_status
      AND (o.user_id = auth.uid() OR o.email = auth.email())
  ))
);