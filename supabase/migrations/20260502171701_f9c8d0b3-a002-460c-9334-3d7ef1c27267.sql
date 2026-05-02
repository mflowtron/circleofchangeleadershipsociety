-- Tables
CREATE TABLE public.album_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT CHECK (caption IS NULL OR char_length(caption) <= 500),
  width INT,
  height INT,
  file_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_album_photos_created_at ON public.album_photos(created_at DESC);
CREATE INDEX idx_album_photos_uploaded_by ON public.album_photos(uploaded_by);

CREATE TABLE public.album_photo_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.album_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (photo_id, user_id)
);

CREATE INDEX idx_album_photo_likes_photo ON public.album_photo_likes(photo_id);

CREATE TABLE public.album_photo_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.album_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_album_photo_comments_photo ON public.album_photo_comments(photo_id, created_at);

-- Updated_at trigger for album_photos
CREATE TRIGGER update_album_photos_updated_at
BEFORE UPDATE ON public.album_photos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photo_comments ENABLE ROW LEVEL SECURITY;

-- album_photos policies
CREATE POLICY "Authenticated can view album photos"
ON public.album_photos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can upload album photos"
ON public.album_photos FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Owners or admins can update album photos"
ON public.album_photos FOR UPDATE
USING (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));

CREATE POLICY "Owners or admins can delete album photos"
ON public.album_photos FOR DELETE
USING (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));

-- album_photo_likes policies
CREATE POLICY "Authenticated can view album likes"
ON public.album_photo_likes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage own album likes - insert"
ON public.album_photo_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own album likes - delete"
ON public.album_photo_likes FOR DELETE
USING (auth.uid() = user_id);

-- album_photo_comments policies
CREATE POLICY "Authenticated can view album comments"
ON public.album_photo_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can post album comments"
ON public.album_photo_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins can delete album comments"
ON public.album_photo_comments FOR DELETE
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('album-photos', 'album-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for album-photos bucket
CREATE POLICY "Album photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'album-photos');

CREATE POLICY "Album photos authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'album-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Album photos owner or admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'album-photos'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);

CREATE POLICY "Album photos owner or admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'album-photos'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);
