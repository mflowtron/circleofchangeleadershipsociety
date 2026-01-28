import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { lazy, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Lazy load pages for better initial bundle size
const Feed = lazy(() => import("@/pages/Feed"));
const Recordings = lazy(() => import("@/pages/Recordings"));
const Profile = lazy(() => import("@/pages/Profile"));
const Users = lazy(() => import("@/pages/Users"));
const Chapters = lazy(() => import("@/pages/Chapters"));
const Moderation = lazy(() => import("@/pages/Moderation"));
const MyChapter = lazy(() => import("@/pages/MyChapter"));
const Announcements = lazy(() => import("@/pages/Announcements"));
const DashboardSelector = lazy(() => import("@/pages/DashboardSelector"));

// Event pages - lazy loaded
const EventsIndex = lazy(() => import("@/pages/events/Index"));
const EventDetail = lazy(() => import("@/pages/events/EventDetail"));
const ManageEventsIndex = lazy(() => import("@/pages/events/manage/Index"));
const NewEvent = lazy(() => import("@/pages/events/manage/NewEvent"));
const EditEvent = lazy(() => import("@/pages/events/manage/EditEvent"));
const ManageTickets = lazy(() => import("@/pages/events/manage/ManageTickets"));
const EventOrders = lazy(() => import("@/pages/events/manage/EventOrders"));
const ManageOrders = lazy(() => import("@/pages/events/manage/Orders"));
const ManageAttendees = lazy(() => import("@/pages/events/manage/Attendees"));
const OrderDetail = lazy(() => import("@/pages/events/manage/OrderDetail"));
const BadgeDesigner = lazy(() => import("@/pages/events/manage/BadgeDesigner"));
const Checkout = lazy(() => import("@/pages/events/Checkout"));
const CheckoutSuccess = lazy(() => import("@/pages/events/CheckoutSuccess"));
const OrderAttendees = lazy(() => import("@/pages/events/OrderAttendees"));
const EventsDashboardLayout = lazy(() => import("@/layouts/EventsDashboardLayout"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (previously cacheTime)
    },
  },
});

const DASHBOARD_PREFERENCE_KEY = 'preferred_dashboard';

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles, useEventsLayout }: { 
  children: React.ReactNode; 
  allowedRoles?: string[]; 
  useEventsLayout?: boolean;
}) {
  const { role, loading, hasLMSAccess, hasEventsAccess } = useAuth();
  
  if (loading) return null;
  
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  
  if (useEventsLayout) {
    return (
      <Suspense fallback={<PageLoader />}>
        <EventsDashboardLayout>{children}</EventsDashboardLayout>
      </Suspense>
    );
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading, role, hasLMSAccess, hasEventsAccess, hasDualAccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-lg">Loading...</div>
      </div>
    );
  }

  // Determine default route based on user role and saved preference
  const getDefaultRoute = () => {
    if (!user) return '/auth';
    
    const savedPreference = localStorage.getItem(DASHBOARD_PREFERENCE_KEY);
    
    // Users with dual access: check preference or go to selector
    if (hasDualAccess) {
      if (savedPreference === 'lms') return '/';
      if (savedPreference === 'events') return '/events/manage';
      return '/select-dashboard';
    }
    
    // Event organizer only: go to events dashboard
    if (hasEventsAccess && !hasLMSAccess) {
      return '/events/manage';
    }
    
    // LMS users: go to feed
    return '/';
  };

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to={getDefaultRoute()} replace /> : <Auth />} />
      <Route path="/select-dashboard" element={
        <Suspense fallback={<PageLoader />}>
          <DashboardSelector />
        </Suspense>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Feed />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/recordings" element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Recordings />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Profile />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Advisor routes */}
      <Route 
        path="/my-chapter" 
        element={
          <ProtectedRoute allowedRoles={['advisor', 'admin']}>
            <Suspense fallback={<PageLoader />}>
              <MyChapter />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Admin routes */}
      <Route 
        path="/users" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoader />}>
              <Users />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chapters" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoader />}>
              <Chapters />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/moderation" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoader />}>
              <Moderation />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/announcements" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoader />}>
              <Announcements />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Public Event Routes */}
      <Route path="/events" element={
        <Suspense fallback={<PageLoader />}>
          <EventsIndex />
        </Suspense>
      } />
      <Route path="/events/:slug" element={
        <Suspense fallback={<PageLoader />}>
          <EventDetail />
        </Suspense>
      } />
      <Route path="/events/:slug/checkout" element={
        <Suspense fallback={<PageLoader />}>
          <Checkout />
        </Suspense>
      } />
      <Route path="/events/:slug/checkout/success" element={
        <Suspense fallback={<PageLoader />}>
          <CheckoutSuccess />
        </Suspense>
      } />
      <Route path="/events/:slug/order/:orderId/attendees" element={
        <Suspense fallback={<PageLoader />}>
          <OrderAttendees />
        </Suspense>
      } />
      
      {/* Event Management Routes (Protected with Events Dashboard Layout) */}
      <Route 
        path="/events/manage" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <ManageEventsIndex />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/orders" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <ManageOrders />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/orders/:orderId" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <OrderDetail />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/attendees" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <ManageAttendees />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/new" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <NewEvent />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/:id" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <EditEvent />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/:id/tickets" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <ManageTickets />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/:id/orders" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <EventOrders />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/:id/badges" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} useEventsLayout>
            <Suspense fallback={<PageLoader />}>
              <BadgeDesigner />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
