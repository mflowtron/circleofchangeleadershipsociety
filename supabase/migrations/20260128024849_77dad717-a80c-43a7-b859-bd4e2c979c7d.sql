-- Add Mux-specific columns to recordings table
ALTER TABLE public.recordings 
ADD COLUMN mux_asset_id TEXT,
ADD COLUMN mux_playback_id TEXT,
ADD COLUMN mux_upload_id TEXT,
ADD COLUMN status TEXT DEFAULT 'pending';

-- Make video_url nullable since Mux will provide the playback URL
ALTER TABLE public.recordings 
ALTER COLUMN video_url DROP NOT NULL;