
DROP TABLE IF EXISTS public.attendee_checkins CASCADE;
DROP TABLE IF EXISTS public.attendee_bookmarks CASCADE;
DROP TABLE IF EXISTS public.attendees CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_access_codes CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.ticket_types CASCADE;
DROP TABLE IF EXISTS public.agenda_items CASCADE;
DROP TABLE IF EXISTS public.speakers CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.feed_post_comments CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;

DROP POLICY IF EXISTS "Attendees can view event announcements" ON public.announcements;
DROP POLICY IF EXISTS "Organizers can manage event announcements" ON public.announcements;
DROP POLICY IF EXISTS "Organizers can view analytics" ON public.announcement_analytics;
DROP POLICY IF EXISTS "Organizers can create push notifications" ON public.push_notifications;
DROP POLICY IF EXISTS "Organizers can read push notifications" ON public.push_notifications;

CREATE POLICY "Admins manage push notifications"
  ON public.push_notifications FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins view analytics"
  ON public.announcement_analytics FOR SELECT
  USING (is_admin(auth.uid()));

ALTER TABLE public.announcements DROP COLUMN IF EXISTS event_id CASCADE;
ALTER TABLE public.announcements DROP COLUMN IF EXISTS audience_type CASCADE;
ALTER TABLE public.announcements DROP COLUMN IF EXISTS audience_filter CASCADE;
ALTER TABLE public.announcements DROP COLUMN IF EXISTS push_notification_id CASCADE;
ALTER TABLE public.push_notifications DROP COLUMN IF EXISTS event_id CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS module_access CASCADE;

DROP FUNCTION IF EXISTS public.can_manage_events(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_event_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.verify_order_edit_token(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.reserve_tickets(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_attendee_user_link() CASCADE;
DROP FUNCTION IF EXISTS public.check_access(uuid, text) CASCADE;

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins advisors manage recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins advisors upload recording resources" ON storage.objects;
DROP POLICY IF EXISTS "Admins advisors update recording resources" ON storage.objects;
DROP POLICY IF EXISTS "Admins advisors delete recording resources" ON storage.objects;

UPDATE public.profiles SET role = 'member' WHERE role = 'organizer';
ALTER TYPE public.user_role RENAME TO user_role_old;
CREATE TYPE public.user_role AS ENUM ('admin', 'advisor', 'member');
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role,
  ALTER COLUMN role SET DEFAULT 'member'::public.user_role;
DROP TYPE public.user_role_old;

CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (
  (auth.uid() = user_id) OR is_admin(auth.uid())
  OR (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'advisor'::public.user_role)
      AND is_advisor_for_chapter(auth.uid(), chapter_id))
);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (
  (auth.uid() = user_id) OR is_admin(auth.uid())
  OR (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'advisor'::public.user_role)
      AND is_advisor_for_chapter(auth.uid(), chapter_id))
);
CREATE POLICY "Admins advisors manage recordings" ON public.recordings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid()
          AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'advisor'::public.user_role]))
);
CREATE POLICY "Admins advisors upload recording resources" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'recording-resources'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid()
              AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'advisor'::public.user_role]))
);
CREATE POLICY "Admins advisors update recording resources" ON storage.objects FOR UPDATE USING (
  bucket_id = 'recording-resources'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid()
              AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'advisor'::public.user_role]))
);
CREATE POLICY "Admins advisors delete recording resources" ON storage.objects FOR DELETE USING (
  bucket_id = 'recording-resources'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid()
              AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'advisor'::public.user_role]))
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'member')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
