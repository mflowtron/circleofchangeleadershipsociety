import { useState } from 'react';
import { Post } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Trash2, Globe, Users, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import CommentsSection from './CommentsSection';
import ImageLightbox from '@/components/ui/image-lightbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onDelete: () => void;
}

// CSS for heart animation
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

export default function PostCard({ post, onLike, onDelete }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { user, role } = useAuth();

  const canDelete = user?.id === post.user_id || role === 'admin';
  const initials = post.author.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleLike = () => {
    setIsAnimating(true);
    onLike();
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <>
      <style>{heartAnimationStyles}</style>
      <Card className="shadow-soft border-border/50 overflow-hidden hover:shadow-medium transition-shadow duration-300">
        <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-primary/10">
              <AvatarImage src={post.author.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{post.author.full_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
      <CardContent className="pb-3">
        <p className="text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.image_url && (
          <div className="mt-4 -mx-6">
            <ImageLightbox 
              src={post.image_url} 
              className="w-full max-h-[500px] object-cover" 
            />
          </div>
        )}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-primary hover:underline text-sm"
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
            onClick={() => setShowComments(!showComments)}
            className="flex-1 gap-2 rounded-xl h-10 hover:bg-primary/10"
          >
            <MessageCircle className={cn("h-5 w-5", showComments && "text-primary")} />
            <span className="font-medium">{post.comments_count}</span>
          </Button>
        </div>
        {showComments && <CommentsSection postId={post.id} />}
      </CardFooter>
      </Card>
    </>
  );
}
