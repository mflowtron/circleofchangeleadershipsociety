-- Add orientation column to badge_templates table
ALTER TABLE public.badge_templates 
ADD COLUMN orientation TEXT NOT NULL DEFAULT 'landscape';