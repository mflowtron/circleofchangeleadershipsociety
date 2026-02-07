import { Home, Calendar, Bookmark, QrCode, MessageCircle } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { path: '/attendee/app/home', label: 'Home', icon: Home },
  { path: '/attendee/app/agenda', label: 'Agenda', icon: Calendar },
  { path: '/attendee/app/messages', label: 'Messages', icon: MessageCircle },
  { path: '/attendee/app/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { path: '/attendee/app/qr', label: 'QR Code', icon: QrCode },
];

export function BottomNavigation() {
  const location = useLocation();
  const { totalUnread } = useConversations();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, label, icon: Icon }) => {
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
        })}
      </div>
    </nav>
  );
}