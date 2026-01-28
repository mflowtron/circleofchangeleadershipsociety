-- Add event_organizer to the app_role enum
-- This must be committed before it can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'event_organizer';