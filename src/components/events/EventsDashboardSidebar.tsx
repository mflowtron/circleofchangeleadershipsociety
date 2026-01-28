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
  BadgeCheck
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

const navItems = [
  { path: '/events/manage/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/events/manage/attendees', label: 'Attendees', icon: Users },
  { path: '/events/manage', label: 'Events', icon: Calendar, exact: true },
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

  // Build nav items dynamically to include badge designer when event is selected
  const dynamicNavItems = hasSelection 
    ? [
        ...navItems,
        { path: `/events/manage/${selectedEventId}/badges`, label: 'Badge Designer', icon: BadgeCheck },
      ]
    : navItems;

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
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transition-transform duration-300 ease-out md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Events</h2>
              <p className="text-xs text-muted-foreground">Management</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Event Selector */}
        <div className="p-3 border-b">
          <EventSelector />
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {dynamicNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
          <div className="p-3 border-t">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
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
