import { format } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  cover_image_url: string | null;
  starts_at: string;
  venue_name: string | null;
}

interface EventHeroProps {
  event: Event;
}

export function EventHero({ event }: EventHeroProps) {
  return (
    <section className="relative w-full min-h-[70vh] lg:min-h-[80vh] flex items-end overflow-hidden">
      {/* Background Image */}
      {event.cover_image_url ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${event.cover_image_url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/80" />
      )}
      
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to top,
            hsl(30 12% 8% / 0.95) 0%,
            hsl(30 12% 8% / 0.7) 40%,
            hsl(30 12% 8% / 0.3) 100%
          )`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 w-full px-4 pb-12 lg:pb-20 pt-32">
        <div className="max-w-4xl mx-auto text-center stagger-children">
          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary mb-6">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              {format(new Date(event.starts_at), 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            {event.title}
          </h1>
          
          {/* Tagline */}
          {event.short_description && (
            <p className="text-lg lg:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              {event.short_description}
            </p>
          )}
          
          {/* Event Meta */}
          <div className="flex flex-wrap justify-center gap-6 text-white/70 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>{format(new Date(event.starts_at), 'MMM d, yyyy • h:mm a')}</span>
            </div>
            {event.venue_name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>{event.venue_name}</span>
              </div>
            )}
          </div>
          
          {/* CTA */}
          <Button 
            asChild 
            size="lg" 
            className="btn-gold-glow text-lg px-8 py-6 h-auto"
          >
            <Link to={`/events/${event.slug}/checkout`}>
              Get Tickets
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Bottom fade for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
