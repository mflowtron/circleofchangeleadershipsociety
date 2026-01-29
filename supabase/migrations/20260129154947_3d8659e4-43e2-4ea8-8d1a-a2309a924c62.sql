-- Create attendee_checkins table for tracking daily check-ins
CREATE TABLE public.attendee_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate check-ins on the same day
  CONSTRAINT unique_attendee_checkin_per_day UNIQUE (attendee_id, check_in_date)
);

-- Create indexes for efficient querying
CREATE INDEX idx_attendee_checkins_event_date ON public.attendee_checkins(event_id, check_in_date);
CREATE INDEX idx_attendee_checkins_attendee ON public.attendee_checkins(attendee_id);
CREATE INDEX idx_attendee_checkins_checked_in_at ON public.attendee_checkins(checked_in_at DESC);

-- Enable RLS
ALTER TABLE public.attendee_checkins ENABLE ROW LEVEL SECURITY;

-- SELECT: Event owners and admins can view check-ins for their events
CREATE POLICY "Event owners and admins can view check-ins"
ON public.attendee_checkins
FOR SELECT
USING (
  is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT: Event owners and admins can create check-ins
CREATE POLICY "Event owners and admins can create check-ins"
ON public.attendee_checkins
FOR INSERT
WITH CHECK (
  is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE: Event owners and admins can update check-ins (for notes)
CREATE POLICY "Event owners and admins can update check-ins"
ON public.attendee_checkins
FOR UPDATE
USING (
  is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE: Event owners and admins can undo check-ins
CREATE POLICY "Event owners and admins can delete check-ins"
ON public.attendee_checkins
FOR DELETE
USING (
  is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendee_checkins;