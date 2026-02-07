-- Add attachment columns to attendee_messages
ALTER TABLE public.attendee_messages
ADD COLUMN attachment_url text,
ADD COLUMN attachment_type text,
ADD COLUMN attachment_name text,
ADD COLUMN attachment_size integer;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);

-- Public read access for viewing attachments
CREATE POLICY "Public read access for chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Service role can upload (uploads happen via edge function)
CREATE POLICY "Service role can upload chat attachments"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'chat-attachments');

-- Service role can delete
CREATE POLICY "Service role can delete chat attachments"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'chat-attachments');