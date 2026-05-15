import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Wifi, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RegistrationLayout } from '@/components/registration/RegistrationLayout';
import { useEvent } from '@/hooks/useEvents';
import { useTicketTypes } from '@/hooks/useTicketTypes';
import { CircleLoader } from '@/components/ui/circle-loader';
import { useState } from 'react';

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading: isLoadingEvent } = useEvent(slug || '');
  const { ticketTypes, isLoading: isLoadingTickets } = useTicketTypes(event?.id || '');
  const [selectedType, setSelectedType] = useState<'in_person' | 'virtual' | null>(null);

  const hasInPerson = ticketTypes.some((t) => !t.is_virtual);
  const hasVirtual = ticketTypes.some((t) => t.is_virtual);

  // Get minimum price for each type
  const getMinPrice = (isVirtual: boolean) => {
    const matching = ticketTypes.filter((t) => t.is_virtual === isVirtual);
    if (matching.length === 0) return null;
    const available = matching.filter((t) => {
      const now = new Date();
      if (t.sales_start_at && new Date(t.sales_start_at) > now) return false;
      if (t.sales_end_at && new Date(t.sales_end_at) < now) return false;
      if (t.quantity_available !== null && t.quantity_sold >= t.quantity_available) return false;
      return true;
    });
    if (available.length === 0) return null;
    return Math.min(...available.map((t) => t.price_cents));
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  if (isLoadingEvent || isLoadingTickets) {
    return (
      <RegistrationLayout>
        <div className="flex items-center justify-center py-32">
          <CircleLoader size="md" />
        </div>
      </RegistrationLayout>
    );
  }

  if (!event) {
    return (
      <RegistrationLayout>
        <div className="max-w-xl mx-auto text-center py-32 px-4">
          <h1 className="text-2xl font-serif font-bold mb-4" style={{ color: '#2D0A18' }}>
            Event Not Found
          </h1>
          <p className="mb-6" style={{ color: '#8B6F5E' }}>
            This event may no longer be available.
          </p>
          <Button asChild>
            <Link to="/events">Browse Events</Link>
          </Button>
        </div>
      </RegistrationLayout>
    );
  }

  const inPersonPrice = getMinPrice(false);
  const virtualPrice = getMinPrice(true);

  return (
    <RegistrationLayout>
      {/* Hero Section */}
      <div
        className="relative py-20 px-4"
        style={{
          background: 'linear-gradient(135deg, #6B1D3A 0%, #4A1228 40%, #2D0A18 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: '#DFA51F' }}>
            Circle of Change Leadership Society
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
            {event.title}
          </h1>
          <p className="text-lg text-white/80 font-serif mb-8">
            Empowering the Next Generation of Leaders
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/90 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: '#DFA51F' }} />
              {format(new Date(event.starts_at), 'MMMM d')}
              {event.ends_at && `–${format(new Date(event.ends_at), 'd, yyyy')}`}
            </div>
            {event.venue_name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: '#DFA51F' }} />
                {event.venue_name}
                {event.venue_address && ` — ${event.venue_address}`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-10">
        {/* About Card */}
        {event.description && (
          <Card className="mb-8 border-0 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <CardContent className="p-8">
              <h2 className="text-xl font-serif font-bold mb-4" style={{ color: '#2D0A18' }}>
                About the Conference
              </h2>
              <p className="leading-relaxed" style={{ color: '#4A3728' }}>
                {event.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ticket Type Selection */}
        <h2 className="text-xl font-serif font-bold mb-4 text-center" style={{ color: '#2D0A18' }}>
          Choose Your Experience
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* In-Person Card */}
          {hasInPerson && (
            <button
              onClick={() => setSelectedType('in_person')}
              className="text-left p-6 rounded-2xl border-2 transition-all"
              style={{
                borderColor: selectedType === 'in_person' ? '#DFA51F' : '#e8ddd0',
                backgroundColor: selectedType === 'in_person' ? '#FFFDF8' : '#FFFFFF',
                boxShadow: selectedType === 'in_person' ? '0 0 0 1px #DFA51F' : 'none',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#6B1D3A' }}
                >
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-serif font-bold" style={{ color: '#2D0A18' }}>
                  In-Person
                </h3>
              </div>
              <p className="text-sm mb-3" style={{ color: '#8B6F5E' }}>
                Full conference access with networking, workshops, and all in-person sessions.
              </p>
              {inPersonPrice !== null && (
                <p className="text-lg font-bold" style={{ color: '#6B1D3A' }}>
                  Starting at {formatPrice(inPersonPrice)}
                </p>
              )}
            </button>
          )}

          {/* Virtual Card */}
          {hasVirtual && (
            <button
              onClick={() => setSelectedType('virtual')}
              className="text-left p-6 rounded-2xl border-2 transition-all"
              style={{
                borderColor: selectedType === 'virtual' ? '#DFA51F' : '#e8ddd0',
                backgroundColor: selectedType === 'virtual' ? '#FFFDF8' : '#FFFFFF',
                boxShadow: selectedType === 'virtual' ? '0 0 0 1px #DFA51F' : 'none',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#6B1D3A' }}
                >
                  <Wifi className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-serif font-bold" style={{ color: '#2D0A18' }}>
                  Virtual
                </h3>
              </div>
              <p className="text-sm mb-3" style={{ color: '#8B6F5E' }}>
                Stream all keynotes and select sessions live from anywhere. On-demand access included.
              </p>
              {virtualPrice !== null && (
                <p className="text-lg font-bold" style={{ color: '#6B1D3A' }}>
                  Starting at {formatPrice(virtualPrice)}
                </p>
              )}
            </button>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <Button
            asChild
            size="lg"
            disabled={!selectedType}
            className="px-8 py-6 text-base font-semibold rounded-xl disabled:opacity-50"
            style={{
              backgroundColor: selectedType ? '#DFA51F' : undefined,
              color: selectedType ? '#2D0A18' : undefined,
            }}
          >
            <Link
              to={selectedType ? `/register/${slug}/checkout?type=${selectedType}` : '#'}
              onClick={(e) => !selectedType && e.preventDefault()}
            >
              Continue to Registration
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
          <p className="mt-4 text-sm" style={{ color: '#8B6F5E' }}>
            <Link
              to="/register/verify"
              className="underline underline-offset-2 hover:opacity-80"
              style={{ color: '#6B1D3A' }}
            >
              Already registered? Find your order
            </Link>
          </p>
        </div>
      </div>
    </RegistrationLayout>
  );
}
