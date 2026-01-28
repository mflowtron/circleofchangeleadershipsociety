-- Create LMS Events table for scheduled meetings
CREATE TABLE public.lms_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  meeting_link text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lms_events ENABLE ROW LEVEL SECURITY;

-- Approved users can view active events
CREATE POLICY "Approved users can view active lms_events"
ON public.lms_events FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND public.is_user_approved(auth.uid())
);

-- Admins can view all events (including inactive)
CREATE POLICY "Admins can view all lms_events"
ON public.lms_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert events
CREATE POLICY "Admins can insert lms_events"
ON public.lms_events FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update events
CREATE POLICY "Admins can update lms_events"
ON public.lms_events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete events
CREATE POLICY "Admins can delete lms_events"
ON public.lms_events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_lms_events_updated_at
BEFORE UPDATE ON public.lms_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();