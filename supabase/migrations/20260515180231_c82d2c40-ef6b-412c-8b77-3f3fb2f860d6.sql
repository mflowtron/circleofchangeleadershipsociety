DROP FUNCTION IF EXISTS public.can_manage_events(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_event_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.verify_order_edit_token(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.reserve_tickets(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_attendee_user_link() CASCADE;