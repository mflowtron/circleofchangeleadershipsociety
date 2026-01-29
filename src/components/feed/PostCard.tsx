import { useState, memo, useCallback, lazy, Suspense } from 'react';
import { Post } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Trash2, Globe, Users, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import CommentsSection from './CommentsSection';
import { ClickableUserAvatar } from '@/components/ui/clickable-user-avatar';
import ImageLightbox from '@/components/ui/image-lightbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Lazy load MuxPlayer since it's a heavy component
const MuxPlayer = lazy(() => import('@mux/mux-player-react'));

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onDelete: () => void;
}

// Move styles outside component to avoid recreation
const heartAnimationStyles = `
  @keyframes heart-pop {
    0% { transform: scale(1); }
    25% { transform: scale(1.3); }
    50% { transform: scale(0.95); }
    75% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  .animate-heart-pop {
    animation: heart-pop 0.4s ease-out;
  }
`;

// Inject styles once at module load
if (typeof document !== 'undefined') {
  const styleId = 'heart-animation-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = heartAnimationStyles;
    document.head.appendChild(style);
  }
}

const PostCard = memo(function PostCard({ post, onLike, onDelete }: PostCardProps) {
  const [showComments, setShowComments] = useState(post.comments_count > 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { user, role } = useAuth();

  const canDelete = user?.id === post.user_id || role === 'admin';
  const initials = post.author.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleLike = useCallback(() => {
    setIsAnimating(true);
    onLike();
    setTimeout(() => setIsAnimating(false), 400);
  }, [onLike]);

  const toggleComments = useCallback(() => {
    setShowComments(prev => !prev);
  }, []);

  const isVerticalVideo = post.video_aspect_ratio?.startsWith('9:') || post.video_aspect_ratio === '3:4';

  return (
    <Card className="shadow-soft border-border/50 overflow-hidden hover:shadow-medium transition-shadow duration-300 max-w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ClickableUserAvatar
              userId={post.user_id}
              fullName={post.author.full_name}
              avatarUrl={post.author.avatar_url}
              size="lg"
              showName
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              {post.is_global ? (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Everyone
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> Chapter
                </span>
              )}
            </div>
          </div>
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem 
                  onClick={onDelete} 
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3 overflow-hidden">
        <p className="text-foreground whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere">{post.content}</p>
        {post.video_url && (
          <div className={cn(
            "mt-4 overflow-hidden relative rounded-lg",
            isVerticalVideo ? "flex justify-center items-center" : ""
          )}>
            {/* Blurred poster background for vertical videos */}
            {isVerticalVideo && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://image.mux.com/${post.video_url}/thumbnail.png?width=100&height=100)`,
                  filter: 'blur(40px)',
                  transform: 'scale(1.2)',
                }}
                aria-hidden="true"
              />
            )}
            <Suspense fallback={
              <div className={cn(
                "bg-muted animate-pulse",
                isVerticalVideo ? "max-w-[320px] aspect-[9/16] relative z-10" : "w-full aspect-video"
              )} />
            }>
              <MuxPlayer
                playbackId={post.video_url}
                metadata={{
                  video_title: `Post by ${post.author.full_name}`,
                }}
                accentColor="#C9A55C"
                className={cn(
                  isVerticalVideo ? "max-w-[320px] aspect-[9/16] relative z-10" : "w-full aspect-video"
                )}
              />
            </Suspense>
          </div>
        )}
        {post.image_url && !post.video_url && (
          <ImageLightbox 
            src={post.image_url} 
            className="mt-4 w-full max-h-[500px] object-cover rounded-lg" 
          />
        )}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-primary hover:underline text-sm truncate"
          >
            {post.link_url}
          </a>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 pt-0">
        <div className="flex items-center gap-1 border-t border-border/50 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              "flex-1 gap-2 rounded-xl h-10 hover:bg-destructive/10",
              post.user_has_liked && "text-destructive"
            )}
          >
            <Heart className={cn(
              "h-5 w-5 transition-transform",
              post.user_has_liked && "fill-current",
              isAnimating && "animate-heart-pop"
            )} />
            <span className="font-medium">{post.likes_count}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleComments}
            className="flex-1 gap-2 rounded-xl h-10 hover:bg-primary/10"
          >
            <MessageCircle className={cn("h-5 w-5", showComments && "text-primary")} />
            <span className="font-medium">{post.comments_count}</span>
          </Button>
        </div>
        {showComments && <CommentsSection postId={post.id} />}
      </CardFooter>
    </Card>
  );
});

export default PostCard;
