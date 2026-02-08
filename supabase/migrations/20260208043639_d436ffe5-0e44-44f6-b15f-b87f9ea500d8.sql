-- Create feed_post_comments table for conference feed comments
CREATE TABLE public.feed_post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_post_id text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 500),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_feed_post_comments_post_event ON public.feed_post_comments(feed_post_id, event_id);
CREATE INDEX idx_feed_post_comments_attendee ON public.feed_post_comments(attendee_id);
CREATE INDEX idx_feed_post_comments_created ON public.feed_post_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: Anyone can view comments (public feed)
CREATE POLICY "Comments viewable by all"
ON public.feed_post_comments
FOR SELECT
USING (true);

-- INSERT: Attendees can add comments
CREATE POLICY "Attendees can add comments"
ON public.feed_post_comments
FOR INSERT
WITH CHECK (true);

-- DELETE: Attendees can delete their own comments
CREATE POLICY "Attendees can delete own comments"
ON public.feed_post_comments
FOR DELETE
USING (true);