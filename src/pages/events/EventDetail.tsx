import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventsLayout } from '@/layouts/EventsLayout';
import { useEvent } from '@/hooks/useEvents';
import { AgendaPublicView } from '@/components/events/agenda/AgendaPublicView';
import { EventHero } from '@/components/events/EventHero';
import { EventQuickInfo } from '@/components/events/EventQuickInfo';
import { EventSpeakersSection } from '@/components/events/EventSpeakersSection';
import { EventLocationSection } from '@/components/events/EventLocationSection';
import { EventTravelSection } from '@/components/events/EventTravelSection';
import { EventTicketsSection } from '@/components/events/EventTicketsSection';
import { EventTicketsSidebar } from '@/components/events/EventTicketsSidebar';
import { FloatingTicketBar } from '@/components/events/FloatingTicketBar';
import { Skeleton } from '@/components/ui/skeleton';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading: isLoadingEvent } = useEvent(slug || '');

  if (isLoadingEvent) {
    return (
      <EventsLayout>
        <div className="min-h-screen">
          {/* Hero Skeleton */}
          <div className="relative w-full h-[70vh] bg-muted animate-pulse" />
          
          {/* Content Skeleton */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="hidden lg:block">
                <Skeleton className="h-80 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </EventsLayout>
    );
  }

  if (!event) {
    return (
      <EventsLayout>
        <div className="text-center py-32">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <p className="text-muted-foreground mb-4">
            This event may have been removed or the link is incorrect.
          </p>
          <Button asChild>
            <Link to="/events">Browse Events</Link>
          </Button>
        </div>
      </EventsLayout>
    );
  }

  return (
    <EventsLayout>
      {/* Hero Section - Full Width */}
      <EventHero event={event} />
      
      {/* Quick Info Bar */}
      <EventQuickInfo event={event} />
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Back Link */}
        <Button variant="ghost" asChild className="mb-8 -ml-2">
          <Link to="/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Events
          </Link>
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* About Section */}
            {event.description && (
              <section className="py-12">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <span className="w-1 h-8 bg-primary rounded-full" />
                  About This Event
                </h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </section>
            )}
            
            {/* Speakers Section */}
            <EventSpeakersSection eventId={event.id} />
            
            {/* Schedule Section */}
            <section className="py-12">
              <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
                <span className="w-1 h-8 bg-primary rounded-full" />
                Schedule
              </h2>
              <AgendaPublicView eventId={event.id} />
            </section>
            
            {/* Location Section */}
            <EventLocationSection event={event} />
            
            {/* Travel & Hotel Section */}
            <EventTravelSection event={event} />
            
            {/* Mobile Tickets Section */}
            <EventTicketsSection eventId={event.id} eventSlug={event.slug} />
          </div>
          
          {/* Sidebar - Desktop Only */}
          <aside className="hidden lg:block">
            <EventTicketsSidebar eventId={event.id} eventSlug={event.slug} />
          </aside>
        </div>
      </div>
      
      {/* Floating Ticket Bar - Mobile Only */}
      <FloatingTicketBar eventId={event.id} eventSlug={event.slug} />
    </EventsLayout>
  );
}
