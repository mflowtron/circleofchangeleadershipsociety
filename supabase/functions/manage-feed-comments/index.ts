import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedComment {
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const feedPostId = url.searchParams.get('feed_post_id');
    const eventId = url.searchParams.get('event_id');

    // GET - Fetch comments for a post
    if (req.method === 'GET') {
      if (!feedPostId || !eventId) {
        return new Response(
          JSON.stringify({ error: 'feed_post_id and event_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: comments, error } = await supabase
        .from('feed_post_comments')
        .select(`
          id,
          content,
          created_at,
          attendee_id,
          attendees!inner (
            id,
            attendee_name
          )
        `)
        .eq('feed_post_id', feedPostId)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch comments' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formattedComments: FeedComment[] = (comments || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        attendee_id: c.attendee_id,
        attendee: {
          id: c.attendees.id,
          name: c.attendees.attendee_name,
          avatar_initials: getInitials(c.attendees.attendee_name),
          avatar_bg: getAvatarColor(c.attendees.attendee_name),
        },
      }));

      return new Response(
        JSON.stringify({ comments: formattedComments }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Add a new comment
    if (req.method === 'POST') {
      const body = await req.json();
      const { attendee_id, content } = body;

      if (!feedPostId || !eventId || !attendee_id || !content) {
        return new Response(
          JSON.stringify({ error: 'feed_post_id, event_id, attendee_id, and content are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const trimmedContent = content.trim();
      if (trimmedContent.length === 0 || trimmedContent.length > 500) {
        return new Response(
          JSON.stringify({ error: 'Content must be between 1 and 500 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: newComment, error } = await supabase
        .from('feed_post_comments')
        .insert({
          feed_post_id: feedPostId,
          event_id: eventId,
          attendee_id,
          content: trimmedContent,
        })
        .select(`
          id,
          content,
          created_at,
          attendee_id,
          attendees!inner (
            id,
            attendee_name
          )
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to add comment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formattedComment: FeedComment = {
        id: newComment.id,
        content: newComment.content,
        created_at: newComment.created_at,
        attendee_id: newComment.attendee_id,
        attendee: {
          id: newComment.attendees.id,
          name: newComment.attendees.attendee_name,
          avatar_initials: getInitials(newComment.attendees.attendee_name),
          avatar_bg: getAvatarColor(newComment.attendees.attendee_name),
        },
      };

      return new Response(
        JSON.stringify({ comment: formattedComment }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remove a comment
    if (req.method === 'DELETE') {
      const body = await req.json();
      const { comment_id, attendee_id } = body;

      if (!comment_id || !attendee_id) {
        return new Response(
          JSON.stringify({ error: 'comment_id and attendee_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership before deleting
      const { data: existingComment } = await supabase
        .from('feed_post_comments')
        .select('attendee_id')
        .eq('id', comment_id)
        .single();

      if (!existingComment || existingComment.attendee_id !== attendee_id) {
        return new Response(
          JSON.stringify({ error: 'Comment not found or you are not the owner' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('feed_post_comments')
        .delete()
        .eq('id', comment_id);

      if (error) {
        console.error('Error deleting comment:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete comment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in manage-feed-comments:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
