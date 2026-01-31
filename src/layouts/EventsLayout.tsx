import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import logoLight from '@/assets/coclc-logo-light.png';
import logoDark from '@/assets/coclc-logo-dark.png';
import { useTheme } from 'next-themes';

interface EventsLayoutProps {
  children: React.ReactNode;
}

export function EventsLayout({ children }: EventsLayoutProps) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? logoDark : logoLight;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/events" className="flex items-center gap-3">
              <img src={logo} alt="Circle of Change" className="h-8" />
              <span className="font-semibold text-lg">Events</span>
            </Link>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/">Back to App</Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Circle of Change Leadership Society. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
