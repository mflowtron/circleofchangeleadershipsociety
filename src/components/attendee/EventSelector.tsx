import { ChevronDown } from 'lucide-react';
import { useAttendee } from '@/contexts/AttendeeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export function EventSelector() {
  const { events, selectedEvent, setSelectedEventId } = useAttendee();

  if (events.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
          <span className="truncate">
            {selectedEvent?.title || 'Select Event'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {events.map(event => (
          <DropdownMenuItem
            key={event.id}
            onClick={() => setSelectedEventId(event.id)}
            className="flex flex-col items-start gap-1 py-3"
          >
            <span className="font-medium">{event.title}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(event.starts_at), 'MMM d, yyyy')}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
