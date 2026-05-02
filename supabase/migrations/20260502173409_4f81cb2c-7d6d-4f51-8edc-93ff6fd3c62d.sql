-- 1. Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'album-photos';

-- 2. Tighten object SELECT to owner or admin (signed URLs bypass this via service role)
DROP POLICY IF EXISTS "Album photos authenticated read" ON storage.objects;

CREATE POLICY "Album photos owner or admin read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'album-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR is_admin(auth.uid())
  )
);

-- 3. Security-invoker view that hides storage_path from non-owners.
--    image_url is dropped from the view since the client now mints signed URLs from id.
CREATE OR REPLACE VIEW public.album_photos_safe
WITH (security_invoker = on) AS
SELECT
  p.id,
  p.uploaded_by,
  p.caption,
  p.width,
  p.height,
  p.file_size,
  p.created_at,
  p.updated_at,
  CASE
    WHEN auth.uid() = p.uploaded_by OR is_admin(auth.uid())
      THEN p.storage_path
    ELSE NULL
  END AS storage_path
FROM public.album_photos p;

GRANT SELECT ON public.album_photos_safe TO authenticated;

-- 4. Helper: sign an album photo by id. Authenticated members only.
CREATE OR REPLACE FUNCTION public.sign_album_photo(_photo_id uuid, _expires_in integer DEFAULT 3600)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, storage, extensions
AS $$
DECLARE
  _path text;
  _signed jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT storage_path INTO _path FROM public.album_photos WHERE id = _photo_id;
  IF _path IS NULL THEN
    RETURN NULL;
  END IF;

  -- Use storage's built-in signing (returns the relative signed url)
  SELECT storage.create_signed_url('album-photos', _path, _expires_in) INTO _signed;
  RETURN _signed->>'signedURL';
EXCEPTION WHEN undefined_function THEN
  -- Fallback: return null if storage helper is unavailable; client will fall back to createSignedUrl
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_album_photo(uuid, integer) TO authenticated;