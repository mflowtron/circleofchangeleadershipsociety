import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Home, Video, User, Users, BookOpen, Shield, X, Megaphone, Ticket, CalendarDays, Activity } from 'lucide-react';
import { useTheme } from 'next-themes';
import logoDark from '@/assets/coclc-logo-dark.png';
import logoLight from '@/assets/coclc-logo-light.png';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/SidebarContext';
const navItems = {
  student: [{
    path: '/',
    label: 'Feed',
    icon: Home
  }, {
    path: '/recordings',
    label: 'Recordings',
    icon: Video
  }, {
    path: '/lms-events',
    label: 'Events',
    icon: CalendarDays
  }, {
    path: '/profile',
    label: 'Profile',
    icon: User
  }],
  advisor: [{
    path: '/',
    label: 'Feed',
    icon: Home
  }, {
    path: '/recordings',
    label: 'Recordings',
    icon: Video
  }, {
    path: '/lms-events',
    label: 'Events',
    icon: CalendarDays
  }, {
    path: '/my-chapter',
    label: 'My Chapter',
    icon: BookOpen
  }, {
    path: '/profile',
    label: 'Profile',
    icon: User
  }],
  admin: [{
    path: '/',
    label: 'Feed',
    icon: Home
  }, {
    path: '/admin',
    label: 'Activity',
    icon: Activity
  }, {
    path: '/recordings',
    label: 'Recordings',
    icon: Video
  }, {
    path: '/lms-events',
    label: 'Events',
    icon: CalendarDays
  }, {
    path: '/announcements',
    label: 'Announcements',
    icon: Megaphone
  }, {
    path: '/users',
    label: 'Users',
    icon: Users
  }, {
    path: '/chapters',
    label: 'Chapters',
    icon: BookOpen
  }, {
    path: '/moderation',
    label: 'Moderation',
    icon: Shield
  }, {
    path: '/profile',
    label: 'Profile',
    icon: User
  }]
};
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    role,
    hasEventsAccess
  } = useAuth();
  const {
    isOpen,
    setIsOpen
  } = useSidebar();
  const {
    resolvedTheme
  } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const logo = isDark ? logoDark : logoLight;
  const items = navItems[role as keyof typeof navItems] || navItems.student;
  const handleSwitchToEvents = () => {
    setIsOpen(false);
    navigate('/events/manage');
  };
  return <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40 md:hidden animate-fade-in" onClick={() => setIsOpen(false)} />}
      
      <aside className={cn("fixed top-0 left-0 z-50 h-full w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/50 transition-transform duration-300 ease-out md:translate-x-0 flex flex-col", isOpen ? "translate-x-0" : "-translate-x-full")} style={{
      backgroundImage: "var(--gradient-sidebar)",
      paddingTop: "env(safe-area-inset-top, 0px)"
    }}>
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Circle of Change" className="h-10" />
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={cn("group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200", isActive ? "bg-primary text-primary-foreground font-medium shadow-gold" : "text-sidebar-foreground/90 hover:bg-sidebar-accent")} style={{
            animationDelay: `${index * 0.05}s`
          }}>
                <div className={cn("p-2 rounded-lg transition-colors", isActive ? "bg-primary-foreground/20" : "bg-sidebar-accent group-hover:bg-sidebar-primary/20")}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{item.label}</span>
                {isActive}
              </Link>;
        })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-3">
          {/* Switch to Events Dashboard button for users with events access */}
          {hasEventsAccess && <Button variant="outline" className="w-full justify-start gap-2 bg-sidebar-accent/30 border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSwitchToEvents}>
              <Ticket className="h-4 w-4" />
              Events Dashboard
            </Button>}
          <div className="px-4 py-3 rounded-xl bg-sidebar-accent/50 text-center">
            <p className="text-xs text-sidebar-foreground/60">
              Circle of Change
            </p>
            <p className="text-xs font-medium text-sidebar-primary mt-0.5">
              Leadership Society
            </p>
          </div>
        </div>
      </aside>
    </>;
}