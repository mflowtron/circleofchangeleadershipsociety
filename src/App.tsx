import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Feed from "@/pages/Feed";
import Recordings from "@/pages/Recordings";
import Profile from "@/pages/Profile";
import Users from "@/pages/Users";
import Chapters from "@/pages/Chapters";
import Moderation from "@/pages/Moderation";
import MyChapter from "@/pages/MyChapter";
import Announcements from "@/pages/Announcements";
import NotFound from "@/pages/NotFound";

// Event pages
import EventsIndex from "@/pages/events/Index";
import EventDetail from "@/pages/events/EventDetail";
import ManageEventsIndex from "@/pages/events/manage/Index";
import NewEvent from "@/pages/events/manage/NewEvent";
import EditEvent from "@/pages/events/manage/EditEvent";
import ManageTickets from "@/pages/events/manage/ManageTickets";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles, noLayout }: { children: React.ReactNode; allowedRoles?: string[]; noLayout?: boolean }) {
  const { role, loading } = useAuth();
  
  if (loading) return null;
  
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  
  if (noLayout) {
    return <>{children}</>;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      
      <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
      <Route path="/recordings" element={<ProtectedRoute><Recordings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      {/* Advisor routes */}
      <Route 
        path="/my-chapter" 
        element={
          <ProtectedRoute allowedRoles={['advisor', 'admin']}>
            <MyChapter />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin routes */}
      <Route 
        path="/users" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chapters" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Chapters />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/moderation" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Moderation />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/announcements" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Announcements />
          </ProtectedRoute>
        } 
        />
      
      {/* Public Event Routes */}
      <Route path="/events" element={<EventsIndex />} />
      <Route path="/events/:slug" element={<EventDetail />} />
      
      {/* Event Management Routes (Protected) */}
      <Route 
        path="/events/manage" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} noLayout>
            <ManageEventsIndex />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/new" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} noLayout>
            <NewEvent />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/:id" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} noLayout>
            <EditEvent />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/events/manage/:id/tickets" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'event_organizer']} noLayout>
            <ManageTickets />
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
