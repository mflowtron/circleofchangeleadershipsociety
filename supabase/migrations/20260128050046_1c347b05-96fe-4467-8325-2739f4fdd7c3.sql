-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create dismissed_announcements table
CREATE TABLE public.dismissed_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS on both tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissed_announcements ENABLE ROW LEVEL SECURITY;

-- Announcements policies
CREATE POLICY "Announcements viewable by authenticated users"
ON public.announcements
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert announcements"
ON public.announcements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update announcements"
ON public.announcements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete announcements"
ON public.announcements
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Dismissed announcements policies
CREATE POLICY "Users can view own dismissals"
ON public.dismissed_announcements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss announcements"
ON public.dismissed_announcements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own dismissals"
ON public.dismissed_announcements
FOR DELETE
USING (auth.uid() = user_id);