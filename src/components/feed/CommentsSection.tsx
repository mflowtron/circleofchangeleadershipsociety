import { useState, memo, useCallback, useMemo } from 'react';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Send, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommentsSectionProps {
  postId: string;
}

const CommentsSection = memo(function CommentsSection({ postId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const { comments, loading, addComment, deleteComment } = useComments(postId);
  const { user, role, profile } = useAuth();

  const userInitials = useMemo(() => 
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?',
    [profile?.full_name]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  }, [newComment, addComment]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(e.target.value);
  }, []);

  return (
    <div className="border-t border-border/50 pt-4 space-y-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/10">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChange={handleInputChange}
          className="flex-1 bg-muted/30 border-border/50 rounded-full h-10"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newComment.trim()}
          className="rounded-full h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1 h-16 bg-muted rounded-2xl" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Be the first to comment!</p>
          <p className="text-xs text-muted-foreground mt-0.5">Share your thoughts above</p>
        </div>
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
              <div key={comment.id} className="flex gap-2 group">
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/10">
                  <AvatarImage src={comment.author.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/50 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{comment.author.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default CommentsSection;
