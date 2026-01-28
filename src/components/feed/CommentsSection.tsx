import { useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommentsSectionProps {
  postId: string;
}

export default function CommentsSection({ postId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const { comments, loading, addComment, deleteComment } = useComments(postId);
  const { user, role } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const canDelete = user?.id === comment.user_id || role === 'admin';
            const initials = comment.author.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            return (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
