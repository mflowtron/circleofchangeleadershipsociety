-- Fix announcements policy to require authentication
DROP POLICY IF EXISTS "Announcements viewable by authenticated users" ON public.announcements;
CREATE POLICY "Announcements viewable by authenticated users" 
  ON public.announcements FOR SELECT 
  TO authenticated 
  USING (true);

-- Fix recording_resources policy to require authentication
DROP POLICY IF EXISTS "Anyone can view recording resources" ON public.recording_resources;
CREATE POLICY "Recording resources viewable by authenticated users" 
  ON public.recording_resources FOR SELECT 
  TO authenticated 
  USING (true);