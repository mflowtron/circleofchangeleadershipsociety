-- Add video aspect ratio column to posts table
ALTER TABLE public.posts 
ADD COLUMN video_aspect_ratio TEXT;

-- Add comment explaining the format
COMMENT ON COLUMN public.posts.video_aspect_ratio IS 'Mux video aspect ratio in format like "16:9" or "9:16"';