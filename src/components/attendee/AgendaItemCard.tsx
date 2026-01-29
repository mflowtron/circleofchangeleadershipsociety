import { format } from 'date-fns';
import { MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from './BookmarkButton';
import type { AgendaItemType } from '@/hooks/useAgendaItems';
import { cn } from '@/lib/utils';
import { AgendaTypeIcon } from '@/components/events/agenda/AgendaTypeIcon';

interface Speaker {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  photo_url: string | null;
}

interface AgendaItemCardProps {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  track?: string | null;
  item_type: AgendaItemType;
  is_highlighted?: boolean;
  speakers?: Speaker[];
  isBookmarked: boolean;
  onToggleBookmark: () => Promise<void>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function AgendaItemCard({
  id,
  title,
  description,
  starts_at,
  ends_at,
  location,
  track,
  item_type,
  is_highlighted,
  speakers = [],
  isBookmarked,
  onToggleBookmark,
  isExpanded = false,
  onToggleExpand,
}: AgendaItemCardProps) {
  const startTime = format(new Date(starts_at), 'h:mm a');
  const endTime = ends_at ? format(new Date(ends_at), 'h:mm a') : null;
  
  // Sessions and networking events can be bookmarked
  const isBookmarkable = item_type === 'session' || item_type === 'networking';

  return (
    <Card 
      className={cn(
        "transition-all duration-200 touch-manipulation",
        is_highlighted && "border-primary/50 bg-primary/5",
        isExpanded && "ring-2 ring-primary/20"
      )}
      onClick={onToggleExpand}
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
                
                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {description && (
                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                    
                    {/* Speakers */}
                    {speakers.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>Speakers</span>
                        </div>
                        <div className="space-y-2">
                          {speakers.map(speaker => (
                            <div key={speaker.id} className="flex items-center gap-2">
                              {speaker.photo_url ? (
                                <img 
                                  src={speaker.photo_url} 
                                  alt={speaker.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {speaker.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {speaker.name}
                                </div>
                                {(speaker.title || speaker.company) && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {[speaker.title, speaker.company].filter(Boolean).join(' · ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
