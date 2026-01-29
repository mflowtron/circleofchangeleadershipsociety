-- Add sort_order column to recordings table
ALTER TABLE recordings ADD COLUMN sort_order integer DEFAULT 0;

-- Backfill existing recordings with order based on created_at (most recent first)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM recordings
)
UPDATE recordings 
SET sort_order = ordered.rn
FROM ordered 
WHERE recordings.id = ordered.id;