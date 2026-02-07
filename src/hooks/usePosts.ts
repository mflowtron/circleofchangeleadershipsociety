import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

const uploadImage = async (file: File, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

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

export function usePosts(filter: FilterType = 'all') {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Main query for fetching posts
  const {
    data: posts = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['posts', filter, profile?.chapter_id],
    queryFn: async (): Promise<Post[]> => {
      if (!user) return [];

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
        return [];
      }

      const postIds = postsData.map(p => p.id);
      const userIds = [...new Set(postsData.map(p => p.user_id))];

      // Batch fetch all data in parallel
      const [profilesResult, likesResult, commentsResult, userLikesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds),
        supabase
          .from('lms_likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('lms_comments')
          .select('post_id')
          .in('post_id', postIds),
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
      return postsData.map((post) => ({
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
    },
    enabled: !!user,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async ({ 
      content, 
      isGlobal, 
      imageFile, 
      videoPlaybackId 
    }: { 
      content: string; 
      isGlobal: boolean; 
      imageFile?: File; 
      videoPlaybackId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let imageUrl: string | null = null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile, user.id);
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
    },
    onSuccess: () => {
      toast.success('Post created!', {
        description: 'Your post has been shared.',
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      toast.error('Error creating post', {
        description: error.message,
      });
    },
  });

  // Toggle like mutation with optimistic updates
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, hasLiked }: { postId: string; hasLiked: boolean }) => {
      if (!user) throw new Error('Not authenticated');

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
    },
    onMutate: async ({ postId, hasLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts', filter, profile?.chapter_id] });

      // Snapshot previous value
      const previousPosts = queryClient.getQueryData<Post[]>(['posts', filter, profile?.chapter_id]);

      // Optimistically update
      queryClient.setQueryData<Post[]>(['posts', filter, profile?.chapter_id], (old) =>
        old?.map(post =>
          post.id === postId
            ? {
                ...post,
                user_has_liked: !hasLiked,
                likes_count: hasLiked ? post.likes_count - 1 : post.likes_count + 1,
              }
            : post
        ) || []
      );

      return { previousPosts };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts', filter, profile?.chapter_id], context.previousPosts);
      }
      toast.error('Error', {
        description: error.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('lms_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Post deleted', {
        description: 'The post has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      toast.error('Error deleting post', {
        description: error.message,
      });
    },
  });

  // Wrapper functions to maintain the same API
  const createPost = async (content: string, isGlobal: boolean, imageFile?: File, videoPlaybackId?: string) => {
    await createPostMutation.mutateAsync({ content, isGlobal, imageFile, videoPlaybackId });
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    await toggleLikeMutation.mutateAsync({ postId, hasLiked });
  };

  const deletePost = async (postId: string) => {
    await deletePostMutation.mutateAsync(postId);
  };

  return { 
    posts, 
    loading, 
    createPost, 
    toggleLike, 
    deletePost, 
    refetch,
    isCreating: createPostMutation.isPending,
  };
}
