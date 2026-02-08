-- Create announcement_analytics table
CREATE TABLE public.announcement_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'dismiss')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one event type per attendee-announcement pair
CREATE UNIQUE INDEX announcement_analytics_unique_event 
ON public.announcement_analytics (announcement_id, attendee_id, event_type) 
WHERE attendee_id IS NOT NULL;

-- Add aggregate columns to announcements table
ALTER TABLE public.announcements 
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN dismiss_count INTEGER NOT NULL DEFAULT 0;

-- Create trigger function to update aggregate counts
CREATE OR REPLACE FUNCTION public.update_announcement_analytics_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'view' THEN
    UPDATE public.announcements 
    SET view_count = view_count + 1 
    WHERE id = NEW.announcement_id;
  ELSIF NEW.event_type = 'dismiss' THEN
    UPDATE public.announcements 
    SET dismiss_count = dismiss_count + 1 
    WHERE id = NEW.announcement_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER update_announcement_counts
AFTER INSERT ON public.announcement_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_announcement_analytics_counts();

-- Enable RLS
ALTER TABLE public.announcement_analytics ENABLE ROW LEVEL SECURITY;

-- RLS: Attendees can insert their own analytics
CREATE POLICY "Attendees can insert analytics"
ON public.announcement_analytics
FOR INSERT
WITH CHECK (true);

-- RLS: Organizers can view analytics for their events
CREATE POLICY "Organizers can view analytics"
ON public.announcement_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_analytics.announcement_id
    AND (
      is_admin(auth.uid()) 
      OR is_event_owner(auth.uid(), a.event_id)
    )
  )
);