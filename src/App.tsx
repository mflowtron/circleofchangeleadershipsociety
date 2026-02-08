import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { EventSelectionProvider } from "@/contexts/EventSelectionContext";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { lazy, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import { CircleLoader, FullPageLoader } from "@/components/ui/circle-loader";
import { useNativelyThemeSync } from "@/hooks/useNativelyThemeSync";
import RouteErrorBoundary from "@/components/ui/error-boundary";

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
const AreaSelector = lazy(() => import("@/pages/AreaSelector"));
const RootRouter = lazy(() => import("@/pages/RootRouter"));
const PendingApproval = lazy(() => import("@/pages/PendingApproval"));
const Calendar = lazy(() => import("@/pages/Calendar"));



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
const ManageSpeakers = lazy(() => import("@/pages/events/manage/Speakers"));
const ManageAgenda = lazy(() => import("@/pages/events/manage/Agenda"));
const ManageCheckIn = lazy(() => import("@/pages/events/manage/CheckIn"));
const ManageHotels = lazy(() => import("@/pages/events/manage/Hotels"));
const Checkout = lazy(() => import("@/pages/events/Checkout"));
const CheckoutSuccess = lazy(() => import("@/pages/events/CheckoutSuccess"));
const OrderAttendees = lazy(() => import("@/pages/events/OrderAttendees"));
const EventsDashboardLayout = lazy(() => import("@/layouts/EventsDashboardLayout"));

// Order Portal pages - lazy loaded
const OrderPortalDashboard = lazy(() => import("@/pages/orders/Dashboard"));

// Attendee App pages - lazy loaded
const AttendeeDashboard = lazy(() => import("@/pages/attendee/Dashboard"));
const AttendeeHome = lazy(() => import("@/pages/attendee/EventHome"));
const AttendeeAgenda = lazy(() => import("@/pages/attendee/Agenda"));
const AttendeeBookmarks = lazy(() => import("@/pages/attendee/MyBookmarks"));
const AttendeeQRCode = lazy(() => import("@/pages/attendee/QRCode"));
const AttendeeMessages = lazy(() => import("@/pages/attendee/Messages"));
const AttendeeConversation = lazy(() => import("@/pages/attendee/Conversation"));
const AttendeeNetworking = lazy(() => import("@/pages/attendee/Networking"));
const AttendeeProfilePage = lazy(() => import("@/pages/attendee/AttendeeProfile"));
const AttendeeAgendaDetail = lazy(() => import("@/pages/attendee/AgendaDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (previously cacheTime)
      refetchOnWindowFocus: false, // Prevent refetch when tab becomes active
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

// Helper component that wraps Suspense with error boundary
function SuspenseWithErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

// Wrapper to persist EventSelectionProvider across all /events/manage/* routes
function EventsManagementWrapper() {
  return (
    <EventSelectionProvider>
      <Outlet />
    </EventSelectionProvider>
  );
}

function ProtectedRoute({ children, allowedRoles, useEventsLayout, requireApproval = true }: { 
  children: React.ReactNode; 
  allowedRoles?: string[]; 
  useEventsLayout?: boolean;
  requireApproval?: boolean;
}) {
  const { loading, isApproved, isAdmin, hasModuleAccess, profile } = useAuth();
  
  if (loading) return null;
  
  // Check approval status if required
  if (requireApproval && !isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }
  
  // Check role access - map old role names to new system
  if (allowedRoles && allowedRoles.length > 0) {
    // Map legacy role names to new access checks
    const hasAccess = allowedRoles.some(allowedRole => {
      if (isAdmin) return true;
      if (allowedRole === 'lms_admin') return isAdmin;
      if (allowedRole === 'lms_advisor') return profile?.role === 'advisor' && hasModuleAccess('lms');
      if (allowedRole === 'em_admin') return isAdmin;
      if (allowedRole === 'em_manager') return (profile?.role === 'organizer' || isAdmin) && hasModuleAccess('events');
      return false;
    });
    
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }
  
  if (useEventsLayout) {
    return (
      <SuspenseWithErrorBoundary>
        <EventsDashboardLayout>{children}</EventsDashboardLayout>
      </SuspenseWithErrorBoundary>
    );
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading, hasLMSAccess, hasEMAccess, isApproved } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/pending-approval" element={
        !user ? (
          <Navigate to="/auth" replace />
        ) : isApproved ? (
          <Navigate to="/" replace />
        ) : (
          <SuspenseWithErrorBoundary>
            <PendingApproval />
          </SuspenseWithErrorBoundary>
        )
      } />
      
      {/* Smart Root Router - redirects based on roles */}
      <Route path="/" element={
        <SuspenseWithErrorBoundary>
          <RootRouter />
        </SuspenseWithErrorBoundary>
      } />
      
      {/* Area/Dashboard Selector for multi-role users */}
      <Route path="/select-dashboard" element={
        <SuspenseWithErrorBoundary>
          <AreaSelector />
        </SuspenseWithErrorBoundary>
      } />
      
      {/* LMS Routes - now under /lms prefix */}
      <Route path="/lms" element={
        <ProtectedRoute>
          <SuspenseWithErrorBoundary>
            <Feed />
          </SuspenseWithErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/lms/recordings" element={
        <ProtectedRoute>
          <SuspenseWithErrorBoundary>
            <Recordings />
          </SuspenseWithErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/lms/profile/:userId" element={
        <ProtectedRoute>
          <SuspenseWithErrorBoundary>
            <UserProfile />
          </SuspenseWithErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/lms/profile" element={
        <ProtectedRoute>
          <SuspenseWithErrorBoundary>
            <Profile />
          </SuspenseWithErrorBoundary>
        </ProtectedRoute>
      } />
      
      
      {/* LMS Advisor routes */}
      <Route 
        path="/lms/my-chapter" 
        element={
          <ProtectedRoute allowedRoles={['lms_advisor', 'lms_admin']}>
            <SuspenseWithErrorBoundary>
              <MyChapter />
            </SuspenseWithErrorBoundary>
          </ProtectedRoute>
        } 
      />
      
      {/* LMS Admin routes */}
      <Route 
        path="/lms/admin/users" 
        element={
          <ProtectedRoute allowedRoles={['lms_admin']}>
            <SuspenseWithErrorBoundary>
              <Users />
            </SuspenseWithErrorBoundary>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lms/admin/chapters" 
        element={
          <ProtectedRoute allowedRoles={['lms_admin']}>
            <SuspenseWithErrorBoundary>
              <Chapters />
            </SuspenseWithErrorBoundary>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lms/admin/moderation" 
        element={
          <ProtectedRoute allowedRoles={['lms_admin']}>
            <SuspenseWithErrorBoundary>
              <Moderation />
            </SuspenseWithErrorBoundary>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lms/admin/announcements" 
        element={
          <ProtectedRoute allowedRoles={['lms_admin']}>
            <SuspenseWithErrorBoundary>
              <Announcements />
            </SuspenseWithErrorBoundary>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lms/calendar" 
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary>
              <Calendar />
            </SuspenseWithErrorBoundary>
          </ProtectedRoute>
        } 
      />
      
      

      
      <Route path="/events" element={
        <SuspenseWithErrorBoundary>
          <EventsIndex />
        </SuspenseWithErrorBoundary>
      } />
      <Route path="/events/:slug" element={
        <SuspenseWithErrorBoundary>
          <EventDetail />
        </SuspenseWithErrorBoundary>
      } />
      <Route path="/events/:slug/checkout" element={
        <SuspenseWithErrorBoundary>
          <Checkout />
        </SuspenseWithErrorBoundary>
      } />
      <Route path="/events/:slug/checkout/success" element={
        <SuspenseWithErrorBoundary>
          <CheckoutSuccess />
        </SuspenseWithErrorBoundary>
      } />
      <Route path="/events/:slug/order/:orderId/attendees" element={
        <SuspenseWithErrorBoundary>
          <OrderAttendees />
        </SuspenseWithErrorBoundary>
      } />
      
      {/* Order Portal Routes (Public) */}
      <Route path="/my-orders" element={<Navigate to="/my-orders/dashboard" replace />} />
      <Route path="/my-orders/dashboard" element={
        <SuspenseWithErrorBoundary>
          <OrderPortalDashboard />
        </SuspenseWithErrorBoundary>
      } />
      
      {/* Attendee App Routes (redirects to app or auth) */}
      <Route path="/attendee" element={<Navigate to="/attendee/app/home" replace />} />
      <Route path="/attendee/app" element={
        <SuspenseWithErrorBoundary>
          <AttendeeDashboard />
        </SuspenseWithErrorBoundary>
      }>
        <Route index element={<Navigate to="/attendee/app/home" replace />} />
        <Route path="home" element={<AttendeeHome />} />
        <Route path="agenda" element={<AttendeeAgenda />} />
        <Route path="agenda/:itemId" element={<AttendeeAgendaDetail />} />
        <Route path="messages" element={<AttendeeMessages />} />
        <Route path="messages/:conversationId" element={<AttendeeConversation />} />
        <Route path="networking" element={<AttendeeNetworking />} />
        <Route path="profile" element={<AttendeeProfilePage />} />
        <Route path="bookmarks" element={<AttendeeBookmarks />} />
        <Route path="qr" element={<AttendeeQRCode />} />
      </Route>
      {/* Event Management Routes (Protected with Events Dashboard Layout) */}
      <Route element={<EventsManagementWrapper />}>
        <Route 
          path="/events/manage" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageEventsIndex />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/orders" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageOrders />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/orders/:orderId" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <OrderDetail />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/attendees" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageAttendees />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/new" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <NewEvent />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/:id" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <EditEvent />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/:id/tickets" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageTickets />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/:id/orders" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <EventOrders />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/:id/badges" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <BadgeDesigner />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/speakers" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageSpeakers />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/agenda" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageAgenda />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/checkin" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageCheckIn />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/hotels" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <ManageHotels />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/events/manage/profile" 
          element={
            <ProtectedRoute allowedRoles={['em_admin', 'em_manager']} useEventsLayout>
              <SuspenseWithErrorBoundary>
                <Profile />
              </SuspenseWithErrorBoundary>
            </ProtectedRoute>
          } 
        />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Inner component that has access to ThemeProvider context
function AppContent() {
  useNativelyThemeSync();
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            <AppContent />
          </SidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
