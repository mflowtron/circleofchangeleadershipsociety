import { useParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { AgendaBuilder } from '@/components/events/agenda/AgendaBuilder';
import { useEventSelection } from '@/contexts/EventSelectionContext';

export default function Agenda() {
  const { id } = useParams<{ id: string }>();
  const { selectedEventId } = useEventSelection();
  const eventId = id || selectedEventId;

  if (!eventId) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No event selected</h2>
        <p className="text-muted-foreground">
          Please select an event from the dropdown to manage the agenda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="text-muted-foreground">
          Build your event schedule with sessions, breaks, and more.
        </p>
      </div>

      <AgendaBuilder eventId={eventId} />
    </div>
  );
}
