import { ReactNode, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EventsDashboardHeader } from '@/components/events/EventsDashboardHeader';
import { EventsDashboardSidebar } from '@/components/events/EventsDashboardSidebar';

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
      <EventsDashboardSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onSwitchDashboard={handleSwitchDashboard}
        showSwitchOption={hasLMSAccess}
      />
      <div className="flex-1 flex flex-col md:ml-64">
        <EventsDashboardHeader 
          onMenuClick={() => setSidebarOpen(true)}
          onSwitchDashboard={handleSwitchDashboard}
          showSwitchOption={hasLMSAccess}
        />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
