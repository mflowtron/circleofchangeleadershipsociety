import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { useFeedComments, FeedComment } from '@/hooks/useFeedComments';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedCommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string | null;
  eventId: string | null;
  currentAttendeeId: string | null;
  commentCount: number;
  onCommentCountChange: (postId: string, delta: number) => void;
}

export function FeedCommentsSheet({
  isOpen,
  onClose,
  postId,
  eventId,
  currentAttendeeId,
  commentCount,
  onCommentCountChange,
}: FeedCommentsSheetProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { comments, loading, addComment, deleteComment } = useFeedComments(
    isOpen ? postId : null,
    isOpen ? eventId : null
  );

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (scrollRef.current && comments.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || !currentAttendeeId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(inputValue, currentAttendeeId);
      setInputValue('');
      if (postId) {
        onCommentCountChange(postId, 1);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentAttendeeId) return;

    try {
      await deleteComment(commentId, currentAttendeeId);
      if (postId) {
        onCommentCountChange(postId, -1);
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 bg-[#1a1a1b] rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        style={{ 
          height: '60vh',
          maxHeight: '70vh',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {loading ? 'Comments' : `${comments.length} Comment${comments.length !== 1 ? 's' : ''}`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Comments List */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ height: 'calc(100% - 130px)' }}
        >
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-9 h-9 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24 bg-white/10" />
                    <Skeleton className="h-4 w-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-white/50 text-sm">No comments yet</p>
              <p className="text-white/30 text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isOwn={comment.attendee_id === currentAttendeeId}
                  onDelete={() => handleDelete(comment.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div 
          className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[#1a1a1b] px-4 py-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3">
            {currentAttendeeId ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a comment..."
                  maxLength={500}
                  className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-white/30"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isSubmitting}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </>
            ) : (
              <div className="flex-1 text-center text-white/50 text-sm py-2">
                Sign in to comment
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface CommentItemProps {
  comment: FeedComment;
  isOwn: boolean;
  onDelete: () => void;
}

function CommentItem({ comment, isOwn, onDelete }: CommentItemProps) {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: comment.attendee.avatar_bg }}
      >
        {comment.attendee.avatar_initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">
            {comment.attendee.name}
          </span>
          <span className="text-[11px] text-white/40">{timeAgo}</span>
        </div>
        <p className="text-sm text-white/80 mt-0.5 break-words">
          {comment.content}
        </p>
      </div>

      {/* Delete Button (own comments only) */}
      {isOwn && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
        >
          <Trash2 className="w-4 h-4 text-white/50" />
        </button>
      )}
    </div>
  );
}
