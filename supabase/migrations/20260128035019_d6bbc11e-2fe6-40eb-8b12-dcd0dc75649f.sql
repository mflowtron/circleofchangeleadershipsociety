-- Create a function to get like count for a post (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_post_like_count(post_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.likes WHERE post_id = post_uuid
$$;

-- Create a function to check if current user has liked a post
CREATE OR REPLACE FUNCTION public.has_user_liked_post(post_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.likes 
    WHERE post_id = post_uuid AND user_id = auth.uid()
  )
$$;

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Likes viewable by authenticated" ON public.likes;

-- Create a new policy that only allows users to see their own likes
CREATE POLICY "Users can view own likes"
ON public.likes
FOR SELECT
USING (user_id = auth.uid());