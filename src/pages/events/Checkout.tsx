import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EventsLayout } from '@/layouts/EventsLayout';
import { TicketSelector } from '@/components/events/TicketSelector';
import { useEvent } from '@/hooks/useEvents';
import { useTicketTypes } from '@/hooks/useTicketTypes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  const { data: event, isLoading: isLoadingEvent } = useEvent(slug || '');
  const { ticketTypes, isLoading: isLoadingTickets } = useTicketTypes(event?.id || '');

  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [purchaserIsAttending, setPurchaserIsAttending] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from user profile
  useEffect(() => {
    if (user?.email) {
      setBuyerEmail(user.email);
    }
    if (profile?.full_name) {
      setBuyerName(profile.full_name);
    }
  }, [user, profile]);

  // Show cancelled message
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      toast.error('Payment cancelled', {
        description: 'Your order was not completed. You can try again.',
      });
    }
  }, [searchParams]);

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const totalAmount = Object.entries(selectedTickets).reduce((sum, [ticketId, qty]) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    return sum + (ticket ? ticket.price_cents * qty : 0);
  }, 0);

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalTickets === 0) {
      setError('Please select at least one ticket');
      return;
    }

    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError('Please fill in your name and email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const tickets = Object.entries(selectedTickets)
        .filter(([_, qty]) => qty > 0)
        .map(([ticket_type_id, quantity]) => ({
          ticket_type_id,
          quantity,
        }));

      const { data, error: fnError } = await supabase.functions.invoke('create-event-checkout', {
        body: {
          event_id: event!.id,
          tickets,
          buyer_email: buyerEmail.trim(),
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim() || undefined,
          purchaser_is_attending: purchaserIsAttending,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      // Handle free orders
      if (data.redirect_url) {
        navigate(data.redirect_url.replace(window.location.origin, ''));
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsSubmitting(false);
    }
  };

  if (isLoadingEvent || isLoadingTickets) {
    return (
      <EventsLayout>
        <div className="max-w-2xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </EventsLayout>
    );
  }

  if (!event) {
    return (
      <EventsLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <Button asChild>
            <Link to="/events">Browse Events</Link>
          </Button>
        </div>
      </EventsLayout>
    );
  }

  return (
    <EventsLayout>
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link to={`/events/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-6">{event.title}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Ticket Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {ticketTypes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tickets available
                </p>
              ) : (
                <TicketSelector
                  ticketTypes={ticketTypes}
                  selectedTickets={selectedTickets}
                  onSelectionChange={setSelectedTickets}
                />
              )}
            </CardContent>
          </Card>

          {/* Buyer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buyerName">Full Name *</Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buyerEmail">Email *</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Your tickets will be sent to this email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buyerPhone">Phone (Optional)</Label>
                <Input
                  id="buyerPhone"
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label>Will you be attending this event?</Label>
                <RadioGroup
                  value={purchaserIsAttending === null ? '' : purchaserIsAttending ? 'yes' : 'no'}
                  onValueChange={(value) => setPurchaserIsAttending(value === 'yes')}
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="attending-yes" />
                    <Label htmlFor="attending-yes" className="font-normal cursor-pointer">
                      Yes, I will attend
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="attending-no" />
                    <Label htmlFor="attending-no" className="font-normal cursor-pointer">
                      No, I'm registering others only
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {purchaserIsAttending === true 
                    ? "Great! We'll pre-fill your registration information."
                    : purchaserIsAttending === false
                      ? "You can still add yourself later if plans change."
                      : "This helps us track attendance correctly."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary & Submit */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tickets</span>
                  <span>{totalTickets}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || totalTickets === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : totalAmount === 0 ? (
                  'Complete Registration'
                ) : (
                  `Pay ${formatPrice(totalAmount)}`
                )}
              </Button>

              {totalAmount > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You'll be redirected to Stripe for secure payment
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </EventsLayout>
  );
}
