-- Drop the advisor_chapters table
DROP TABLE IF EXISTS public.advisor_chapters CASCADE;

-- Recreate is_advisor_for_chapter to use profiles.chapter_id instead
CREATE OR REPLACE FUNCTION public.is_advisor_for_chapter(p_user_id uuid, p_chapter_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id 
    AND chapter_id = p_chapter_id 
    AND role = 'advisor'
  );
$$;