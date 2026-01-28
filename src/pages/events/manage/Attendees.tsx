import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttendeesTable } from '@/components/events/AttendeesTable';
import { useMultiEventAttendees } from '@/hooks/useAttendees';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { useEvents } from '@/hooks/useEvents';

export default function Attendees() {
  const { selectedEventId, hasSelection } = useEventSelection();
  const { events = [] } = useEvents();
  const { data: attendees = [], isLoading } = useMultiEventAttendees(
    hasSelection ? [selectedEventId!] : null
  );

  // Create event lookup map
  const eventMap = new Map<string, string>(events.map((e) => [e.id, e.title]));

  const selectedEventName = selectedEventId ? eventMap.get(selectedEventId) : null;

  // Get unique ticket types from attendees
  const ticketTypes = Array.from(
    new Map(
      attendees
        .filter((a) => a.ticket_type)
        .map((a) => [a.ticket_type_id, { id: a.ticket_type_id, name: a.ticket_type?.name || '' }])
    ).values()
  );

  const handleExport = () => {
    const csvContent = [
      ['Event', 'Attendee Name', 'Attendee Email', 'Ticket Type', 'Order #', 'Purchaser', 'Status'].join(','),
      ...attendees.map((attendee) => [
        `"${eventMap.get(attendee.order?.event_id || '') || 'Unknown'}"`,
        `"${attendee.attendee_name || ''}"`,
        attendee.attendee_email || '',
        `"${attendee.ticket_type?.name || ''}"`,
        attendee.order?.order_number || '',
        `"${attendee.order?.full_name || ''}"`,
        attendee.attendee_name && attendee.attendee_email ? 'Complete' : 'Incomplete',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendees</h1>
          <p className="text-muted-foreground">
            {hasSelection
              ? `Showing attendees for ${selectedEventName}`
              : 'Showing attendees from all events'}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={attendees.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <AttendeesTable
        attendees={attendees}
        isLoading={isLoading}
        ticketTypes={ticketTypes}
        onExport={handleExport}
        eventMap={eventMap}
        showEventColumn={!hasSelection}
      />
    </div>
  );
}
