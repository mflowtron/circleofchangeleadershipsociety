-- Phase 1d: Migrate existing roles to new naming

-- Convert student -> lms_student
UPDATE public.user_roles SET role = 'lms_student' WHERE role = 'student';

-- Convert advisor -> lms_advisor
UPDATE public.user_roles SET role = 'lms_advisor' WHERE role = 'advisor';

-- Convert admin -> lms_admin
UPDATE public.user_roles SET role = 'lms_admin' WHERE role = 'admin';

-- Convert event_organizer -> em_manager
UPDATE public.user_roles SET role = 'em_manager' WHERE role = 'event_organizer';

-- Update can_manage_events function to work with new roles
CREATE OR REPLACE FUNCTION public.can_manage_events(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('lms_admin', 'em_admin', 'em_manager', 'admin', 'event_organizer')
  )
$$;