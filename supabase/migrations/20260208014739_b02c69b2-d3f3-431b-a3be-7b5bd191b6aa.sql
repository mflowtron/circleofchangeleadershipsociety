-- Add is_virtual column to ticket_types
ALTER TABLE ticket_types 
ADD COLUMN is_virtual boolean NOT NULL DEFAULT false;

-- Update existing virtual ticket types based on their names
UPDATE ticket_types 
SET is_virtual = true 
WHERE name ILIKE '%virtual%';