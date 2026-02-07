import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { EventSelector } from './EventSelector';
import { useAttendee } from '@/contexts/AttendeeContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface AttendeeLayoutProps {
  children: ReactNode;
  title?: string;
  showEventSelector?: boolean;
  showHeader?: boolean;
}

export function AttendeeLayout({ 
  children, 
  title,
  showEventSelector = true,
  showHeader = true,
}: AttendeeLayoutProps) {
  const { logout, events } = useAttendee();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {title && (
                <h1 className="text-lg font-semibold truncate">{title}</h1>
              )}
              {showEventSelector && events.length > 1 && (
                <EventSelector />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="shrink-0"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      {/* Main content with padding for bottom nav */}
      <main 
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>

      {/* Bottom navigation with safe area */}
      <BottomNavigation />
    </div>
  );
}
