-- Create speaker-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('speaker-images', 'speaker-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Speaker images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'speaker-images');

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload speaker images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'speaker-images');