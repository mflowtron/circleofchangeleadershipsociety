import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  video_aspect_ratio: string | null;
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

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Build the base query
      let query = supabase
        .from('lms_posts')
        .select(`
          id,
          content,
          image_url,
          video_url,
          video_aspect_ratio,
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

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = postsData.map(p => p.id);
      const userIds = [...new Set(postsData.map(p => p.user_id))];

      // Batch fetch all data in parallel
      const [profilesResult, likesResult, commentsResult, userLikesResult] = await Promise.all([
        // Batch fetch profiles for all unique user IDs
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds),
        // Batch fetch likes counts
        supabase
          .from('lms_likes')
          .select('post_id')
          .in('post_id', postIds),
        // Batch fetch comments counts
        supabase
          .from('lms_comments')
          .select('post_id')
          .in('post_id', postIds),
        // Batch fetch user's likes
        supabase
          .from('lms_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds),
      ]);

      // Create lookup maps for O(1) access
      const profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      profilesResult.data?.forEach(profile => {
        profilesMap.set(profile.user_id, { full_name: profile.full_name, avatar_url: profile.avatar_url });
      });

      const likesCountMap = new Map<string, number>();
      likesResult.data?.forEach(like => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
      });

      const commentsCountMap = new Map<string, number>();
      commentsResult.data?.forEach(comment => {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1);
      });

      const userLikesSet = new Set(userLikesResult.data?.map(l => l.post_id) || []);

      // Transform posts with enriched data
      const enrichedPosts: Post[] = postsData.map((post) => ({
        id: post.id,
        content: post.content,
        image_url: post.image_url,
        video_url: post.video_url,
        video_aspect_ratio: post.video_aspect_ratio,
        link_url: post.link_url,
        is_global: post.is_global,
        chapter_id: post.chapter_id,
        created_at: post.created_at,
        user_id: post.user_id,
        author: profilesMap.get(post.user_id) || { full_name: 'Unknown', avatar_url: null },
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        user_has_liked: userLikesSet.has(post.id),
      }));

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
  }, [user, filter, profile?.chapter_id, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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

      const { error } = await supabase.from('lms_posts').insert({
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

  const toggleLike = useCallback(async (postId: string, hasLiked: boolean) => {
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
          .from('lms_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('lms_likes').insert({
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
  }, [user, toast]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.from('lms_posts').delete().eq('id', postId);
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
  }, [fetchPosts, toast]);

  return { posts, loading, createPost, toggleLike, deletePost, refetch: fetchPosts };
}
