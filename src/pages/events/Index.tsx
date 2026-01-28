import { Calendar, Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { EventsLayout } from '@/layouts/EventsLayout';
import { EventCard } from '@/components/events/EventCard';
import { useEvents } from '@/hooks/useEvents';

export default function EventsIndex() {
  const { publishedEvents, isLoadingPublished } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = publishedEvents.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.short_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <EventsLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Upcoming Events</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover and register for leadership events, workshops, and conferences.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Events Grid */}
        {isLoadingPublished ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No events found</h2>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Check back soon for upcoming events'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                linkTo={`/events/${event.slug}`}
              />
            ))}
          </div>
        )}
      </div>
    </EventsLayout>
  );
}
