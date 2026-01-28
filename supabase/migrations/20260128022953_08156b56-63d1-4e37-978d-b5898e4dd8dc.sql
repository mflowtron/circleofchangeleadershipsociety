-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'advisor', 'student');

-- Create chapters table (cohorts/class years)
CREATE TABLE public.chapters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'student',
    UNIQUE (user_id, role)
);

-- Create advisor_chapters junction table (advisors can oversee specific chapters)
CREATE TABLE public.advisor_chapters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, chapter_id)
);

-- Create posts table
CREATE TABLE public.posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    link_url TEXT,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    is_global BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create likes table
CREATE TABLE public.likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);

-- Create recordings table
CREATE TABLE public.recordings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's chapter
CREATE OR REPLACE FUNCTION public.get_user_chapter(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT chapter_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to check if user is advisor for a chapter
CREATE OR REPLACE FUNCTION public.is_advisor_for_chapter(_user_id UUID, _chapter_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.advisor_chapters
    WHERE user_id = _user_id AND chapter_id = _chapter_id
  )
$$;

-- Profiles policies
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage, users can view own)
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Chapters policies
CREATE POLICY "Chapters viewable by authenticated users"
ON public.chapters FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert chapters"
ON public.chapters FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update chapters"
ON public.chapters FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete chapters"
ON public.chapters FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Advisor chapters policies
CREATE POLICY "Advisor chapters viewable by authenticated"
ON public.advisor_chapters FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage advisor chapters"
ON public.advisor_chapters FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Posts policies
CREATE POLICY "Users can view global posts and their chapter posts"
ON public.posts FOR SELECT TO authenticated
USING (
  is_global = true 
  OR chapter_id = public.get_user_chapter(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'advisor') AND public.is_advisor_for_chapter(auth.uid(), chapter_id))
);

CREATE POLICY "Users can delete own posts or admins/advisors can moderate"
ON public.posts FOR DELETE TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'advisor') AND public.is_advisor_for_chapter(auth.uid(), chapter_id))
);

-- Comments policies
CREATE POLICY "Comments viewable with post access"
ON public.comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_id
    AND (p.is_global = true OR p.chapter_id = public.get_user_chapter(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can create comments"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Likes policies
CREATE POLICY "Likes viewable by authenticated"
ON public.likes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can like posts"
ON public.likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
ON public.likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Recordings policies
CREATE POLICY "Recordings viewable by authenticated"
ON public.recordings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and advisors can upload recordings"
ON public.recordings FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor')
);

CREATE POLICY "Admins can update recordings"
ON public.recordings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete recordings"
ON public.recordings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();