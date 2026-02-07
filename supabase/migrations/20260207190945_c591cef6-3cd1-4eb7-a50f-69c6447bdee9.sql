-- Rename LMS-exclusive tables with lms_ prefix
ALTER TABLE recordings RENAME TO lms_recordings;
ALTER TABLE recording_resources RENAME TO lms_recording_resources;
ALTER TABLE posts RENAME TO lms_posts;
ALTER TABLE comments RENAME TO lms_comments;
ALTER TABLE likes RENAME TO lms_likes;
ALTER TABLE announcements RENAME TO lms_announcements;

-- Update foreign key constraint names for clarity (PostgreSQL preserves the FK relationships)
-- The foreign keys will continue to work, just with their original auto-generated names

-- Update the recording_resources foreign key to reference the renamed table
-- (This happens automatically with the rename, but we need to update any functions that reference old names)

-- Update the update_updated_at_column trigger function references if needed
-- The triggers are bound to the table OID, so they follow the rename automatically