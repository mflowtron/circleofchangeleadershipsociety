import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttendeesTable } from '@/components/events/AttendeesTable';
import { BadgeGeneratorDialog } from '@/components/events/badges/BadgeGeneratorDialog';
import { useMultiEventAttendees } from '@/hooks/useAttendees';
import { useEventSelection } from '@/contexts/EventSelectionContext';
import { useEvents } from '@/hooks/useEvents';
import { format } from 'date-fns';

export default function Attendees() {
  const { selectedEventId, hasSelection } = useEventSelection();
  const { events = [] } = useEvents();
  const { data: attendees = [], isLoading } = useMultiEventAttendees(
    hasSelection ? [selectedEventId!] : null
  );
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);

  // Create event lookup map
  const eventMap = new Map<string, string>(events.map((e) => [e.id, e.title]));

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const selectedEventName = selectedEvent?.title || null;

  // Get unique ticket types from attendees
  const ticketTypes = Array.from(
    new Map(
      attendees
        .filter((a) => a.ticket_type)
        .map((a) => [a.order_item_id || '', { id: a.order_item_id || '', name: a.ticket_type?.name || '' }])
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Attendees</h1>
          <p className="text-muted-foreground truncate">
            {hasSelection
              ? `Showing attendees for ${selectedEventName}`
              : 'Showing attendees from all events'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasSelection && selectedEvent && (
            <Button variant="outline" onClick={() => setBadgeDialogOpen(true)} className="flex-1 sm:flex-none">
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print Badges</span>
              <span className="sm:hidden">Badges</span>
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={attendees.length === 0} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      <AttendeesTable
        attendees={attendees}
        isLoading={isLoading}
        ticketTypes={ticketTypes}
        onExport={handleExport}
        eventMap={eventMap}
        showEventColumn={!hasSelection}
      />

      {hasSelection && selectedEvent && (
        <BadgeGeneratorDialog
          open={badgeDialogOpen}
          onOpenChange={setBadgeDialogOpen}
          eventId={selectedEventId!}
          eventName={selectedEvent.title}
          eventDate={format(new Date(selectedEvent.starts_at), 'MMMM d, yyyy')}
          attendees={attendees}
          ticketTypes={ticketTypes}
        />
      )}
    </div>
  );
}
