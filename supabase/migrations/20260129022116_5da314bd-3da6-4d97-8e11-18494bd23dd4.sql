-- Add unique constraints on user_id to enable ON CONFLICT behavior
-- profiles.user_id should be unique (one profile per user)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- user_roles already has a unique constraint on (user_id, role) from the schema
-- But we need to ensure only one role per user for this trigger to work properly
-- Check existing constraint first
DO $$
BEGIN
  -- Add unique constraint on user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_unique' 
    AND conrelid = 'public.user_roles'::regclass
  ) THEN
    -- Since we want one role per user, add unique on user_id
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;