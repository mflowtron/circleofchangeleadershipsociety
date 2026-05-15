import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, Loader2, Calendar, MapPin, Ticket, Mail, XCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EventsLayout } from '@/layouts/EventsLayout';
import { useEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price_cents: number;
  ticket_type: {
    name: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  email: string;
  full_name: string;
  status: string;
  subtotal_cents: number;
  fees_cents: number;
  total_cents: number;
  created_at: string;
  completed_at: string | null;
  order_items: OrderItem[];
  edit_token?: string;
}

export default function CheckoutSuccess() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const sessionId = searchParams.get('session_id');

  const { data: event, isLoading: isLoadingEvent } = useEvent(slug || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) {
        setError('Order not found');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-event-payment', {
          body: {
            order_id: orderId,
            session_id: sessionId,
          },
        });

        if (fnError) throw fnError;
        if (data.error) throw new Error(data.error);

        if (data.success && data.order) {
          setOrder(data.order);
        } else if (data.order) {
          // Payment not yet completed, might need to wait
          setOrder(data.order);
        } else {
          throw new Error('Unable to verify order');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify order');
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [orderId, sessionId]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getTotalTickets = () => {
    if (!order) return 0;
    return order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (isLoading || isLoadingEvent) {
    return (
      <EventsLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <h1 className="text-xl font-semibold">Verifying your order...</h1>
          <p className="text-muted-foreground">Please wait while we confirm your payment</p>
        </div>
      </EventsLayout>
    );
  }

  if (error || !order) {
    return (
      <EventsLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'Unable to load your order details'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/events">Browse Events</Link>
            </Button>
            {slug && (
              <Button asChild>
                <Link to={`/events/${slug}`}>Back to Event</Link>
              </Button>
            )}
          </div>
        </div>
      </EventsLayout>
    );
  }

  const isCompleted = order.status === 'completed';

  return (
    <EventsLayout>
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          {isCompleted ? (
            <>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-3xl font-bold mb-2">You're all set!</h1>
              <p className="text-muted-foreground">
                Your tickets have been confirmed. A confirmation email has been sent to{' '}
                <span className="font-medium text-foreground">{order.email}</span>
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
              <h1 className="text-3xl font-bold mb-2">Processing your order...</h1>
              <p className="text-muted-foreground">
                Your payment is being processed. Please don't close this page.
              </p>
            </>
          )}
        </div>

        {/* Order Details */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-mono font-medium">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">
                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Event Info */}
            {event && (
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.starts_at), 'EEE, MMM d, yyyy · h:mm a')}
                  </div>
                  {event.venue_name && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {event.venue_name}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Tickets */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Ticket className="h-4 w-4" />
                {getTotalTickets()} {getTotalTickets() === 1 ? 'Ticket' : 'Tickets'}
              </div>
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.ticket_type?.name || 'Ticket'} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.unit_price_cents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Total */}
            <div className="flex justify-between text-lg font-bold">
              <span>Total Paid</span>
              <span>{formatPrice(order.total_cents)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Email Notice */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent your tickets and order confirmation to{' '}
                  <span className="font-medium text-foreground">{order.email}</span>.
                  If you don't see it, check your spam folder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Attendee Details CTA */}
        {isCompleted && getTotalTickets() > 0 && (
          <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Add Attendee Details</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Purchased tickets for others? Add their names and emails so they can receive 
                    event updates and registration forms.
                  </p>
                  <Button asChild>
                    <Link to={`/events/${slug}/order/${order.id}/attendees${order.edit_token ? `?token=${order.edit_token}` : ''}`}>
                      Add Attendee Information
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1">
            <Link to="/events">Browse More Events</Link>
          </Button>
          {event && (
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/events/${event.slug}`}>View Event Details</Link>
            </Button>
          )}
        </div>
      </div>
    </EventsLayout>
  );
}
