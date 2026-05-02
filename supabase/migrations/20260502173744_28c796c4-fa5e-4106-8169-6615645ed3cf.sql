
-- 1) Tighten storage INSERT policy on album-photos: path MUST start with auth.uid() folder
DROP POLICY IF EXISTS "Users upload to own album folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload album photos" ON storage.objects;
DROP POLICY IF EXISTS "Album photos owner insert" ON storage.objects;

CREATE POLICY "Album photos owner insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'album-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) DB-level trigger ensuring album_photos.storage_path begins with uploaded_by/
CREATE OR REPLACE FUNCTION public.validate_album_photo_path()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.storage_path IS NULL OR NEW.uploaded_by IS NULL THEN
    RAISE EXCEPTION 'storage_path and uploaded_by are required';
  END IF;

  IF position((NEW.uploaded_by::text || '/') in NEW.storage_path) <> 1 THEN
    RAISE EXCEPTION 'storage_path must start with uploader user_id folder (%/)', NEW.uploaded_by
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_album_photo_path_trg ON public.album_photos;
CREATE TRIGGER validate_album_photo_path_trg
BEFORE INSERT OR UPDATE OF storage_path, uploaded_by ON public.album_photos
FOR EACH ROW
EXECUTE FUNCTION public.validate_album_photo_path();
