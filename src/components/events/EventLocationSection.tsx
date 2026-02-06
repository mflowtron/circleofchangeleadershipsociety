import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Event {
  venue_name: string | null;
  venue_address: string | null;
}

interface EventLocationSectionProps {
  event: Event;
}

export function EventLocationSection({ event }: EventLocationSectionProps) {
  if (!event.venue_address && !event.venue_name) {
    return null;
  }

  const googleMapsUrl = event.venue_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        event.venue_name ? `${event.venue_name}, ${event.venue_address}` : event.venue_address
      )}`
    : null;

  return (
    <section className="py-12">
      <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
        <span className="w-1 h-8 bg-primary rounded-full" />
        Location
      </h2>
      
      <div className="card-premium p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Map Icon */}
          <div className="flex-shrink-0">
            <div className="p-4 rounded-2xl bg-primary/10">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          {/* Address Details */}
          <div className="flex-1">
            {event.venue_name && (
              <h3 className="text-xl font-semibold mb-2">{event.venue_name}</h3>
            )}
            {event.venue_address && (
              <p className="text-muted-foreground whitespace-pre-wrap mb-4">
                {event.venue_address}
              </p>
            )}
            
            {googleMapsUrl && (
              <Button 
                variant="outline" 
                asChild
                className="hover-lift"
              >
                <a 
                  href={googleMapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Maps
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
