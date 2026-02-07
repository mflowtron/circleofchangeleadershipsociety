-- Phase 1c: Add new columns and helper functions

-- Add default_role column to profiles for "Remember my choice" functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_role TEXT;

-- Add track_access column to attendees table for track-based content filtering
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS track_access TEXT[] DEFAULT '{}';

-- Add user_id column to attendees to link with auth.users
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups on attendees.user_id
CREATE INDEX IF NOT EXISTS idx_attendees_user_id ON public.attendees(user_id);

-- Create helper function to check if user has any LMS role
CREATE OR REPLACE FUNCTION public.has_any_lms_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text LIKE 'lms_%'
  )
$$;

-- Create helper function to check if user has any Event Management role
CREATE OR REPLACE FUNCTION public.has_any_em_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text LIKE 'em_%'
  )
$$;

-- Create helper function to check if user has any Attendee role
CREATE OR REPLACE FUNCTION public.has_any_attendee_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text LIKE 'attendee_%'
  )
$$;

-- Create function to check if user is any kind of admin
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND (role = 'lms_admin' OR role = 'em_admin' OR role = 'admin')
  )
$$;

-- Update the handle_new_user function to use lms_student as default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert profile if one doesn't already exist for this user
  INSERT INTO public.profiles (user_id, full_name, is_approved)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Only insert role if one doesn't already exist for this user
  -- Note: Using lms_student as default, will be migrated from 'student'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'lms_student')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;