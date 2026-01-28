import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  is_global: boolean;
  chapter_id: string | null;
  created_at: string;
  user_id: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

type FilterType = 'all' | 'chapter' | 'mine';

export function usePosts(filter: FilterType = 'all') {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchPosts = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          video_url,
          link_url,
          is_global,
          chapter_id,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (filter === 'mine') {
        query = query.eq('user_id', user.id);
      } else if (filter === 'chapter' && profile?.chapter_id) {
        query = query.eq('chapter_id', profile.chapter_id);
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      // Fetch additional data for each post
      const enrichedPosts = await Promise.all(
        (postsData || []).map(async (post) => {
          // Get author profile
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          // Get likes count using database function (privacy-preserving)
          const { data: likesCountData } = await supabase
            .rpc('get_post_like_count', { post_uuid: post.id });

          // Get comments count
          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Check if user has liked using database function (privacy-preserving)
          const { data: userHasLiked } = await supabase
            .rpc('has_user_liked_post', { post_uuid: post.id });

          return {
            ...post,
            author: authorData || { full_name: 'Unknown', avatar_url: null },
            likes_count: likesCountData || 0,
            comments_count: commentsCount || 0,
            user_has_liked: userHasLiked || false,
          };
        })
      );

      setPosts(enrichedPosts);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading posts',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user, filter, profile?.chapter_id]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const createPost = async (content: string, isGlobal: boolean, imageFile?: File, videoPlaybackId?: string) => {
    if (!user) return;

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content,
        is_global: isGlobal,
        chapter_id: isGlobal ? null : profile?.chapter_id,
        image_url: imageUrl,
        video_url: videoPlaybackId || null,
      });

      if (error) throw error;

      toast({
        title: 'Post created!',
        description: 'Your post has been shared.',
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating post',
        description: error.message,
      });
    }
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return;

    // Optimistic update - immediately update UI
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              user_has_liked: !hasLiked,
              likes_count: hasLiked ? post.likes_count - 1 : post.likes_count + 1,
            }
          : post
      )
    );

    try {
      if (hasLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({
          post_id: postId,
          user_id: user.id,
        });
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                user_has_liked: hasLiked,
                likes_count: hasLiked ? post.likes_count + 1 : post.likes_count - 1,
              }
            : post
        )
      );
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      
      toast({
        title: 'Post deleted',
        description: 'The post has been removed.',
      });
      fetchPosts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting post',
        description: error.message,
      });
    }
  };

  return { posts, loading, createPost, toggleLike, deletePost, refetch: fetchPosts };
}
