-- ============================================================================
-- SCHEMA SIMPLIFICATION MIGRATION - STEP 1: DROP EVERYTHING
-- This migration drops all existing tables and recreates with new schema
-- ============================================================================

-- Drop all RLS policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop trigger on auth.users first (important!)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all triggers on public tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.event_object_table);
    END LOOP;
END $$;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.has_any_lms_role CASCADE;
DROP FUNCTION IF EXISTS public.has_any_em_role CASCADE;
DROP FUNCTION IF EXISTS public.has_any_attendee_role CASCADE;
DROP FUNCTION IF EXISTS public.is_any_admin CASCADE;
DROP FUNCTION IF EXISTS public.is_user_approved CASCADE;
DROP FUNCTION IF EXISTS public.is_event_owner CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_events CASCADE;
DROP FUNCTION IF EXISTS public.get_user_chapter CASCADE;
DROP FUNCTION IF EXISTS public.is_advisor_for_chapter CASCADE;
DROP FUNCTION IF EXISTS public.get_post_like_count CASCADE;
DROP FUNCTION IF EXISTS public.has_user_liked_post CASCADE;
DROP FUNCTION IF EXISTS public.generate_order_number CASCADE;
DROP FUNCTION IF EXISTS public.reserve_tickets CASCADE;
DROP FUNCTION IF EXISTS public.verify_order_edit_token CASCADE;
DROP FUNCTION IF EXISTS public.log_activity CASCADE;
DROP FUNCTION IF EXISTS public.check_access CASCADE;
DROP FUNCTION IF EXISTS public.is_admin CASCADE;
DROP FUNCTION IF EXISTS public.ensure_attendee_user_link CASCADE;

-- Drop all public tables in reverse dependency order
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.attendee_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.attendee_conversations CASCADE;
DROP TABLE IF EXISTS public.attendee_bookmarks CASCADE;
DROP TABLE IF EXISTS public.attendee_checkins CASCADE;
DROP TABLE IF EXISTS public.attendee_profiles CASCADE;
DROP TABLE IF EXISTS public.attendees CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_messages CASCADE;
DROP TABLE IF EXISTS public.order_access_codes CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.agenda_item_speakers CASCADE;
DROP TABLE IF EXISTS public.agenda_items CASCADE;
DROP TABLE IF EXISTS public.speakers CASCADE;
DROP TABLE IF EXISTS public.ticket_types CASCADE;
DROP TABLE IF EXISTS public.event_hotels CASCADE;
DROP TABLE IF EXISTS public.badge_templates CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.lms_recording_resources CASCADE;
DROP TABLE IF EXISTS public.lms_recordings CASCADE;
DROP TABLE IF EXISTS public.recordings CASCADE;
DROP TABLE IF EXISTS public.lms_comments CASCADE;
DROP TABLE IF EXISTS public.lms_likes CASCADE;
DROP TABLE IF EXISTS public.post_interactions CASCADE;
DROP TABLE IF EXISTS public.lms_posts CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.lms_events CASCADE;
DROP TABLE IF EXISTS public.lms_announcements CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.lms_advisor_chapters CASCADE;
DROP TABLE IF EXISTS public.advisor_chapters CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.lms_chapters CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.moderation_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;