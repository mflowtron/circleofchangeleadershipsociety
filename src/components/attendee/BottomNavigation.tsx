import { Home, Calendar, QrCode, MessageCircle, Newspaper, Plus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const baseNavItems = [
  { path: '/attendee/app/home', label: 'Home', icon: Home },
  { path: '/attendee/app/feed', label: 'Feed', icon: Newspaper },
];

const agendaItem = { path: '/attendee/app/agenda', label: 'Agenda', icon: Calendar };

const endNavItems = [
  { path: '/attendee/app/messages', label: 'Messages', icon: MessageCircle },
  { path: '/attendee/app/qr', label: 'QR', icon: QrCode },
];

export function BottomNavigation() {
  const location = useLocation();
  const { totalUnread } = useConversations();
  const isFeedRoute = location.pathname.includes('/attendee/app/feed');

  const handleCreatePost = () => {
    toast.info('Create post coming soon!');
  };

  const renderNavItem = ({ path, label, icon: Icon }: typeof baseNavItems[0]) => {
    const isActive = location.pathname.startsWith(path);
    const showBadge = path === '/attendee/app/messages' && totalUnread > 0;
    
    return (
      <NavLink
        key={path}
        to={path}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
          "touch-manipulation active:scale-95",
          isActive 
            ? "text-primary" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="relative">
          <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
          {showBadge && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
        </div>
        <span className={cn(
          "text-xs font-medium",
          isActive && "font-semibold"
        )}>
          {label}
        </span>
      </NavLink>
    );
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {baseNavItems.map(renderNavItem)}
        
        {/* Center item: Create button on feed, Agenda elsewhere */}
        {isFeedRoute ? (
          <button 
            onClick={handleCreatePost}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 touch-manipulation active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg animate-scale-in">
              <Plus className="h-5 w-5 text-primary-foreground" />
            </div>
          </button>
        ) : (
          renderNavItem(agendaItem)
        )}
        
        {endNavItems.map(renderNavItem)}
      </div>
    </nav>
  );
}