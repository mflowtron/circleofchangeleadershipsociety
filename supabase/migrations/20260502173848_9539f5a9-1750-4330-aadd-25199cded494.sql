
CREATE OR REPLACE FUNCTION public.cascade_delete_album_photo_children()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.album_photo_likes WHERE photo_id = OLD.id;
  DELETE FROM public.album_photo_comments WHERE photo_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cascade_delete_album_photo_children_trg ON public.album_photos;
CREATE TRIGGER cascade_delete_album_photo_children_trg
BEFORE DELETE ON public.album_photos
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_album_photo_children();
