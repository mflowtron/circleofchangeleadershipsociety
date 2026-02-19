
-- Create table for tracking recording watch progress
CREATE TABLE public.recording_watch_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recording_id uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  position_seconds double precision NOT NULL DEFAULT 0,
  duration_seconds double precision NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, recording_id)
);

-- Enable RLS
ALTER TABLE public.recording_watch_progress ENABLE ROW LEVEL SECURITY;

-- Users can manage their own watch progress
CREATE POLICY "Users manage own watch progress"
ON public.recording_watch_progress
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all watch progress for analytics
CREATE POLICY "Admins view all watch progress"
ON public.recording_watch_progress
FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_recording_watch_progress_updated_at
BEFORE UPDATE ON public.recording_watch_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
