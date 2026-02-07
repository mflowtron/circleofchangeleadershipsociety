import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import InstallBanner from '@/components/pwa/InstallBanner';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { FullPageLoader } from '@/components/ui/circle-loader';

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
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-72">
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-scroll">
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
      <InstallBanner />
    </div>
  );
}
