import { format } from 'date-fns';
import { Clock, MapPin, ChevronDown, Star, Filter } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { AgendaTypeIcon, getAgendaTypeConfig } from './AgendaTypeIcon';
import { useAgendaItems, type AgendaItem } from '@/hooks/useAgendaItems';
import { cn } from '@/lib/utils';

interface AgendaPublicViewProps {
  eventId: string;
}

export function AgendaPublicView({ eventId }: AgendaPublicViewProps) {
  const { agendaItems, itemsByDate, tracks, isLoading } = useAgendaItems(eventId);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const sortedDates = Object.keys(itemsByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Initialize all days as expanded
  if (sortedDates.length > 0 && Object.keys(expandedDays).length === 0) {
    const initial: Record<string, boolean> = {};
    sortedDates.forEach((date) => {
      initial[date] = true;
    });
    setExpandedDays(initial);
  }

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const toggleTrack = (track: string) => {
    setSelectedTracks((prev) =>
      prev.includes(track) ? prev.filter((t) => t !== track) : [...prev, track]
    );
  };

  const filterItems = (items: AgendaItem[]) => {
    if (selectedTracks.length === 0) return items;
    return items.filter(
      (item) => !item.track || selectedTracks.includes(item.track)
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  if (agendaItems.length === 0) {
    return null; // Don't show empty agenda section
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Schedule</h2>
        
        {tracks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {selectedTracks.length > 0 
                  ? `${selectedTracks.length} track${selectedTracks.length > 1 ? 's' : ''}`
                  : 'All tracks'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by track</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tracks.map((track) => (
                <DropdownMenuCheckboxItem
                  key={track}
                  checked={selectedTracks.includes(track)}
                  onCheckedChange={() => toggleTrack(track)}
                >
                  {track}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-4">
        {sortedDates.map((dateStr) => {
          const items = filterItems(itemsByDate[dateStr]);
          if (items.length === 0) return null;

          const isExpanded = expandedDays[dateStr] ?? true;

          return (
            <Collapsible
              key={dateStr}
              open={isExpanded}
              onOpenChange={() => toggleDay(dateStr)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                        <span className="text-xs font-medium text-primary uppercase">
                          {format(new Date(dateStr), 'EEE')}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {format(new Date(dateStr), 'd')}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {format(new Date(dateStr), 'EEEE, MMMM d')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <Separator />
                  <CardContent className="p-4 space-y-3">
                    {items.map((item, index) => (
                      <AgendaItemPublic key={item.id} item={item} />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

function AgendaItemPublic({ item }: { item: AgendaItem }) {
  const startTime = format(new Date(item.starts_at), 'h:mm a');
  const endTime = item.ends_at ? format(new Date(item.ends_at), 'h:mm a') : null;
  const config = getAgendaTypeConfig(item.item_type);
  const isSession = item.item_type === 'session';
  const hasSpeakers = item.speakers && item.speakers.length > 0;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        item.is_highlighted && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        <AgendaTypeIcon type={item.item_type} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold">{item.title}</h4>
              {item.is_highlighted && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              )}
              {item.track && (
                <Badge variant="outline" className="text-xs">
                  {item.track}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {startTime}
                {endTime && ` - ${endTime}`}
              </span>
            </div>
            {item.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{item.location}</span>
              </div>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {item.description}
            </p>
          )}

          {/* Speakers */}
          {isSession && hasSpeakers && (
            <div className="mt-3 flex flex-wrap gap-3">
              {item.speakers?.map((itemSpeaker) => {
                const speaker = itemSpeaker.speaker;
                if (!speaker) return null;

                const initials = speaker.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={itemSpeaker.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={speaker.photo_url || undefined}
                        alt={speaker.name}
                      />
                      <AvatarFallback className="text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-tight">{speaker.name}</p>
                      {speaker.title && (
                        <p className="text-xs text-muted-foreground leading-tight">
                          {speaker.title}
                        </p>
                      )}
                    </div>
                    {itemSpeaker.role !== 'speaker' && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {itemSpeaker.role}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
