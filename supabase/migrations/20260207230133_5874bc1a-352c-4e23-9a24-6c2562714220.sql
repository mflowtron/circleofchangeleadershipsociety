-- ============================================================================
-- SCHEMA SIMPLIFICATION MIGRATION - STEP 2: CREATE NEW SCHEMA
-- ============================================================================

-- Create new enums
CREATE TYPE public.user_role AS ENUM ('admin', 'organizer', 'advisor', 'member');
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE public.moderation_status AS ENUM ('pending', 'approved', 'flagged');

-- ============================================================================
-- CREATE UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number text;
  prefix text;
BEGIN
  prefix := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-';
  SELECT prefix || lpad(COALESCE(
    (SELECT COUNT(*) + 1 FROM public.orders WHERE order_number LIKE prefix || '%'),
    1
  )::text, 4, '0') INTO new_number;
  RETURN new_number;
END;
$$;

-- ============================================================================
-- CREATE ALL 22 TABLES
-- ============================================================================

-- 1. chapters
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  headline text,
  linkedin_url text,
  bio text,
  company text,
  title text,
  open_to_networking boolean DEFAULT false,
  role public.user_role NOT NULL DEFAULT 'member',
  module_access text[] DEFAULT '{lms}',
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  is_approved boolean NOT NULL DEFAULT false,
  default_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. advisor_chapters
CREATE TABLE public.advisor_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);

-- 4. posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  video_url text,
  video_aspect_ratio text,
  link_url text,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  is_global boolean NOT NULL DEFAULT true,
  moderation_status public.moderation_status DEFAULT 'pending',
  moderation_score real,
  moderated_at timestamptz,
  moderated_by uuid,
  moderation_reasons text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. post_interactions
CREATE TABLE public.post_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'comment')),
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_one_like_per_user ON public.post_interactions (post_id, user_id) WHERE type = 'like';

-- 6. recordings
CREATE TABLE public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text,
  thumbnail_url text,
  mux_asset_id text,
  mux_playback_id text,
  mux_upload_id text,
  status text DEFAULT 'pending',
  captions_status text,
  captions_track_id text,
  sort_order integer DEFAULT 0,
  resources jsonb DEFAULT '[]',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. lms_events
CREATE TABLE public.lms_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  meeting_link text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description text,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  venue_name text,
  venue_address text,
  cover_image_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  travel_info text,
  travel_contact_email text,
  timezone text DEFAULT 'America/New_York',
  hotels jsonb DEFAULT '[]',
  badge_template jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. ticket_types
CREATE TABLE public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  quantity_available integer,
  quantity_sold integer NOT NULL DEFAULT 0,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  max_per_order integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. speakers
CREATE TABLE public.speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  company text,
  bio text,
  photo_url text,
  linkedin_url text,
  twitter_url text,
  website_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. agenda_items
CREATE TABLE public.agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  item_type text NOT NULL DEFAULT 'session',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  track text,
  sort_order integer NOT NULL DEFAULT 0,
  is_highlighted boolean NOT NULL DEFAULT false,
  speaker_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  purchaser_is_attending boolean,
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal_cents integer NOT NULL DEFAULT 0,
  fees_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  edit_token uuid DEFAULT gen_random_uuid(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. order_items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. attendees
CREATE TABLE public.attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
  attendee_name text NOT NULL DEFAULT '',
  attendee_email text NOT NULL DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_speaker boolean NOT NULL DEFAULT false,
  additional_info jsonb DEFAULT '{}',
  track_access text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 16. order_access_codes
CREATE TABLE public.order_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 17. attendee_bookmarks
CREATE TABLE public.attendee_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  agenda_item_id uuid NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attendee_id, agenda_item_id)
);

-- 18. attendee_checkins
CREATE TABLE public.attendee_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attendee_id, check_in_date)
);

-- 19. conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('direct', 'group', 'session', 'event')),
  name text,
  description text,
  agenda_item_id uuid REFERENCES public.agenda_items(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.attendees(id) ON DELETE SET NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 20. conversation_participants
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  left_at timestamptz,
  muted_until timestamptz,
  UNIQUE(conversation_id, attendee_id)
);

