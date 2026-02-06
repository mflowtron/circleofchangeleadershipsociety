import { format } from 'date-fns';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface Event {
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
}

interface EventQuickInfoProps {
  event: Event;
}

export function EventQuickInfo({ event }: EventQuickInfoProps) {
  return (
    <section className="py-8 border-b border-border/50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
          {/* Date */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(new Date(event.starts_at), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          
          {/* Time */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">
                {format(new Date(event.starts_at), 'h:mm a')}
                {event.ends_at && ` - ${format(new Date(event.ends_at), 'h:mm a')}`}
              </p>
            </div>
          </div>
          
          {/* Location */}
          {event.venue_name && (
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{event.venue_name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
