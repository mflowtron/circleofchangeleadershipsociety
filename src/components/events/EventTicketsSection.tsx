import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTicketTypes, TicketType } from '@/hooks/useTicketTypes';
import { Skeleton } from '@/components/ui/skeleton';

interface EventTicketsSectionProps {
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

export function EventTicketsSection({ eventId, eventSlug }: EventTicketsSectionProps) {
  const { ticketTypes, isLoading } = useTicketTypes(eventId);

  return (
    <section className="py-12 lg:hidden">
      <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
        <span className="w-1 h-8 bg-primary rounded-full" />
        Tickets
      </h2>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : ticketTypes.length === 0 ? (
        <div className="card-premium p-8 text-center">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Tickets not yet available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ticketTypes.map((ticket) => {
            const available = isTicketAvailable(ticket);
            const remaining =
              ticket.quantity_available !== null
                ? ticket.quantity_available - ticket.quantity_sold
                : null;

            return (
              <div
                key={ticket.id}
                className="card-premium p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{ticket.name}</h3>
                    {ticket.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {ticket.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      {formatPrice(ticket.price_cents)}
                    </div>
                    {remaining !== null && remaining <= 10 && remaining > 0 && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {remaining} left
                      </Badge>
                    )}
                  </div>
                </div>
                {!available && (
                  <Badge variant="outline" className="w-full justify-center py-2">
                    {remaining === 0 ? 'Sold Out' : 'Not Available'}
                  </Badge>
                )}
              </div>
            );
          })}
          
          <Button 
            className="w-full btn-gold-glow py-6 text-lg h-auto mt-6" 
            size="lg" 
            asChild
          >
            <Link to={`/events/${eventSlug}/checkout`}>
              Get Tickets
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