-- 21. messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  reactions jsonb DEFAULT '{}',
  attachment_url text,
  attachment_type text,
  attachment_name text,
  attachment_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 22. push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- CREATE TABLE-DEPENDENT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_tickets(_ticket_type_id uuid, _quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _available INTEGER;
  _sold INTEGER;
BEGIN
  SELECT quantity_available, quantity_sold INTO _available, _sold
  FROM public.ticket_types
  WHERE id = _ticket_type_id
  FOR UPDATE;
  
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF _available IS NOT NULL AND _sold + _quantity > _available THEN RETURN FALSE; END IF;
  
  UPDATE public.ticket_types SET quantity_sold = quantity_sold + _quantity WHERE id = _ticket_type_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_access(p_user_id uuid, p_module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_user_id AND is_approved = true
    AND (role = 'admin' OR p_module = ANY(module_access))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_events(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND role IN ('admin', 'organizer'));
$$;

CREATE OR REPLACE FUNCTION public.is_event_owner(p_user_id uuid, p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id AND created_by = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_user_chapter(p_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT chapter_id FROM public.profiles WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_advisor_for_chapter(p_user_id uuid, p_chapter_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.advisor_chapters WHERE user_id = p_user_id AND chapter_id = p_chapter_id);
$$;

CREATE OR REPLACE FUNCTION public.verify_order_edit_token(p_order_id uuid, p_token uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND edit_token = p_token);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, module_access)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'member', '{lms}')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.ensure_attendee_user_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.attendee_email IS NOT NULL AND NEW.attendee_email != '' THEN
    SELECT id INTO NEW.user_id FROM auth.users WHERE email = NEW.attendee_email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON public.recordings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lms_events_updated_at BEFORE UPDATE ON public.lms_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON public.ticket_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON public.speakers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON public.agenda_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON public.attendees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_attendee_created BEFORE INSERT ON public.attendees FOR EACH ROW EXECUTE FUNCTION public.ensure_attendee_user_link();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- CHAPTERS
CREATE POLICY "Chapters viewable by authenticated" ON public.chapters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage chapters" ON public.chapters FOR ALL USING (public.is_admin(auth.uid()));

-- PROFILES
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.is_admin(auth.uid()));

-- ADVISOR_CHAPTERS
CREATE POLICY "Advisor chapters viewable" ON public.advisor_chapters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage advisor chapters" ON public.advisor_chapters FOR ALL USING (public.is_admin(auth.uid()));

-- POSTS
CREATE POLICY "View global and chapter posts" ON public.posts FOR SELECT USING (is_global = true OR chapter_id = public.get_user_chapter(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()) OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'advisor') AND public.is_advisor_for_chapter(auth.uid(), chapter_id)));
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id OR public.is_admin(auth.uid()) OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'advisor') AND public.is_advisor_for_chapter(auth.uid(), chapter_id)));

-- POST_INTERACTIONS
CREATE POLICY "View post interactions" ON public.post_interactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (p.is_global = true OR p.chapter_id = public.get_user_chapter(auth.uid()) OR public.is_admin(auth.uid()))));
CREATE POLICY "Users can create interactions" ON public.post_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own interactions" ON public.post_interactions FOR DELETE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- RECORDINGS
CREATE POLICY "Recordings viewable by authenticated" ON public.recordings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins advisors manage recordings" ON public.recordings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'advisor')));

-- ANNOUNCEMENTS
CREATE POLICY "Announcements viewable by authenticated" ON public.announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL USING (public.is_admin(auth.uid()));

-- LMS_EVENTS
CREATE POLICY "Active LMS events viewable" ON public.lms_events FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true));
CREATE POLICY "Admins view all LMS events" ON public.lms_events FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage LMS events" ON public.lms_events FOR ALL USING (public.is_admin(auth.uid()));

-- EVENTS
CREATE POLICY "Published events visible" ON public.events FOR SELECT USING (is_published = true);
CREATE POLICY "Unpublished to creator admins" ON public.events FOR SELECT USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Organizers admins create events" ON public.events FOR INSERT WITH CHECK (public.can_manage_events(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Creator admins update events" ON public.events FOR UPDATE USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Creator admins delete events" ON public.events FOR DELETE USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- TICKET_TYPES
CREATE POLICY "Ticket types with published events" ON public.ticket_types FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.is_published = true OR e.created_by = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Owner admins manage tickets" ON public.ticket_types FOR ALL USING (public.is_event_owner(auth.uid(), event_id) OR public.is_admin(auth.uid()));

