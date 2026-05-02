-- Replace the SELECT policy: allow authenticated members to read any object that
-- is referenced by an album_photos row (needed to sign a URL), but nothing else.
DROP POLICY IF EXISTS "Album photos owner or admin read" ON storage.objects;

CREATE POLICY "Album photos members can sign known photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'album-photos'
  AND (
    is_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM public.album_photos ap WHERE ap.storage_path = storage.objects.name)
  )
);

-- Drop the SECURITY DEFINER helper; client uses createSignedUrl directly.
DROP FUNCTION IF EXISTS public.sign_album_photo(uuid, integer);