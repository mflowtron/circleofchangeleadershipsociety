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
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import { CircleLoader, FullPageLoader } from "@/components/ui/circle-loader";

// Lazy load pages for better initial bundle size
const Feed = lazy(() => import("@/pages/Feed"));
const Recordings = lazy(() => import("@/pages/Recordings"));
const Profile = lazy(() => import("@/pages/Profile"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const Users = lazy(() => import("@/pages/Users"));
const Chapters = lazy(() => import("@/pages/Chapters"));
const Moderation = lazy(() => import("@/pages/Moderation"));
const MyChapter = lazy(() => import("@/pages/MyChapter"));
const Announcements = lazy(() => import("@/pages/Announcements"));
const DashboardSelector = lazy(() => import("@/pages/DashboardSelector"));
const PendingApproval = lazy(() => import("@/pages/PendingApproval"));
const LMSEvents = lazy(() => import("@/pages/LMSEvents"));


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

// Order Portal pages - lazy loaded
const OrderPortalIndex = lazy(() => import("@/pages/orders/Index"));
const OrderPortalDashboard = lazy(() => import("@/pages/orders/Dashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (previously cacheTime)
    },
  },
});

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <CircleLoader size="md" />
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles, useEventsLayout, requireApproval = true }: { 
  children: React.ReactNode; 
  allowedRoles?: string[]; 
  useEventsLayout?: boolean;
  requireApproval?: boolean;
}) {
  const { role, loading, isApproved } = useAuth();
  
  if (loading) return null;
  
  // Check approval status if required
  if (requireApproval && !isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }
  
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
  const { user, loading, hasLMSAccess, hasEventsAccess, hasDualAccess, isApproved } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!user) return '/auth';
    
    // Unapproved users go to pending approval page
    if (!isApproved) {
      return '/pending-approval';
    }
    
    // Users with dual access: always go to selector
    if (hasDualAccess) {
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
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/pending-approval" element={
        !user ? (
          <Navigate to="/auth" replace />
        ) : isApproved ? (
          <Navigate to="/" replace />
        ) : (
          <Suspense fallback={<PageLoader />}>
            <PendingApproval />
          </Suspense>
        )
      } />
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
      <Route path="/profile/:userId" element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <UserProfile />
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
      <Route 
        path="/lms-events" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <LMSEvents />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
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
      
      {/* Order Portal Routes (Public) */}
      <Route path="/my-orders" element={
        <Suspense fallback={<PageLoader />}>
          <OrderPortalIndex />
        </Suspense>
      } />
      <Route path="/my-orders/dashboard" element={
        <Suspense fallback={<PageLoader />}>
          <OrderPortalDashboard />
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
