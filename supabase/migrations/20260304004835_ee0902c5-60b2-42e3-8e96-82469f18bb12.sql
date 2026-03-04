
-- Allow admins/advisors to upload resources
CREATE POLICY "Admins advisors upload recording resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recording-resources'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'advisor')
  )
);

-- Allow admins/advisors to update resources
CREATE POLICY "Admins advisors update recording resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recording-resources'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'advisor')
  )
);

-- Allow admins/advisors to delete resources
CREATE POLICY "Admins advisors delete recording resources"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'recording-resources'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'advisor')
  )
);

-- Allow authenticated users to read resources
CREATE POLICY "Authenticated read recording resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recording-resources');
