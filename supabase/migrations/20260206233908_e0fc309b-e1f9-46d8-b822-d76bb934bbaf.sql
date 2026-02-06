-- Create event_hotels table
CREATE TABLE public.event_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  description TEXT,
  image_url TEXT,
  rate_description TEXT,
  booking_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_hotels ENABLE ROW LEVEL SECURITY;

-- Public read access (event hotels are public info)
CREATE POLICY "Anyone can view event hotels"
  ON public.event_hotels
  FOR SELECT
  USING (true);

-- Event owner and admins can manage hotels
CREATE POLICY "Event owner and admins can insert hotels"
  ON public.event_hotels
  FOR INSERT
  WITH CHECK (is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Event owner and admins can update hotels"
  ON public.event_hotels
  FOR UPDATE
  USING (is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Event owner and admins can delete hotels"
  ON public.event_hotels
  FOR DELETE
  USING (is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Add travel columns to events table
ALTER TABLE public.events
ADD COLUMN travel_info TEXT,
ADD COLUMN travel_contact_email TEXT;