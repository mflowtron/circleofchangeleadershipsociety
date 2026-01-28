import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import InstallBanner from '@/components/pwa/InstallBanner';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const { setIsOpen, isOpen } = useSidebar();

  // Enable swipe from left edge to open sidebar on mobile
  useSwipeGesture({
    onSwipeRight: () => setIsOpen(true),
    onSwipeLeft: () => setIsOpen(false),
    edgeWidth: 25,
    threshold: 60,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-72">
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
      <InstallBanner />
    </div>
  );
}
