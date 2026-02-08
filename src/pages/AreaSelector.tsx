import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GraduationCap, Ticket, Users, LogOut } from 'lucide-react';
import logoLight from '@/assets/coclc-logo-light.png';
import logoDark from '@/assets/coclc-logo-dark.png';
import { useTheme } from 'next-themes';
import { FullPageLoader } from '@/components/ui/circle-loader';

type AccessArea = 'lms' | 'events' | 'attendee';

interface AreaConfig {
  id: AccessArea;
  title: string;
  description: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
}

const AREA_CONFIGS: AreaConfig[] = [
  {
    id: 'lms',
    title: 'Society',
    subtitle: 'Circle of Change Leadership Society',
    description: 'Access the learning management system, view recordings, manage chapters, and moderate content.',
    icon: GraduationCap,
    route: '/lms',
  },
  {
    id: 'events',
    title: 'Events Dashboard',
    subtitle: 'Event Management',
    description: 'Create and manage events, ticket types, view orders, and track attendee registrations.',
    icon: Ticket,
    route: '/events/manage',
  },
  {
    id: 'attendee',
    title: 'Attendee App',
    subtitle: 'Event Attendee Experience',
    description: 'Access your event agenda, networking features, and session bookmarks.',
    icon: Users,
    route: '/attendee/app/home',
  },
];

export default function AreaSelector() {
  const { user, loading, signOut, isApproved, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? logoDark : logoLight;
  const [rememberChoice, setRememberChoice] = useState(false);

  // Determine accessible areas based on module_access
  const accessibleAreas: AccessArea[] = [];
  if (hasModuleAccess('lms')) accessibleAreas.push('lms');
  if (hasModuleAccess('events')) accessibleAreas.push('events');
  // Attendee access is always available for now
  accessibleAreas.push('attendee');

  const handleSelectArea = async (config: AreaConfig) => {
    navigate(config.route, { replace: true });
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }

  // If user only has access to one area, redirect directly
  if (accessibleAreas.length === 1) {
    const config = AREA_CONFIGS.find(c => c.id === accessibleAreas[0]);
    if (config) {
      return <Navigate to={config.route} replace />;
    }
  }

  // Filter to only show areas the user has access to
  const availableAreas = AREA_CONFIGS.filter(config => 
    accessibleAreas.includes(config.id)
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Circle of Change" className="h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground">Choose where you'd like to go</p>
          </div>
        </div>

        <div className={`grid gap-4 ${availableAreas.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {availableAreas.map((config) => {
            const Icon = config.icon;
            return (
              <Card 
                key={config.id}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                onClick={() => handleSelectArea(config)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-2">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{config.title}</CardTitle>
                  <CardDescription>
                    {config.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {config.description}
                  </p>
                  <Button className="w-full">
                    Go to {config.title.split(' ')[0]}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              checked={rememberChoice}
              onCheckedChange={(checked) => setRememberChoice(checked as boolean)}
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              Remember my choice and take me here next time
            </Label>
          </div>

          <Button variant="ghost" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
