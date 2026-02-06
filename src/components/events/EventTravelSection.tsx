import { Plane, MapPin, Phone, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEventHotels } from '@/hooks/useEventHotels';
import { Skeleton } from '@/components/ui/skeleton';

interface Event {
  id: string;
  travel_info?: string | null;
  travel_contact_email?: string | null;
}

interface EventTravelSectionProps {
  event: Event;
}

function HotelCard({ hotel }: { hotel: {
  name: string;
  address: string;
  phone: string | null;
  description: string | null;
  image_url: string | null;
  rate_description: string | null;
  booking_url: string | null;
}}) {
  return (
    <Card className="overflow-hidden hover-lift">
      {/* Hotel Image */}
      {hotel.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={hotel.image_url}
            alt={hotel.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      
      <CardContent className="p-6 space-y-4">
        {/* Hotel Name */}
        <h3 className="text-xl font-semibold">{hotel.name}</h3>
        
        {/* Address */}
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
          <span className="text-sm">{hotel.address}</span>
        </div>
        
        {/* Phone */}
        {hotel.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <a 
              href={`tel:${hotel.phone}`} 
              className="text-sm hover:text-primary transition-colors"
            >
              {hotel.phone}
            </a>
          </div>
        )}
        
        {/* Description */}
        {hotel.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hotel.description}
          </p>
        )}
        
        {/* Rate */}
        {hotel.rate_description && (
          <div className="pt-2">
            <span className="text-lg font-bold text-primary">
              {hotel.rate_description}
            </span>
          </div>
        )}
        
        {/* Booking Button */}
        {hotel.booking_url && (
          <Button asChild className="w-full mt-4">
            <a 
              href={hotel.booking_url} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Reserve Now
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EventTravelSection({ event }: EventTravelSectionProps) {
  const { data: hotels, isLoading } = useEventHotels(event.id);

  // Don't render if no travel info and no hotels
  if (!isLoading && !event.travel_info && (!hotels || hotels.length === 0)) {
    return null;
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
        <span className="w-1 h-8 bg-primary rounded-full" />
        Hotel & Travel Information
      </h2>
      
      {/* Intro Text */}
      {event.travel_info && (
        <div className="card-premium p-6 lg:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-primary/10">
                <Plane className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {event.travel_info}
            </p>
          </div>
        </div>
      )}
      
      {/* Hotels Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : hotels && hotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      ) : null}
      
      {/* Contact Email */}
      {event.travel_contact_email && (
        <div className="mt-8 p-6 bg-muted/50 rounded-lg text-center">
          <p className="text-muted-foreground">
            Questions about travel arrangements?{' '}
            <a 
              href={`mailto:${event.travel_contact_email}`}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              {event.travel_contact_email}
            </a>
          </p>
        </div>
      )}
    </section>
  );
}
