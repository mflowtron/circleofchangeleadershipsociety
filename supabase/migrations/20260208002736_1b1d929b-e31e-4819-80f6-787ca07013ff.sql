-- Rename table from lms_events to calendar
ALTER TABLE public.lms_events RENAME TO calendar;

-- Drop old trigger and create new one with updated name
DROP TRIGGER IF EXISTS update_lms_events_updated_at ON public.calendar;
CREATE TRIGGER update_calendar_updated_at 
  BEFORE UPDATE ON public.calendar 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old RLS policies
DROP POLICY IF EXISTS "Active LMS events viewable" ON public.calendar;
DROP POLICY IF EXISTS "Admins view all LMS events" ON public.calendar;
DROP POLICY IF EXISTS "Admins manage LMS events" ON public.calendar;

-- Create new RLS policies with updated names
CREATE POLICY "Active calendar viewable" ON public.calendar 
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY "Admins view all calendar" ON public.calendar 
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage calendar" ON public.calendar 
  FOR ALL USING (public.is_admin(auth.uid()));