import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface EventsDashboardHeaderProps {
  onMenuClick: () => void;
}

export function EventsDashboardHeader({ onMenuClick }: EventsDashboardHeaderProps) {
  const { signOut, profile } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1">
          <h1 className="text-lg font-semibold md:hidden">Events</h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:block text-sm text-muted-foreground">
            {profile?.full_name}
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
