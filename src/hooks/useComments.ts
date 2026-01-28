import { useState, useEffect } from 'react';
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

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author info for each comment
      const enrichedComments = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', comment.user_id)
            .single();

          return {
            ...comment,
            author: authorData || { full_name: 'Unknown', avatar_url: null },
          };
        })
      );

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
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const addComment = async (content: string) => {
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
  };

  const deleteComment = async (commentId: string) => {
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
  };

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
}
