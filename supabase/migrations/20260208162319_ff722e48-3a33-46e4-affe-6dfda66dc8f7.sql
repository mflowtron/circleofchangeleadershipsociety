-- Add event-scoped announcement columns
ALTER TABLE public.announcements
ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
ADD COLUMN push_notification_id UUID REFERENCES public.push_notifications(id) ON DELETE SET NULL,
ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN audience_type TEXT NOT NULL DEFAULT 'all',
ADD COLUMN audience_filter JSONB;

-- Add check constraint for priority values
ALTER TABLE public.announcements
ADD CONSTRAINT announcements_priority_check CHECK (priority IN ('normal', 'urgent'));

-- Create index for event-scoped queries
CREATE INDEX idx_announcements_event_id ON public.announcements(event_id);

-- Add RLS policy for attendees to view event announcements
-- Attendees with completed orders can view active, non-expired event announcements
CREATE POLICY "Attendees can view event announcements"
ON public.announcements
FOR SELECT
USING (
  event_id IS NOT NULL 
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.event_id = announcements.event_id
    AND o.status = 'completed'
    AND (o.user_id = auth.uid() OR o.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- Add RLS policy for organizers to manage event announcements
CREATE POLICY "Organizers can manage event announcements"
ON public.announcements
FOR ALL
USING (
  event_id IS NOT NULL
  AND (is_admin(auth.uid()) OR is_event_owner(auth.uid(), event_id))
)
WITH CHECK (
  event_id IS NOT NULL
  AND (is_admin(auth.uid()) OR is_event_owner(auth.uid(), event_id))
);