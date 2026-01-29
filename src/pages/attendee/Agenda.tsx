import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Filter } from 'lucide-react';
import { useAttendee } from '@/contexts/AttendeeContext';
import { useAgendaItems, AgendaItem } from '@/hooks/useAgendaItems';
import { AgendaItemCard } from '@/components/attendee/AgendaItemCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const { selectedEvent, bookmarkedItemIds, toggleBookmark, refreshBookmarks } = useAttendee();
  const { agendaItems, itemsByDate, tracks, isLoading } = useAgendaItems(selectedEvent?.id);
  
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // Get sorted dates
  const dates = useMemo(() => {
    return Object.keys(itemsByDate).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  }, [itemsByDate]);

  // Filter items for selected date and track
  const filteredItems = useMemo(() => {
    if (dates.length === 0) return [];
    
    const selectedDate = dates[selectedDateIndex];
    let items = itemsByDate[selectedDate] || [];
    
    if (selectedTrack) {
      items = items.filter(item => item.track === selectedTrack);
    }
    
    return items.sort((a, b) => 
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }, [dates, selectedDateIndex, itemsByDate, selectedTrack]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await refreshBookmarks();
  }, [refreshBookmarks]);

  const { containerRef, pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const handleToggleBookmark = useCallback(async (itemId: string) => {
    await toggleBookmark(itemId);
  }, [toggleBookmark]);

  const getSpeakersForItem = (item: AgendaItem) => {
    return item.speakers?.map(s => ({
      id: s.speaker_id,
      name: s.speaker?.name || '',
      title: s.speaker?.title || null,
      company: s.speaker?.company || null,
      photo_url: s.speaker?.photo_url || null,
    })) || [];
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (agendaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="text-xl font-semibold mb-2">No Agenda Yet</h2>
        <p className="text-muted-foreground max-w-xs">
          The event agenda hasn't been published yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-full"
    >
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
        progress={progress} 
      />

      {/* Day Tabs */}
      {dates.length > 1 && (
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex overflow-x-auto scrollbar-hide">
            {dates.map((date, index) => (
              <button
                key={date}
                onClick={() => setSelectedDateIndex(index)}
                className={cn(
                  "flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                  "touch-manipulation",
                  index === selectedDateIndex
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {format(new Date(date), 'EEE, MMM d')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Track Filter */}
      {tracks.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                {selectedTrack || 'All Tracks'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSelectedTrack(null)}>
                All Tracks
              </DropdownMenuItem>
              {tracks.map(track => (
                <DropdownMenuItem 
                  key={track} 
                  onClick={() => setSelectedTrack(track)}
                >
                  {track}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Agenda Items */}
      <div className="p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sessions found for this filter.
          </div>
        ) : (
          filteredItems.map(item => (
            <AgendaItemCard
              key={item.id}
              id={item.id}
              title={item.title}
              description={item.description}
              starts_at={item.starts_at}
              ends_at={item.ends_at}
              location={item.location}
              track={item.track}
              item_type={item.item_type}
              is_highlighted={item.is_highlighted}
              speakers={getSpeakersForItem(item)}
              isBookmarked={bookmarkedItemIds.has(item.id)}
              onToggleBookmark={() => handleToggleBookmark(item.id)}
              isExpanded={expandedItemId === item.id}
              onToggleExpand={() => setExpandedItemId(
                expandedItemId === item.id ? null : item.id
              )}
            />
          ))
        )}
      </div>
    </div>
  );
}
