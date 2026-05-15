import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAttendee, AttendeeProvider } from '@/contexts/AttendeeContext';
import { AttendeeLayout } from '@/components/attendee/AttendeeLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useNativelySafeArea } from '@/hooks/useNativelySafeArea';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';

// Preload attendee tab components for instant navigation
const preloadAttendeePages = (includeNativeOnly: boolean) => {
  import('@/pages/attendee/EventHome');
  if (includeNativeOnly) {
    import('@/pages/attendee/Feed');
  }
  import('@/pages/attendee/Agenda');
  import('@/pages/attendee/AgendaDetail');
  import('@/pages/attendee/Messages');
  import('@/pages/attendee/MyBookmarks');
  import('@/pages/attendee/QRCode');
};

function DashboardContent() {
  const isNativeApp = useIsNativeApp();
  const { isAuthenticated, loading, selectedEvent, events, orders } = useAttendee();
  const location = useLocation();

  // Initialize Natively safe area insets for proper bottom padding
  useNativelySafeArea();

  // Preload sibling tabs after initial render (skip Feed if not in native app)
  useEffect(() => {
    preloadAttendeePages(isNativeApp);
  }, [isNativeApp]);

  // Redirect non-native users away from Feed route
  if (location.pathname.includes('/feed') && !isNativeApp) {
    return <Navigate to="/attendee/app/home" replace />;
  }

  // Show loading state while checking authentication
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Show loading while fetching orders/events (orders are still being loaded)
  if (loading || (orders.length === 0 && events.length === 0)) {
    return (
      <AttendeeLayout title="Loading..." showHeader={false}>
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </AttendeeLayout>
    );
  }

  // No events found (orders loaded but no completed events)
  if (events.length === 0) {
    return (
      <AttendeeLayout title="No Events" showEventSelector={false}>
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-xl font-semibold mb-2">No Events Found</h2>
          <p className="text-muted-foreground max-w-xs">
            We couldn't find any events associated with your email address.
          </p>
        </div>
      </AttendeeLayout>
    );
  }

  // Detect if we're in a full-screen view (no layout wrapper)
  const isConversationView = location.pathname.match(/\/messages\/[^/]+$/);
  const isAgendaDetailView = location.pathname.match(/\/agenda\/[^/]+$/);
  const isFeedView = location.pathname.includes('/feed');

  if (isConversationView || isAgendaDetailView || isFeedView) {
    // Render full-screen without layout wrapper
    return <Outlet />;
  }

  // Determine title based on current route
  const getTitle = () => {
    if (location.pathname.includes('/messages')) return 'Messages';
    if (location.pathname.includes('/networking')) return 'Networking';
    if (location.pathname.includes('/profile')) return 'Profile';
    if (location.pathname.includes('/agenda')) return 'Agenda';
    if (location.pathname.includes('/bookmarks')) return 'Bookmarks';
    if (location.pathname.includes('/qr')) return 'My QR Code';
    return selectedEvent?.title || 'Event';
  };

  return (
    <AttendeeLayout
      title={getTitle()} 
      showEventSelector={events.length > 1}
    >
      <Outlet />
    </AttendeeLayout>
  );
}

export default function AttendeeDashboard() {
  return (
    <AttendeeProvider>
      <DashboardContent />
    </AttendeeProvider>
  );
}
