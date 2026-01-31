import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClickableUserAvatar } from '@/components/ui/clickable-user-avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Trash2,
  Globe,
  Users,
  CheckCircle,
  RefreshCw,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  Flag,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ModerationPost, ModerationStatus } from '@/hooks/useModerationPosts';

interface ModerationPostCardProps {
  post: ModerationPost;
  scanning: boolean;
  onScan: () => void;
  onApprove: () => void;
  onDelete: () => void;
}

function getStatusBadge(status: ModerationStatus | null) {
  switch (status) {
    case 'auto_flagged':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Auto-Flagged
        </Badge>
      );
    case 'flagged':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-500">
          <Flag className="h-3 w-3" />
          Needs Review
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-emerald-500 text-emerald-500">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

export function ModerationPostCard({
  post,
  scanning,
  onScan,
  onApprove,
  onDelete,
}: ModerationPostCardProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const isLongContent = post.content.length > 300;
  const displayContent = showFullContent || !isLongContent 
    ? post.content 
    : post.content.slice(0, 300) + '...';

  return (
    <Card className={
      post.moderation_status === 'auto_flagged' 
        ? 'border-destructive/50 bg-destructive/5' 
        : post.moderation_status === 'flagged'
        ? 'border-amber-500/50 bg-amber-500/5'
        : ''
    }>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Header: Author, timestamp, status */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <ClickableUserAvatar
                userId={post.user_id}
                fullName={post.author.full_name}
                avatarUrl={post.author.avatar_url}
                size="md"
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">{post.author.full_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  {post.is_global ? (
                    <>
                      <Globe className="h-3 w-3 flex-shrink-0" />
                      <span>Everyone</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{post.chapter_name || 'Chapter'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(post.moderation_status)}
            </div>
          </div>

          {/* Content */}
          <div>
            <p className="text-foreground whitespace-pre-wrap break-words">{displayContent}</p>
            {isLongContent && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-primary"
                onClick={() => setShowFullContent(!showFullContent)}
              >
                {showFullContent ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>

          {/* Media indicators */}
          {(post.image_url || post.video_url) && (
            <div className="flex items-center gap-3">
              {post.image_url && (
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <img
                    src={post.image_url}
                    alt="Post attachment"
                    className="h-16 w-16 object-cover rounded-md border"
                  />
                </div>
              )}
              {post.video_url && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <img
                    src={`https://image.mux.com/${post.video_url}/thumbnail.png?width=120&height=80`}
                    alt="Video thumbnail"
                    className="h-16 w-24 object-cover rounded-md border"
                  />
                </div>
              )}
            </div>
          )}

          {/* Moderation details */}
          {post.moderation_score !== null && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                AI Confidence: <strong className={post.moderation_score >= 0.8 ? 'text-destructive' : post.moderation_score >= 0.5 ? 'text-amber-500' : 'text-emerald-500'}>
                  {(post.moderation_score * 100).toFixed(0)}%
                </strong>
              </span>
              {post.moderation_reasons && post.moderation_reasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.moderation_reasons.map((reason) => (
                    <Badge key={reason} variant="outline" className="text-xs capitalize">
                      {reason.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onScan}
              disabled={scanning}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning...' : 'Re-scan'}
            </Button>
            
            {post.moderation_status !== 'approved' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onApprove}
                className="flex items-center gap-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Post</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this post? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
