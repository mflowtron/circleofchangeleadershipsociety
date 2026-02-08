import { format, formatDistanceToNow, isAfter, isBefore, isToday } from 'date-fns';
import { Calendar, MapPin, Clock, Bookmark, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAttendee } from '@/contexts/AttendeeContext';
import { useAgendaItems } from '@/hooks/useAgendaItems';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCoverImage } from '@/components/events/EventCoverImage';

export default function EventHome() {
  const { selectedEvent, selectedAttendee, bookmarks } = useAttendee();
  const { agendaItems, isLoading: agendaLoading } = useAgendaItems(selectedEvent?.id);

  if (!selectedEvent) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  const now = new Date();
  const eventStart = new Date(selectedEvent.starts_at);
  const eventEnd = selectedEvent.ends_at ? new Date(selectedEvent.ends_at) : null;
  
  // Calculate event day info
  const hasStarted = isAfter(now, eventStart);
  const hasEnded = eventEnd && isAfter(now, eventEnd);
  
  // Find next upcoming session
  const upcomingSessions = agendaItems
    .filter(item => 
      (item.item_type === 'session' || item.item_type === 'networking') &&
      isAfter(new Date(item.starts_at), now)
    )
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  
  const nextSession = upcomingSessions[0];

  // Calculate event days
  const getEventDayInfo = () => {
    if (!hasStarted) {
      return `Starts ${formatDistanceToNow(eventStart, { addSuffix: true })}`;
    }
    if (hasEnded) {
      return 'Event has ended';
    }
    if (eventEnd) {
      const totalDays = Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = Math.ceil((now.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
      return `Day ${Math.min(currentDay, totalDays)} of ${totalDays}`;
    }
    return isToday(eventStart) ? 'Today' : format(eventStart, 'EEEE');
  };

  return (
    <div className="pb-4">
      {/* Event Cover Image */}
      <EventCoverImage
        src={selectedEvent.cover_image_url}
        alt={selectedEvent.title}
        className="aspect-video w-full object-cover"
      />

      <div className="p-4 space-y-4">
        {/* Event Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <Calendar className="h-4 w-4" />
            {getEventDayInfo()}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {format(eventStart, 'EEEE, MMMM d, yyyy')}
            {eventEnd && !isToday(eventStart) && (
              <> — {format(eventEnd, 'MMMM d, yyyy')}</>
            )}
          </div>
          
          {selectedEvent.venue_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{selectedEvent.venue_name}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/attendee/app/qr">
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <QrCode className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">My QR Code</span>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/attendee/app/bookmarks">
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="relative">
                  <Bookmark className="h-8 w-8 text-primary" />
                  {bookmarks.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {bookmarks.length}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">My Bookmarks</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Next Session */}
        {nextSession && !hasEnded && (
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Coming Up
              </div>
              <h3 className="font-medium">{nextSession.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(nextSession.starts_at), 'h:mm a')}
                {nextSession.location && (
                  <>
                    <span>·</span>
                    <MapPin className="h-3.5 w-3.5" />
                    {nextSession.location}
                  </>
                )}
              </div>
              <Link to="/attendee/app/agenda" className="block mt-3">
                <Button variant="outline" size="sm" className="w-full">
                  View Full Agenda
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Attendee Info */}
        {selectedAttendee && (
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Your Registration
              </div>
              <div className="space-y-1">
                <div className="font-medium">
                  {selectedAttendee.attendee_name || 'Attendee'}
                </div>
                {selectedAttendee.ticket_type_name && (
                  <div className="text-sm text-muted-foreground">
                    {selectedAttendee.ticket_type_name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
