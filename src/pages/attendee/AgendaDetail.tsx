import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useAttendee } from '@/contexts/AttendeeContext';
import { useAgendaItems } from '@/hooks/useAgendaItems';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookmarkButton } from '@/components/attendee/BookmarkButton';
import { AgendaTypeIcon } from '@/components/events/agenda/AgendaTypeIcon';

export default function AgendaDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { selectedEvent, bookmarkedItemIds, toggleBookmark } = useAttendee();
  const { agendaItems, isLoading } = useAgendaItems(selectedEvent?.id);

  const item = useMemo(() => {
    return agendaItems.find(i => i.id === itemId);
  }, [agendaItems, itemId]);

  const speakers = useMemo(() => {
    if (!item?.speakers) return [];
    return item.speakers.map(s => ({
      id: s.speaker_id,
      name: s.speaker?.name || '',
      title: s.speaker?.title || null,
      company: s.speaker?.company || null,
      photo_url: s.speaker?.photo_url || null,
      role: s.role || null,
    }));
  }, [item]);

  const isBookmarked = itemId ? bookmarkedItemIds.has(itemId) : false;
  const isBookmarkable = item?.item_type === 'session' || item?.item_type === 'networking';

  const handleBack = () => {
    navigate(-1);
  };

  const handleToggleBookmark = async () => {
    if (itemId) {
      await toggleBookmark(itemId);
    }
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-background flex flex-col"
        style={{ 
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-6 flex-1" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div 
        className="min-h-screen bg-background flex flex-col"
        style={{ 
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold truncate">Not Found</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground">
              This session may have been removed or the link is invalid.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(item.starts_at);
  const endDate = item.ends_at ? new Date(item.ends_at) : null;

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      style={{ 
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <AgendaTypeIcon type={item.item_type} className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h1 className="font-semibold truncate">{item.title}</h1>
        </div>
        {isBookmarkable && (
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={handleToggleBookmark}
            size="sm"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Quick Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {format(startDate, 'h:mm a')}
                {endDate && ` – ${format(endDate, 'h:mm a')}`}
              </span>
            </div>
            
            {item.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{item.location}</span>
              </div>
            )}
            
            {item.track && (
              <Badge variant="secondary" className="mt-2">
                {item.track}
              </Badge>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}

          {/* Speakers */}
          {speakers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Speakers</span>
              </div>
              
              <div className="space-y-3">
                {speakers.map(speaker => (
                  <div 
                    key={speaker.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {speaker.photo_url ? (
                      <img 
                        src={speaker.photo_url} 
                        alt={speaker.name}
                        className="h-12 w-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-lg font-medium">
                          {speaker.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{speaker.name}</div>
                      {(speaker.title || speaker.company) && (
                        <div className="text-sm text-muted-foreground">
                          {[speaker.title, speaker.company].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {speaker.role && speaker.role !== 'speaker' && (
                        <Badge variant="outline" className="mt-1 text-xs capitalize">
                          {speaker.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
