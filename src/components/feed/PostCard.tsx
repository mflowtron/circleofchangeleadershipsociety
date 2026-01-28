import { useState } from 'react';
import { Post } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Trash2, Globe, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import CommentsSection from './CommentsSection';
import ImageLightbox from '@/components/ui/image-lightbox';

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onDelete: () => void;
}

export default function PostCard({ post, onLike, onDelete }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const { user, role } = useAuth();

  const canDelete = user?.id === post.user_id || role === 'admin';
  const initials = post.author.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.author.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{post.author.full_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span>•</span>
                {post.is_global ? (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Everyone
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Chapter Only
                  </span>
                )}
              </div>
            </div>
          </div>
          {canDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        {post.image_url && (
          <ImageLightbox src={post.image_url} className="mt-3 rounded-lg max-h-96 object-cover" />
        )}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-primary hover:underline"
          >
            {post.link_url}
          </a>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 pt-0">
        <div className="flex items-center gap-4 border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={cn(
              "gap-2",
              post.user_has_liked && "text-destructive"
            )}
          >
            <Heart className={cn("h-4 w-4", post.user_has_liked && "fill-current")} />
            {post.likes_count}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments_count}
          </Button>
        </div>
        {showComments && <CommentsSection postId={post.id} />}
      </CardFooter>
    </Card>
  );
}
