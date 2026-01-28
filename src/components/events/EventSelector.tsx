import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEvents } from '@/hooks/useEvents';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { cn } from '@/lib/utils';

export function EventSelector() {
  const { events = [], isLoading } = useEvents();
  const { selectedEventIds, setSelectedEventIds, clearSelection, hasSelection } = useEventSelection();

  const handleToggleEvent = (eventId: string) => {
    if (selectedEventIds.includes(eventId)) {
      setSelectedEventIds(selectedEventIds.filter((id) => id !== eventId));
    } else {
      setSelectedEventIds([...selectedEventIds, eventId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEventIds.length === events.length) {
      clearSelection();
    } else {
      setSelectedEventIds(events.map((e) => e.id));
    }
  };

  const getDisplayText = () => {
    if (!hasSelection) return 'All Events';
    if (selectedEventIds.length === 1) {
      const event = events.find((e) => e.id === selectedEventIds[0]);
      return event?.title || '1 Event';
    }
    return `${selectedEventIds.length} Events`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between gap-2 h-auto min-h-10 py-2"
          disabled={isLoading}
        >
          <span className="truncate text-left flex-1">{getDisplayText()}</span>
          <div className="flex items-center gap-1">
            {hasSelection && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selectedEventIds.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filter by Event</span>
            {hasSelection && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearSelection}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                !hasSelection && "bg-primary/10"
              )}
              onClick={handleSelectAll}
            >
              <Checkbox
                checked={!hasSelection || selectedEventIds.length === events.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedEventIds.length === events.length ? 'Deselect All' : 'All Events'}
              </span>
            </div>
            <div className="h-px bg-border my-2" />
            {events.map((event) => {
              const isSelected = selectedEventIds.includes(event.id);
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                    isSelected && "bg-primary/10"
                  )}
                  onClick={() => handleToggleEvent(event.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleEvent(event.id)}
                  />
                  <span className="text-sm truncate">{event.title}</span>
                </div>
              );
            })}
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No events found
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
