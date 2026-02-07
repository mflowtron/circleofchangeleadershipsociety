-- Add timezone column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Update the First Gen 2026 event to use Eastern Time (for Miami, FL)
UPDATE public.events 
SET timezone = 'America/New_York' 
WHERE id = '2e062f79-1693-4883-a3c5-623121810c57';