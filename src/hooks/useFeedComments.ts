import { useState, useCallback, useEffect } from 'react';

export interface FeedComment {
  id: string;
  content: string;
  created_at: string;
  attendee_id: string;
  attendee: {
    id: string;
    name: string;
    avatar_initials: string;
    avatar_bg: string;
  };
}

export function useFeedComments(postId: string | null, eventId: string | null) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    // Skip fetch if either ID is missing - this is expected for demo feeds
    if (!postId || !eventId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-feed-comments?feed_post_id=${encodeURIComponent(postId)}&event_id=${encodeURIComponent(eventId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const result = await response.json();
      setComments(result.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId, eventId]);

  const addComment = useCallback(async (content: string, attendeeId: string) => {
    if (!postId || !eventId || !content.trim()) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-feed-comments?feed_post_id=${encodeURIComponent(postId)}&event_id=${encodeURIComponent(eventId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            attendee_id: attendeeId,
            content: content.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const result = await response.json();
      if (result.comment) {
        setComments(prev => [...prev, result.comment]);
      }

      return result.comment;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  }, [postId, eventId]);

  const deleteComment = useCallback(async (commentId: string, attendeeId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-feed-comments?feed_post_id=${postId}&event_id=${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            comment_id: commentId,
            attendee_id: attendeeId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  }, [postId, eventId]);

  useEffect(() => {
    if (postId && eventId) {
      fetchComments();
    } else {
      setComments([]);
    }
  }, [postId, eventId, fetchComments]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refetch: fetchComments,
  };
}
