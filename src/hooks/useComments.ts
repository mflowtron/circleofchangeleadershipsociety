import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs and batch fetch profiles
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Create lookup map for O(1) access
      const profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, { full_name: profile.full_name, avatar_url: profile.avatar_url });
      });

      const enrichedComments: Comment[] = data.map((comment) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        author: profilesMap.get(comment.user_id) || { full_name: 'Unknown', avatar_url: null },
      }));

      setComments(enrichedComments);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading comments',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [postId, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(async (content: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content,
      });

      if (error) throw error;
      fetchComments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding comment',
        description: error.message,
      });
    }
  }, [user, postId, fetchComments, toast]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      fetchComments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting comment',
        description: error.message,
      });
    }
  }, [fetchComments, toast]);

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
}
