import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { EventForm } from '@/components/events/EventForm';
import { useEventById, useEvents } from '@/hooks/useEvents';

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useEventById(id || '');
  const { updateEvent, isUpdating } = useEvents();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="space-y-4">
            <div className="h-64 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <Button asChild>
            <Link to="/events/manage">Back to Events</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/events/manage">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Event</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>

        <EventForm event={event} onSubmit={updateEvent} isSubmitting={isUpdating} />
      </div>
    </AppLayout>
  );
}
