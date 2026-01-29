-- Create attendee_bookmarks table for storing agenda bookmarks
CREATE TABLE public.attendee_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  agenda_item_id UUID NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attendee_id, agenda_item_id)
);

-- Create index for faster lookups
CREATE INDEX idx_attendee_bookmarks_attendee_id ON public.attendee_bookmarks(attendee_id);
CREATE INDEX idx_attendee_bookmarks_agenda_item_id ON public.attendee_bookmarks(agenda_item_id);

-- Enable RLS (we'll use edge functions for access since attendees use session tokens)
ALTER TABLE public.attendee_bookmarks ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE public.attendee_bookmarks IS 'Stores agenda item bookmarks for attendees, managed via edge functions with session token auth';