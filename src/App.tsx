import { Toaster } from "@/components/ui/sonner";
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
const RootRouter = lazy(() => import("@/pages/RootRouter"));
const PendingApproval = lazy(() => import("@/pages/PendingApproval"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Album = lazy(() => import("@/pages/Album"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <CircleLoader size="md" />
    </div>
  );
}

function SuspenseWithErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
  requireApproval = true,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "advisor" | "member">;
  requireApproval?: boolean;
}) {
  const { loading, isApproved, profile, isAdmin } = useAuth();

  if (loading) return null;

  if (requireApproval && !isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = profile?.role;
    const hasAccess = isAdmin || (role && allowedRoles.includes(role));
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading, isApproved } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/pending-approval"
        element={
          !user ? (
            <Navigate to="/auth" replace />
          ) : isApproved ? (
            <Navigate to="/" replace />
          ) : (
            <SuspenseWithErrorBoundary>
              <PendingApproval />
            </SuspenseWithErrorBoundary>
          )
        }
      />

      <Route
        path="/"
        element={
          <SuspenseWithErrorBoundary>
            <RootRouter />
          </SuspenseWithErrorBoundary>
        }
      />

      <Route
        path="/lms"
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary><Feed /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/recordings"
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary><Recordings /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/profile/:userId"
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary><UserProfile /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/profile"
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary><Profile /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/my-chapter"
        element={
          <ProtectedRoute allowedRoles={["advisor"]}>
            <SuspenseWithErrorBoundary><MyChapter /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SuspenseWithErrorBoundary><Users /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/admin/chapters"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SuspenseWithErrorBoundary><Chapters /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/admin/moderation"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SuspenseWithErrorBoundary><Moderation /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/admin/announcements"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SuspenseWithErrorBoundary><Announcements /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/calendar"
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary><Calendar /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/album"
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary><Album /></SuspenseWithErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lms/album/:photoId"
        element={
          <ProtectedRoute>
            <SuspenseWithErrorBoundary><Album /></SuspenseWithErrorBoundary>
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
