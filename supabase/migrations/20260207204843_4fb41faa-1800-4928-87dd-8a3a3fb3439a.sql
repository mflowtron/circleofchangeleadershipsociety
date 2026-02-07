-- Drop triggers first (must drop before functions they depend on)
DROP TRIGGER IF EXISTS log_profile_changes ON public.profiles;
DROP TRIGGER IF EXISTS log_post_changes ON public.lms_posts;
DROP TRIGGER IF EXISTS log_comment_changes ON public.lms_comments;
DROP TRIGGER IF EXISTS log_order_changes ON public.orders;
DROP TRIGGER IF EXISTS log_event_changes ON public.events;
DROP TRIGGER IF EXISTS log_recording_changes ON public.lms_recordings;
DROP TRIGGER IF EXISTS log_announcement_changes ON public.lms_announcements;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.log_profile_activity();
DROP FUNCTION IF EXISTS public.log_post_activity();
DROP FUNCTION IF EXISTS public.log_comment_activity();
DROP FUNCTION IF EXISTS public.log_order_activity();
DROP FUNCTION IF EXISTS public.log_event_activity();
DROP FUNCTION IF EXISTS public.log_recording_activity();
DROP FUNCTION IF EXISTS public.log_announcement_activity();

-- Drop the main log_activity function
DROP FUNCTION IF EXISTS public.log_activity(text, uuid, text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.log_activity(_action text, _entity_id uuid, _entity_title text, _entity_type text, _metadata jsonb, _user_id uuid);

-- Remove from realtime publication (ignore if not exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_logs;
  END IF;
END $$;

-- Drop the table (this also drops indexes and RLS policies)
DROP TABLE IF EXISTS public.activity_logs;