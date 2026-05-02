-- album_photos
DROP POLICY IF EXISTS "Authenticated can upload album photos" ON public.album_photos;
DROP POLICY IF EXISTS "Authenticated can view album photos" ON public.album_photos;
DROP POLICY IF EXISTS "Owners or admins can delete album photos" ON public.album_photos;
DROP POLICY IF EXISTS "Owners or admins can update album photos" ON public.album_photos;

CREATE POLICY "Authenticated can view album photos"
ON public.album_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can upload album photos"
ON public.album_photos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Owners or admins can update album photos"
ON public.album_photos FOR UPDATE
TO authenticated
USING ((auth.uid() = uploaded_by) OR is_admin(auth.uid()))
WITH CHECK ((auth.uid() = uploaded_by) OR is_admin(auth.uid()));

CREATE POLICY "Owners or admins can delete album photos"
ON public.album_photos FOR DELETE
TO authenticated
USING ((auth.uid() = uploaded_by) OR is_admin(auth.uid()));

-- album_photo_likes
DROP POLICY IF EXISTS "Authenticated can view album likes" ON public.album_photo_likes;
DROP POLICY IF EXISTS "Users manage own album likes - delete" ON public.album_photo_likes;
DROP POLICY IF EXISTS "Users manage own album likes - insert" ON public.album_photo_likes;

CREATE POLICY "Authenticated can view album likes"
ON public.album_photo_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage own album likes - insert"
ON public.album_photo_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own album likes - delete"
ON public.album_photo_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- album_photo_comments
DROP POLICY IF EXISTS "Authenticated can post album comments" ON public.album_photo_comments;
DROP POLICY IF EXISTS "Authenticated can view album comments" ON public.album_photo_comments;
DROP POLICY IF EXISTS "Owners or admins can delete album comments" ON public.album_photo_comments;

CREATE POLICY "Authenticated can view album comments"
ON public.album_photo_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can post album comments"
ON public.album_photo_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins can delete album comments"
ON public.album_photo_comments FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));