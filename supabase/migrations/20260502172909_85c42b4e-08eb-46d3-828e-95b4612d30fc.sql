-- Caption length + file size constraint via trigger (CHECK can't be used for complex rules but these are immutable)
ALTER TABLE public.album_photos
  DROP CONSTRAINT IF EXISTS album_photos_caption_length,
  DROP CONSTRAINT IF EXISTS album_photos_file_size_max,
  DROP CONSTRAINT IF EXISTS album_photos_storage_path_ext;

ALTER TABLE public.album_photos
  ADD CONSTRAINT album_photos_caption_length
    CHECK (caption IS NULL OR char_length(caption) <= 500),
  ADD CONSTRAINT album_photos_file_size_max
    CHECK (file_size IS NULL OR (file_size > 0 AND file_size <= 26214400)),
  ADD CONSTRAINT album_photos_storage_path_ext
    CHECK (storage_path ~* '\.(jpe?g|png|webp|gif|heic|heif)$');