-- SPEAKERS
CREATE POLICY "Speakers with published events" ON public.speakers FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.is_published = true OR e.created_by = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Owner admins manage speakers" ON public.speakers FOR ALL USING (public.is_event_owner(auth.uid(), event_id) OR public.is_admin(auth.uid()));

-- AGENDA_ITEMS
CREATE POLICY "Agenda with published events" ON public.agenda_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.is_published = true OR e.created_by = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Owner admins manage agenda" ON public.agenda_items FOR ALL USING (public.is_event_owner(auth.uid(), event_id) OR public.is_admin(auth.uid()));

-- ORDERS
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "View own orders" ON public.orders FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_event_owner(auth.uid(), event_id));
CREATE POLICY "Admins owners update orders" ON public.orders FOR UPDATE USING (public.is_admin(auth.uid()) OR public.is_event_owner(auth.uid(), event_id));

-- ORDER_ITEMS
CREATE POLICY "Insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "View own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_event_owner(auth.uid(), o.event_id))));

-- ATTENDEES
CREATE POLICY "Insert attendees" ON public.attendees FOR INSERT WITH CHECK (true);
CREATE POLICY "View attendees" ON public.attendees FOR SELECT USING (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.id = order_item_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_event_owner(auth.uid(), o.event_id))) OR user_id = auth.uid() OR is_speaker = true);
CREATE POLICY "Update attendees" ON public.attendees FOR UPDATE USING (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.id = order_item_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_event_owner(auth.uid(), o.event_id))) OR user_id = auth.uid());

-- ORDER_ACCESS_CODES
CREATE POLICY "Access codes full access" ON public.order_access_codes FOR ALL USING (true);

-- ATTENDEE_BOOKMARKS
CREATE POLICY "Bookmarks full access" ON public.attendee_bookmarks FOR ALL USING (true);

-- ATTENDEE_CHECKINS
CREATE POLICY "Owner admins manage checkins" ON public.attendee_checkins FOR ALL USING (public.is_event_owner(auth.uid(), event_id) OR public.is_admin(auth.uid()));

-- CONVERSATIONS
CREATE POLICY "Conversations full access" ON public.conversations FOR ALL USING (true);

-- CONVERSATION_PARTICIPANTS
CREATE POLICY "Participants full access" ON public.conversation_participants FOR ALL USING (true);

-- MESSAGES
CREATE POLICY "Messages full access" ON public.messages FOR ALL USING (true);

-- PUSH_SUBSCRIPTIONS
CREATE POLICY "Own subscriptions" ON public.push_subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view subscriptions" ON public.push_subscriptions FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_chapter_id ON public.profiles(chapter_id);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_chapter_id ON public.posts(chapter_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_post_interactions_post_id ON public.post_interactions(post_id);
CREATE INDEX idx_post_interactions_user_id ON public.post_interactions(user_id);
CREATE INDEX idx_recordings_sort_order ON public.recordings(sort_order);
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_is_published ON public.events(is_published);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_ticket_types_event_id ON public.ticket_types(event_id);
CREATE INDEX idx_speakers_event_id ON public.speakers(event_id);
CREATE INDEX idx_agenda_items_event_id ON public.agenda_items(event_id);
CREATE INDEX idx_agenda_items_starts_at ON public.agenda_items(starts_at);
CREATE INDEX idx_orders_event_id ON public.orders(event_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_email ON public.orders(email);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_attendees_order_item_id ON public.attendees(order_item_id);
CREATE INDEX idx_attendees_user_id ON public.attendees(user_id);
CREATE INDEX idx_attendees_email ON public.attendees(attendee_email);
CREATE INDEX idx_order_access_codes_email ON public.order_access_codes(email);
CREATE INDEX idx_conversations_event_id ON public.conversations(event_id);
CREATE INDEX idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_att ON public.conversation_participants(attendee_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);