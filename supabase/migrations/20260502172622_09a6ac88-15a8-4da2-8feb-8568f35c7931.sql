DROP POLICY IF EXISTS "Album photos public read" ON storage.objects;

CREATE POLICY "Album photos authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'album-photos');