import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTicketTypes, TicketType } from '@/hooks/useTicketTypes';
import { Skeleton } from '@/components/ui/skeleton';

interface EventTicketsSidebarProps {
  eventId: string;
  eventSlug: string;
}

const formatPrice = (cents: number) => {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const isTicketAvailable = (ticket: TicketType) => {
  const now = new Date();
  if (ticket.sales_start_at && new Date(ticket.sales_start_at) > now) return false;
  if (ticket.sales_end_at && new Date(ticket.sales_end_at) < now) return false;
  if (ticket.quantity_available !== null && ticket.quantity_sold >= ticket.quantity_available) return false;
  return true;
};

export function EventTicketsSidebar({ eventId, eventSlug }: EventTicketsSidebarProps) {
  const { ticketTypes, isLoading } = useTicketTypes(eventId);

  return (
    <Card className="sticky top-24 card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
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
                  className="p-4 rounded-lg border bg-background/50"
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
                      <div className="font-semibold text-primary">
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

            <Button className="w-full btn-gold-glow" size="lg" asChild>
              <Link to={`/events/${eventSlug}/checkout`}>
                Get Tickets
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
