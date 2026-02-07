import { useMemo, useCallback, useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAttendee } from '@/contexts/AttendeeContext';
import { useAgendaItems, AgendaItem } from '@/hooks/useAgendaItems';
import { AgendaItemCard } from '@/components/attendee/AgendaItemCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Calendar } from 'lucide-react';

export default function MyBookmarks() {
  const { selectedEvent, bookmarks, bookmarkedItemIds, toggleBookmark, refreshBookmarks } = useAttendee();
  const { agendaItems, isLoading } = useAgendaItems(selectedEvent?.id);
  
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Get bookmarked items
  const bookmarkedItems = useMemo(() => {
    return agendaItems
      .filter(item => bookmarkedItemIds.has(item.id))
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [agendaItems, bookmarkedItemIds]);

  // Group by date
  const itemsByDate = useMemo(() => {
    return bookmarkedItems.reduce((acc, item) => {
      const date = new Date(item.starts_at).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, AgendaItem[]>);
  }, [bookmarkedItems]);

  const sortedDates = useMemo(() => {
    return Object.keys(itemsByDate).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  }, [itemsByDate]);

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
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Empty state
  if (bookmarkedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="text-6xl mb-4">📌</div>
        <h2 className="text-xl font-semibold mb-2">No Sessions Saved</h2>
        <p className="text-muted-foreground max-w-xs mb-6">
          Bookmark sessions from the agenda to view them here.
        </p>
        <Link to="/attendee/app/agenda">
          <Button className="gap-2">
            <Calendar className="h-4 w-4" />
            Browse Agenda
          </Button>
        </Link>
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

      <div className="p-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          {bookmarkedItems.length} session{bookmarkedItems.length !== 1 ? 's' : ''} saved
        </p>

        {sortedDates.map(date => (
          <div key={date} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
              {format(new Date(date), 'EEEE, MMMM d')}
            </h3>
            
            {itemsByDate[date].map(item => (
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
                isBookmarked={true}
                onToggleBookmark={() => handleToggleBookmark(item.id)}
                isExpanded={expandedItemId === item.id}
                onToggleExpand={() => setExpandedItemId(
                  expandedItemId === item.id ? null : item.id
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
