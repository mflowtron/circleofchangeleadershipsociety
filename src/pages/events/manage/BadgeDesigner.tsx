import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgeDesigner as BadgeDesignerComponent } from '@/components/events/badges/BadgeDesigner';
import { useEvents } from '@/hooks/useEvents';
import { format } from 'date-fns';

export default function BadgeDesignerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { events = [] } = useEvents();
  
  const event = events.find((e) => e.id === eventId);

  if (!eventId) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No event selected.</p>
        <Button asChild variant="outline">
          <Link to="/events/manage">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/events/manage">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Badge Designer</h1>
          <p className="text-muted-foreground">
            {event?.title || 'Design badges for your event'}
          </p>
        </div>
      </div>

      <BadgeDesignerComponent
        eventId={eventId}
        eventName={event?.title}
        eventDate={event?.starts_at ? format(new Date(event.starts_at), 'MMMM d, yyyy') : undefined}
      />
    </div>
  );
}
