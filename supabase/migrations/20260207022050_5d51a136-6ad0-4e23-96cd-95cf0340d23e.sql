-- Add index on sender_attendee_id for faster unread count queries
CREATE INDEX IF NOT EXISTS idx_attendee_messages_sender_attendee_id 
ON public.attendee_messages(sender_attendee_id);

-- Add composite index for common query pattern (conversation_id + is_deleted + created_at)
CREATE INDEX IF NOT EXISTS idx_attendee_messages_conversation_lookup 
ON public.attendee_messages(conversation_id, is_deleted, created_at DESC);