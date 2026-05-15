import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RegistrationLayoutProps {
  children: React.ReactNode;
  findOrderHref?: string;
}

export function RegistrationLayout({ children, findOrderHref = '/register/verify' }: RegistrationLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-white/80" style={{ backgroundColor: 'rgba(255,248,240,0.95)', borderColor: '#e8ddd0' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/events" className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold" style={{ color: '#6B1D3A' }}>
                Circle of Change
              </span>
              <span className="text-sm" style={{ color: '#8B6F5E' }}>
                Leadership Society
              </span>
            </Link>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2 border-[#6B1D3A]/20 text-[#6B1D3A] hover:bg-[#6B1D3A]/5"
            >
              <Link to={findOrderHref}>
                <Search className="h-4 w-4" />
                Find My Order
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="py-8 mt-16" style={{ borderTop: '1px solid #e8ddd0' }}>
        <div className="max-w-5xl mx-auto px-4 text-center text-sm" style={{ color: '#8B6F5E' }}>
          <p>&copy; {new Date().getFullYear()} Circle of Change Leadership Society. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
