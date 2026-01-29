-- Add columns to track caption status on recordings
ALTER TABLE recordings ADD COLUMN captions_status text DEFAULT null;
ALTER TABLE recordings ADD COLUMN captions_track_id text DEFAULT null;

-- Add comment for documentation
COMMENT ON COLUMN recordings.captions_status IS 'Caption generation status: null, generating, ready, error';
COMMENT ON COLUMN recordings.captions_track_id IS 'Mux track ID for the generated captions';