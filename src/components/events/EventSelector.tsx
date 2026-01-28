import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEvents } from '@/hooks/useEvents';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function EventSelector() {
  const { events = [], isLoading } = useEvents();
  const { selectedEventId, setSelectedEventId, clearSelection, hasSelection } = useEventSelection();
  const [open, setOpen] = useState(false);

  const handleSelectEvent = (eventId: string | null) => {
    setSelectedEventId(eventId);
    setOpen(false);
  };

  const getDisplayText = () => {
    if (!hasSelection) return 'All Events';
    const event = events.find((e) => e.id === selectedEventId);
    return event?.title || 'Unknown Event';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between gap-2 h-auto min-h-10 py-2"
          disabled={isLoading}
        >
          <span className="truncate text-left flex-1">{getDisplayText()}</span>
          <div className="flex items-center gap-1">
            {hasSelection && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <span className="text-sm font-medium">Select Event</span>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            <div
              className={cn(
                "flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                !hasSelection && "bg-primary/10"
              )}
              onClick={() => handleSelectEvent(null)}
            >
              <span className="text-sm font-medium">All Events</span>
              {!hasSelection && <Check className="h-4 w-4 text-primary" />}
            </div>
            <div className="h-px bg-border my-2" />
            {events.map((event) => {
              const isSelected = selectedEventId === event.id;
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                    isSelected && "bg-primary/10"
                  )}
                  onClick={() => handleSelectEvent(event.id)}
                >
                  <span className="text-sm truncate">{event.title}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
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
