import { useAttendee } from '@/contexts/AttendeeContext';
import { QRCodeDisplay } from '@/components/attendee/QRCodeDisplay';
import { Skeleton } from '@/components/ui/skeleton';

export default function QRCode() {
  const { selectedAttendee, loading } = useAttendee();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <Skeleton className="h-72 w-72 rounded-lg" />
        <Skeleton className="h-6 w-40 mt-4" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>
    );
  }

  if (!selectedAttendee) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="text-6xl mb-4">🎫</div>
        <h2 className="text-xl font-semibold mb-2">No Registration Found</h2>
        <p className="text-muted-foreground max-w-xs">
          We couldn't find your registration for this event.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[60vh]">
      <QRCodeDisplay
        attendeeId={selectedAttendee.id}
        attendeeName={selectedAttendee.attendee_name}
        ticketType={selectedAttendee.ticket_type_name}
      />
    </div>
  );
}
