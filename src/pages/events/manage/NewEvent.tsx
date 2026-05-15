import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EventForm } from '@/components/events/EventForm';
import { useEvents } from '@/hooks/useEvents';

export default function NewEvent() {
  const { createEvent, isCreating } = useEvents();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/events/manage">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Event</h1>
          <p className="text-muted-foreground">Add a new event</p>
        </div>
      </div>

      <EventForm onSubmit={createEvent} isSubmitting={isCreating} />
    </div>
  );
}
