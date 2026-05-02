import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2, Loader2 } from 'lucide-react';
import {
  useAlbumComments,
  useAddAlbumComment,
  useDeleteAlbumComment,
} from '@/hooks/useAlbumComments';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  photoId: string;
}

export function AlbumCommentList({ photoId }: Props) {
  const { user, isAdmin } = useAuth();
  const { data: comments = [], isLoading } = useAlbumComments(photoId);
  const addComment = useAddAlbumComment();
  const deleteComment = useDeleteAlbumComment();
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await addComment.mutateAsync({ photoId, content: text });
    setText('');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No comments yet. Be the first.
          </p>
        ) : (
          comments.map((c) => {
            const initials = c.author.full_name
              .split(' ')
              .map((s) => s[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const canDelete = user?.id === c.user_id || isAdmin;
            return (
              <div key={c.id} className="flex gap-2.5 group">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={c.author.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-muted rounded-2xl px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">{c.author.full_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => deleteComment.mutate({ id: c.id, photoId })}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition self-center"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      {user && (
        <div className="pt-3 border-t mt-3 flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            placeholder="Add a comment…"
            rows={1}
            className="resize-none min-h-[40px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!text.trim() || addComment.isPending}
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
