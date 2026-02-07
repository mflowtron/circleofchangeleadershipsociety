import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from './BookmarkButton';
import type { AgendaItemType } from '@/hooks/useAgendaItems';
import { cn } from '@/lib/utils';
import { AgendaTypeIcon } from '@/components/events/agenda/AgendaTypeIcon';

interface AgendaItemCardProps {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  track?: string | null;
  item_type: AgendaItemType;
  is_highlighted?: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => Promise<void>;
}

export function AgendaItemCard({
  id,
  title,
  starts_at,
  ends_at,
  location,
  track,
  item_type,
  is_highlighted,
  isBookmarked,
  onToggleBookmark,
}: AgendaItemCardProps) {
  const navigate = useNavigate();
  const startTime = format(new Date(starts_at), 'h:mm a');
  const endTime = ends_at ? format(new Date(ends_at), 'h:mm a') : null;
  
  // Sessions and networking events can be bookmarked
  const isBookmarkable = item_type === 'session' || item_type === 'networking';

  const handleCardClick = () => {
    navigate(`/attendee/app/agenda/${id}`);
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 touch-manipulation cursor-pointer active:scale-[0.98]",
        is_highlighted && "border-primary/50 bg-primary/5"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Time column */}
          <div className="shrink-0 w-16 text-center">
            <div className="text-sm font-semibold">{startTime}</div>
            {endTime && (
              <div className="text-xs text-muted-foreground">{endTime}</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <AgendaTypeIcon type={item_type} className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium leading-tight">{title}</h3>
                
                {/* Track badge */}
                {track && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {track}
                  </Badge>
                )}
                
                {/* Location */}
                {location && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bookmark button - only for bookmarkable items */}
          {isBookmarkable && (
            <BookmarkButton
              isBookmarked={isBookmarked}
              onToggle={onToggleBookmark}
              size="sm"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
