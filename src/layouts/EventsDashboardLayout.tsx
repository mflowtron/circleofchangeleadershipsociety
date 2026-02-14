import { ReactNode, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EventsDashboardHeader } from '@/components/events/EventsDashboardHeader';
import { EventsDashboardSidebar } from '@/components/events/EventsDashboardSidebar';
import { FullPageLoader } from '@/components/ui/circle-loader';

interface EventsDashboardLayoutProps {
  children: ReactNode;
}

export default function EventsDashboardLayout({ children }: EventsDashboardLayoutProps) {
  const { user, loading, hasModuleAccess } = useAuth();
  const showSwitchOption = [hasModuleAccess('lms'), hasModuleAccess('events'), hasModuleAccess('attendee')].filter(Boolean).length > 1;
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSwitchDashboard = () => {
    navigate('/');
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <EventsDashboardSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onSwitchDashboard={handleSwitchDashboard}
        showSwitchOption={showSwitchOption}
      />
      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <EventsDashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto">
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
