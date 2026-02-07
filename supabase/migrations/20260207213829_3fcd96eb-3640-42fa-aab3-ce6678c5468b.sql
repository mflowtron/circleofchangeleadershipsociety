-- Drop the incorrect unique constraint on user_id alone (should only be unique on user_id + role)
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_unique;