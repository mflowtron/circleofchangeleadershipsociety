import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Post } from '@/hooks/usePosts';

export function useUserPosts(userId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPosts = useCallback(async () => {
    if (!userId || !user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
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
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = postsData.map(p => p.id);

      // Batch fetch all data in parallel using post_interactions
      const [profileResult, likesResult, commentsResult, userLikesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('post_interactions')
          .select('post_id')
          .eq('type', 'like')
          .in('post_id', postIds),
        supabase
          .from('post_interactions')
          .select('post_id')
          .eq('type', 'comment')
          .in('post_id', postIds),
        supabase
          .from('post_interactions')
          .select('post_id')
          .eq('type', 'like')
          .eq('user_id', user.id)
          .in('post_id', postIds),
      ]);

      const authorProfile = profileResult.data || { full_name: 'Unknown', avatar_url: null };

      const likesCountMap = new Map<string, number>();
      likesResult.data?.forEach(like => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
      });

      const commentsCountMap = new Map<string, number>();
      commentsResult.data?.forEach(comment => {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1);
      });

      const userLikesSet = new Set(userLikesResult.data?.map(l => l.post_id) || []);

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
        author: { full_name: authorProfile.full_name, avatar_url: authorProfile.avatar_url },
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        user_has_liked: userLikesSet.has(post.id),
      }));

      setPosts(enrichedPosts);
    } catch (error: any) {
      toast.error('Error loading posts', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const toggleLike = useCallback(async (postId: string, hasLiked: boolean) => {
    if (!user) return;

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
          .from('post_interactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('type', 'like');
      } else {
        await supabase.from('post_interactions').insert({
          post_id: postId,
          user_id: user.id,
          type: 'like',
        });
      }
    } catch (error: any) {
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
      toast.error('Error', {
        description: error.message,
      });
    }
  }, [user]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      toast.success('Post deleted', {
        description: 'The post has been removed.',
      });
      fetchPosts();
    } catch (error: any) {
      toast.error('Error deleting post', {
        description: error.message,
      });
    }
  }, [fetchPosts]);

  return { posts, loading, toggleLike, deletePost, refetch: fetchPosts };
}
