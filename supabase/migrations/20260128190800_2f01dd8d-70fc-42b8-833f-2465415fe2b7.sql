-- Create recording_resources table for file attachments
CREATE TABLE public.recording_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recording_resources ENABLE ROW LEVEL SECURITY;

-- Everyone can view resources
CREATE POLICY "Anyone can view recording resources"
  ON public.recording_resources FOR SELECT
  USING (true);

-- Admins and advisors can insert resources
CREATE POLICY "Admins and advisors can insert resources"
  ON public.recording_resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'advisor')
    )
  );

-- Admins and advisors can delete resources
CREATE POLICY "Admins and advisors can delete resources"
  ON public.recording_resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'advisor')
    )
  );

-- Create storage bucket for recording resources
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recording-resources', 'recording-resources', true);

-- Storage policies for the bucket
CREATE POLICY "Anyone can view recording resources files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recording-resources');

CREATE POLICY "Admins and advisors can upload recording resources"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recording-resources'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'advisor')
    )
  );

CREATE POLICY "Admins and advisors can delete recording resources files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recording-resources'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'advisor')
    )
  );

-- Enable realtime for resources
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_resources;