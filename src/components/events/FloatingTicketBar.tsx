import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTicketTypes } from '@/hooks/useTicketTypes';

interface FloatingTicketBarProps {
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

export function FloatingTicketBar({ eventId, eventSlug }: FloatingTicketBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { ticketTypes } = useTicketTypes(eventId);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero (roughly 50vh)
      const threshold = window.innerHeight * 0.5;
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get the lowest price
  const lowestPrice = ticketTypes.length > 0
    ? Math.min(...ticketTypes.map(t => t.price_cents))
    : null;

  // Don't render on desktop
  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div 
        className="glass border-t border-border/50 p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Starting from</p>
              <p className="font-semibold text-lg">
                {lowestPrice !== null ? formatPrice(lowestPrice) : 'TBD'}
              </p>
            </div>
          </div>
          
          <Button 
            asChild 
            className="btn-gold-glow px-6"
          >
            <Link to={`/events/${eventSlug}/checkout`}>
              Get Tickets
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
