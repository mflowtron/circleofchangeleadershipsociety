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
  p.storage_path
FROM public.album_photos p;

GRANT SELECT ON public.album_photos_safe TO authenticated;