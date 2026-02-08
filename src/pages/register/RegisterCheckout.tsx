import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RegistrationLayout } from '@/components/registration/RegistrationLayout';
import { useEvent } from '@/hooks/useEvents';
import { useTicketTypes, type TicketType } from '@/hooks/useTicketTypes';
import { useRegistration } from '@/hooks/useRegistration';
import { PRICING } from '@/types/registration';
import { toast } from 'sonner';

export default function RegisterCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ticketFilter = searchParams.get('type'); // 'in_person' or 'virtual'

  const { data: event, isLoading: isLoadingEvent } = useEvent(slug || '');
  const { ticketTypes, isLoading: isLoadingTickets } = useTicketTypes(event?.id || '');
  const { createCheckout } = useRegistration();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [purchaserIsAttending, setPurchaserIsAttending] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Show cancelled message
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      toast.error('Payment cancelled', {
        description: 'Your order was not completed. You can try again.',
      });
    }
  }, [searchParams]);

  // Filter ticket types by in_person/virtual
  const filteredTickets = useMemo(() => {
    if (!ticketFilter) return ticketTypes;
    const isVirtual = ticketFilter === 'virtual';
    return ticketTypes.filter((t) => t.is_virtual === isVirtual);
  }, [ticketTypes, ticketFilter]);

  // Auto-select first available ticket
  useEffect(() => {
    if (filteredTickets.length > 0 && !selectedTicketId) {
      const available = filteredTickets.find((t) => isTicketAvailable(t));
      if (available) setSelectedTicketId(available.id);
    }
  }, [filteredTickets, selectedTicketId]);

  const selectedTicket = filteredTickets.find((t) => t.id === selectedTicketId);

  function isTicketAvailable(ticket: TicketType) {
    const now = new Date();
    if (ticket.sales_start_at && new Date(ticket.sales_start_at) > now) return false;
    if (ticket.sales_end_at && new Date(ticket.sales_end_at) < now) return false;
    if (ticket.quantity_available !== null && ticket.quantity_sold >= ticket.quantity_available) return false;
    return true;
  }

  const maxQuantity = selectedTicket
    ? selectedTicket.quantity_available !== null
      ? Math.min(selectedTicket.quantity_available - selectedTicket.quantity_sold, selectedTicket.max_per_order)
      : selectedTicket.max_per_order
    : 50;

  const subtotalCents = selectedTicket ? selectedTicket.price_cents * quantity : 0;
  const feesCents = PRICING.SERVICE_FEE_CENTS * quantity;
  const totalCents = subtotalCents + feesCents;

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const canSubmit =
    selectedTicketId && quantity > 0 && buyerName.trim() && buyerEmail.trim() && organization.trim();

  const handleSubmit = async () => {
    setError(null);

    if (!canSubmit || !event || !selectedTicket) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Determine pricing tier from the ticket name
    const pricingTier = selectedTicket.name.toLowerCase().includes('early')
      ? 'early_bird'
      : 'standard';

    try {
      const result = await createCheckout.mutateAsync({
        event_id: event.id,
        tickets: [{ ticket_type_id: selectedTicketId, quantity }],
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
        buyer_phone: buyerPhone.trim() || undefined,
        organization_name: organization.trim(),
        referral_source: referralSource.trim() || undefined,
        purchaser_is_attending: purchaserIsAttending ?? undefined,
        pricing_tier: pricingTier,
      });

      // Free order redirect
      if (result.redirect_url) {
        navigate(result.redirect_url.replace(window.location.origin, ''));
        return;
      }

      // Stripe redirect
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  };

  if (isLoadingEvent || isLoadingTickets) {
    return (
      <RegistrationLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse space-y-6">
          <div className="h-8 bg-[#e8ddd0] rounded w-1/3" />
          <div className="h-64 bg-[#e8ddd0] rounded" />
        </div>
      </RegistrationLayout>
    );
  }

  if (!event) {
    return (
      <RegistrationLayout>
        <div className="text-center py-16 px-4">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: '#2D0A18' }}>
            Event not found
          </h1>
          <Button asChild>
            <Link to="/events">Browse Events</Link>
          </Button>
        </div>
      </RegistrationLayout>
    );
  }

  return (
    <RegistrationLayout>
      <div className="max-w-[720px] mx-auto px-4 py-8">
        {/* Back Link */}
        <Button variant="ghost" asChild className="mb-4 -ml-2 text-[#6B1D3A]">
          <Link to={`/register/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Link>
        </Button>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium" style={{ color: '#8B6F5E' }}>
              Step 1 of 2
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ backgroundColor: '#e8ddd0' }}>
            <div className="h-full w-1/2 rounded-full" style={{ backgroundColor: '#DFA51F' }} />
          </div>
        </div>

        <h1 className="text-2xl font-serif font-bold mb-1" style={{ color: '#2D0A18' }}>
          Register
        </h1>
        <p className="text-sm mb-6" style={{ color: '#8B6F5E' }}>
          {event.title}
        </p>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Ticket Selection */}
          <Card className="border" style={{ borderColor: '#e8ddd0' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base" style={{ color: '#2D0A18' }}>
                Select Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredTickets.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#8B6F5E' }}>
                  No tickets available for this type
                </p>
              ) : (
                <RadioGroup
                  value={selectedTicketId || ''}
                  onValueChange={setSelectedTicketId}
                >
                  {filteredTickets.map((ticket) => {
                    const available = isTicketAvailable(ticket);
                    return (
                      <label
                        key={ticket.id}
                        className="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all"
                        style={{
                          borderColor: selectedTicketId === ticket.id ? '#DFA51F' : '#e8ddd0',
                          backgroundColor: selectedTicketId === ticket.id ? '#FFFDF8' : '#FFFFFF',
                          opacity: available ? 1 : 0.5,
                          pointerEvents: available ? 'auto' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={ticket.id} disabled={!available} />
                          <div>
                            <p className="font-medium text-sm" style={{ color: '#2D0A18' }}>
                              {ticket.name}
                            </p>
                            {ticket.description && (
                              <p className="text-xs" style={{ color: '#8B6F5E' }}>
                                {ticket.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold" style={{ color: '#6B1D3A' }}>
                          {ticket.price_cents === 0 ? 'Free' : formatPrice(ticket.price_cents)}
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              )}

              {/* Quantity Stepper */}
              {selectedTicket && (
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #e8ddd0' }}>
                  <Label className="text-sm" style={{ color: '#2D0A18' }}>Quantity</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center font-bold text-lg" style={{ color: '#2D0A18' }}>
                      {quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                      disabled={quantity >= maxQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Buyer Information */}
          <Card className="border" style={{ borderColor: '#e8ddd0' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base" style={{ color: '#2D0A18' }}>
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="buyerName" style={{ color: '#4A3728' }}>
                  Full Name *
                </Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Jane Smith"
                  disabled={createCheckout.isPending}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buyerEmail" style={{ color: '#4A3728' }}>
                  Email *
                </Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="jane@university.edu"
                  disabled={createCheckout.isPending}
                  className="bg-white"
                />
                <p className="text-xs" style={{ color: '#8B6F5E' }}>
                  Your receipt and order access will be sent to this email
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="organization" style={{ color: '#4A3728' }}>
                  Organization / University *
                </Label>
                <Input
                  id="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="University of Georgia"
                  disabled={createCheckout.isPending}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buyerPhone" style={{ color: '#4A3728' }}>
                  Phone (Optional)
                </Label>
                <Input
                  id="buyerPhone"
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  disabled={createCheckout.isPending}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referral" style={{ color: '#4A3728' }}>
                  How did you hear about us? (Optional)
                </Label>
                <Input
                  id="referral"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  placeholder="Colleague, social media, email..."
                  disabled={createCheckout.isPending}
                  className="bg-white"
                />
              </div>

              <div className="space-y-3 pt-2" style={{ borderTop: '1px solid #e8ddd0' }}>
                <Label style={{ color: '#4A3728' }}>Will you be attending this event?</Label>
                <RadioGroup
                  value={purchaserIsAttending === null ? '' : purchaserIsAttending ? 'yes' : 'no'}
                  onValueChange={(val) => setPurchaserIsAttending(val === 'yes')}
                  disabled={createCheckout.isPending}
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
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="border" style={{ borderColor: '#e8ddd0' }}>
            <CardContent className="pt-6">
              <h3 className="font-medium text-sm mb-3" style={{ color: '#2D0A18' }}>
                Order Summary
              </h3>
              <div className="space-y-2 text-sm">
                {selectedTicket && (
                  <div className="flex justify-between">
                    <span style={{ color: '#8B6F5E' }}>
                      {selectedTicket.name} &times; {quantity}
                    </span>
                    <span style={{ color: '#2D0A18' }}>{formatPrice(subtotalCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: '#8B6F5E' }}>
                    Service fee ({formatPrice(PRICING.SERVICE_FEE_CENTS)}/ticket &times; {quantity})
                  </span>
                  <span style={{ color: '#2D0A18' }}>{formatPrice(feesCents)}</span>
                </div>
                <div
                  className="flex justify-between pt-2 font-bold text-base"
                  style={{ borderTop: '1px solid #e8ddd0' }}
                >
                  <span style={{ color: '#2D0A18' }}>Total</span>
                  <span style={{ color: '#6B1D3A' }}>{formatPrice(totalCents)}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full mt-4 py-6 text-base font-semibold rounded-xl"
                size="lg"
                disabled={!canSubmit || createCheckout.isPending}
                style={{
                  backgroundColor: canSubmit && !createCheckout.isPending ? '#DFA51F' : undefined,
                  color: canSubmit && !createCheckout.isPending ? '#2D0A18' : undefined,
                }}
              >
                {createCheckout.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Proceed to Payment — ${formatPrice(totalCents)}`
                )}
              </Button>

              <p className="text-xs text-center mt-3" style={{ color: '#8B6F5E' }}>
                You'll be redirected to Stripe's secure checkout. Attendee names can be added after purchase.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </RegistrationLayout>
  );
}
