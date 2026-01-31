-- Create moderation status enum
CREATE TYPE public.moderation_status AS ENUM ('pending', 'approved', 'flagged', 'auto_flagged');

-- Add moderation columns to posts table
ALTER TABLE public.posts
ADD COLUMN moderation_status public.moderation_status DEFAULT 'pending',
ADD COLUMN moderation_score real,
ADD COLUMN moderation_reasons text[],
ADD COLUMN moderated_at timestamp with time zone,
ADD COLUMN moderated_by uuid;

-- Create index for efficient filtering by moderation status
CREATE INDEX idx_posts_moderation_status ON public.posts(moderation_status);

-- Update existing posts to 'approved' status (grandfathering existing content)
UPDATE public.posts SET moderation_status = 'approved' WHERE moderation_status IS NULL OR moderation_status = 'pending';