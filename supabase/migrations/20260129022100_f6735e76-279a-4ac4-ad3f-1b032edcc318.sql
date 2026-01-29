-- Update the handle_new_user trigger to be idempotent
-- Only create profile and role if they don't already exist
-- This prevents duplicate entries and preserves existing user data
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
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;