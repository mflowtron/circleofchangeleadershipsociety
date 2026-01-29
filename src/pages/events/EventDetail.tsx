import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, ArrowLeft, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EventsLayout } from '@/layouts/EventsLayout';
import { useEvent } from '@/hooks/useEvents';
import { useTicketTypes } from '@/hooks/useTicketTypes';
import { AgendaPublicView } from '@/components/events/agenda/AgendaPublicView';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading: isLoadingEvent } = useEvent(slug || '');
  const { ticketTypes, isLoading: isLoadingTickets } = useTicketTypes(event?.id || '');

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const isTicketAvailable = (ticket: typeof ticketTypes[0]) => {
    const now = new Date();
    if (ticket.sales_start_at && new Date(ticket.sales_start_at) > now) return false;
    if (ticket.sales_end_at && new Date(ticket.sales_end_at) < now) return false;
    if (ticket.quantity_available !== null && ticket.quantity_sold >= ticket.quantity_available) return false;
    return true;
  };

  if (isLoadingEvent) {
    return (
      <EventsLayout>
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </EventsLayout>
    );
  }

  if (!event) {
    return (
      <EventsLayout>
        <div className="text-center py-16">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <p className="text-muted-foreground mb-4">
            This event may have been removed or the link is incorrect.
          </p>
          <Button asChild>
            <Link to="/events">Browse Events</Link>
          </Button>
        </div>
      </EventsLayout>
    );
  }

  return (
    <EventsLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link to="/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Events
          </Link>
        </Button>

        {/* Cover Image */}
        {event.cover_image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="text-primary font-medium mb-2">
                {format(new Date(event.starts_at), 'EEEE, MMMM d, yyyy')}
              </div>
              <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
              {event.short_description && (
                <p className="text-lg text-muted-foreground">
                  {event.short_description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span>{format(new Date(event.starts_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>
                  {format(new Date(event.starts_at), 'h:mm a')}
                  {event.ends_at && ` - ${format(new Date(event.ends_at), 'h:mm a')}`}
                </span>
              </div>
              {event.venue_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  <span>{event.venue_name}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            {event.description && (
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <h2 className="text-xl font-semibold mb-4">About this event</h2>
                <div className="whitespace-pre-wrap">{event.description}</div>
              </div>
            )}

            {/* Agenda */}
            <AgendaPublicView eventId={event.id} />

            {/* Location */}
            {event.venue_address && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        {event.venue_name && (
                          <p className="font-medium">{event.venue_name}</p>
                        )}
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {event.venue_address}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar - Tickets */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingTickets ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-16 bg-muted rounded" />
                    <div className="h-16 bg-muted rounded" />
                  </div>
                ) : ticketTypes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Tickets not yet available
                  </p>
                ) : (
                  <>
                    {ticketTypes.map((ticket) => {
                      const available = isTicketAvailable(ticket);
                      const remaining =
                        ticket.quantity_available !== null
                          ? ticket.quantity_available - ticket.quantity_sold
                          : null;

                      return (
                        <div
                          key={ticket.id}
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium">{ticket.name}</h3>
                              {ticket.description && (
                                <p className="text-sm text-muted-foreground">
                                  {ticket.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatPrice(ticket.price_cents)}
                              </div>
                              {remaining !== null && remaining <= 10 && remaining > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {remaining} left
                                </Badge>
                              )}
                            </div>
                          </div>
                          {!available && (
                            <Badge variant="outline" className="w-full justify-center">
                              {remaining === 0 ? 'Sold Out' : 'Not Available'}
                            </Badge>
                          )}
                        </div>
                      );
                    })}

                    <Button className="w-full" size="lg" asChild>
                      <Link to={`/events/${event.slug}/checkout`}>
                        Get Tickets
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EventsLayout>
  );
}
