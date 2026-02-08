import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { EventCoverImage } from '@/components/events/EventCoverImage';
import type { Event } from '@/hooks/useEvents';

interface EventCardProps {
  event: Event;
  linkTo?: string;
}

export function EventCard({ event, linkTo }: EventCardProps) {
  const content = (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <AspectRatio ratio={16 / 9}>
        <EventCoverImage
          src={event.cover_image_url}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </AspectRatio>
      <CardContent className="p-4">
        <div className="text-sm text-primary font-medium mb-1">
          {format(new Date(event.starts_at), 'EEE, MMM d · h:mm a')}
        </div>
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        {event.short_description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
            {event.short_description}
          </p>
        )}
        {event.venue_name && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{event.venue_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
}
