import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Plus, 
  X,
  ArrowLeftRight,
  Ticket,
  ShoppingCart,
  Users,
  BadgeCheck,
  UserCircle,
  CalendarDays,
  ScanLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventSelector } from './EventSelector';
import { useEventSelection } from '@/contexts/EventSelectionContext';

interface EventsDashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchDashboard?: () => void;
  showSwitchOption?: boolean;
}

// These items only show when an event is selected
const eventNavItems = [
  { path: '/events/manage/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/events/manage/attendees', label: 'Attendees', icon: Users },
  { path: '/events/manage/checkin', label: 'Check-In', icon: ScanLine },
  { path: '/events/manage/speakers', label: 'Speakers', icon: UserCircle },
  { path: '/events/manage/agenda', label: 'Agenda', icon: CalendarDays },
];

export function EventsDashboardSidebar({ 
  isOpen, 
  onClose,
  onSwitchDashboard,
  showSwitchOption = false
}: EventsDashboardSidebarProps) {
  const location = useLocation();
  const { selectedEventId, hasSelection } = useEventSelection();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  // Build nav items dynamically - only show event-specific items when an event is selected
  const dynamicNavItems = hasSelection 
    ? [
        ...eventNavItems,
        { path: `/events/manage/${selectedEventId}/badges`, label: 'Badges', icon: BadgeCheck },
      ]
    : [];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}
      
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/50 transition-transform duration-300 ease-out md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundImage: "var(--gradient-sidebar)" }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border/50" style={{ paddingTop: 'max(1rem, var(--safe-inset-top, env(safe-area-inset-top)))' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sidebar-accent">
              <Ticket className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">Events</h2>
              <p className="text-xs text-sidebar-foreground/60">Management</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Events link - always visible */}
        <div className="p-3 border-b border-sidebar-border/50">
          <Link
            to="/events/manage"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-3",
              isActive('/events/manage', true)
                ? "bg-primary text-primary-foreground shadow-gold"
                : "text-sidebar-foreground/90 hover:bg-sidebar-accent"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Events</span>
          </Link>
          <EventSelector />
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {dynamicNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-gold"
                    : "text-sidebar-foreground/90 hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer with switch option */}
        {showSwitchOption && (
          <div className="p-3 border-t border-sidebar-border/50">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-sidebar-accent/30 border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onSwitchDashboard}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Switch to LMS
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
