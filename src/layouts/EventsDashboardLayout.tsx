import { ReactNode, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EventsDashboardHeader } from '@/components/events/EventsDashboardHeader';
import { EventsDashboardSidebar } from '@/components/events/EventsDashboardSidebar';
import { EventSelectionProvider } from '@/contexts/EventSelectionContext';
import { FullPageLoader } from '@/components/ui/circle-loader';

interface EventsDashboardLayoutProps {
  children: ReactNode;
}

const DASHBOARD_PREFERENCE_KEY = 'preferred_dashboard';

export default function EventsDashboardLayout({ children }: EventsDashboardLayoutProps) {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if user has LMS access (for showing switch option)
  const hasLMSAccess = role === 'admin' || role === 'advisor' || role === 'student';

  const handleSwitchDashboard = () => {
    localStorage.setItem(DASHBOARD_PREFERENCE_KEY, 'lms');
    navigate('/');
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <EventSelectionProvider>
      <div className="min-h-screen bg-background flex">
        <EventsDashboardSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onSwitchDashboard={handleSwitchDashboard}
          showSwitchOption={hasLMSAccess}
        />
        <div className="flex-1 flex flex-col md:ml-64">
          <EventsDashboardHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="animate-fade-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </EventSelectionProvider>
  );
}
