import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'auto_flagged';

export interface ModerationPost {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  is_global: boolean;
  created_at: string;
  user_id: string;
  moderation_status: ModerationStatus | null;
  moderation_score: number | null;
  moderation_reasons: string[] | null;
  moderated_at: string | null;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
  chapter_name: string | null;
}

export type FilterTab = 'all' | 'flagged' | 'auto_flagged';

export function useModerationPosts(filter: FilterTab = 'all') {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          video_url,
          is_global,
          created_at,
          user_id,
          chapter_id,
          moderation_status,
          moderation_score,
          moderation_reasons,
          moderated_at
        `)
        .order('created_at', { ascending: false });

      // Apply filter
      if (filter === 'flagged') {
        query = query.eq('moderation_status', 'flagged');
      } else if (filter === 'auto_flagged') {
        query = query.eq('moderation_status', 'auto_flagged');
      }
      // 'all' shows everything - no filter

      const { data: postsData, error } = await query;

      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Batch fetch authors and chapters
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const chapterIds = [...new Set(postsData.filter(p => p.chapter_id).map(p => p.chapter_id!))];

      const [profilesResult, chaptersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds),
        chapterIds.length > 0
          ? supabase.from('chapters').select('id, name').in('id', chapterIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      profilesResult.data?.forEach(profile => {
        profilesMap.set(profile.user_id, { full_name: profile.full_name, avatar_url: profile.avatar_url });
      });

      const chaptersMap = new Map<string, string>();
      chaptersResult.data?.forEach((chapter: { id: string; name: string }) => {
        chaptersMap.set(chapter.id, chapter.name);
      });

      const enrichedPosts: ModerationPost[] = postsData.map((post) => ({
        id: post.id,
        content: post.content,
        image_url: post.image_url,
        video_url: post.video_url,
        is_global: post.is_global,
        created_at: post.created_at,
        user_id: post.user_id,
        moderation_status: post.moderation_status as ModerationStatus | null,
        moderation_score: post.moderation_score,
        moderation_reasons: post.moderation_reasons,
        moderated_at: post.moderated_at,
        author: profilesMap.get(post.user_id) || { full_name: 'Unknown', avatar_url: null },
        chapter_name: post.chapter_id ? chaptersMap.get(post.chapter_id) || null : null,
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
  }, [filter, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const scanPost = useCallback(async (post: ModerationPost) => {
    setScanning(post.id);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: {
          postId: post.id,
          content: post.content,
          imageUrl: post.image_url,
          videoUrl: post.video_url,
        },
      });

      if (error) throw error;

      toast({
        title: 'Scan complete',
        description: `Status: ${data.status}, Score: ${(data.score * 100).toFixed(0)}%`,
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Scan failed',
        description: error.message,
      });
    } finally {
      setScanning(null);
    }
  }, [fetchPosts, toast]);

  const approvePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          moderation_status: 'approved',
          moderated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      toast({ title: 'Post approved' });
      fetchPosts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error approving post',
        description: error.message,
      });
    }
  }, [fetchPosts, toast]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      toast({ title: 'Post deleted' });
      fetchPosts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting post',
        description: error.message,
      });
    }
  }, [fetchPosts, toast]);

  const stats = {
    total: posts.length,
    flagged: posts.filter(p => p.moderation_status === 'flagged').length,
    autoFlagged: posts.filter(p => p.moderation_status === 'auto_flagged').length,
    pending: posts.filter(p => p.moderation_status === 'pending').length,
  };

  return {
    posts,
    loading,
    scanning,
    stats,
    scanPost,
    approvePost,
    deletePost,
    refetch: fetchPosts,
  };
}
