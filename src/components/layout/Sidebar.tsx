import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Video, 
  User, 
  Users, 
  BookOpen, 
  Shield,
  Settings,
  X
} from 'lucide-react';
import logo from '@/assets/coclc-logo.png';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/SidebarContext';

const navItems = {
  student: [
    { path: '/', label: 'Feed', icon: Home },
    { path: '/recordings', label: 'Recordings', icon: Video },
    { path: '/profile', label: 'Profile', icon: User },
  ],
  advisor: [
    { path: '/', label: 'Feed', icon: Home },
    { path: '/recordings', label: 'Recordings', icon: Video },
    { path: '/my-chapter', label: 'My Chapter', icon: BookOpen },
    { path: '/profile', label: 'Profile', icon: User },
  ],
  admin: [
    { path: '/', label: 'Feed', icon: Home },
    { path: '/recordings', label: 'Recordings', icon: Video },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/chapters', label: 'Chapters', icon: BookOpen },
    { path: '/moderation', label: 'Moderation', icon: Shield },
    { path: '/profile', label: 'Profile', icon: User },
  ],
};

export default function Sidebar() {
  const location = useLocation();
  const { role } = useAuth();
  const { isOpen, setIsOpen } = useSidebar();
  
  const items = navItems[role || 'student'] || navItems.student;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-secondary text-secondary-foreground transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex items-center justify-between border-b border-secondary-foreground/10">
          <img src={logo} alt="Circle of Change" className="h-10" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-secondary-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-secondary-foreground/10"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
