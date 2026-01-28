import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GraduationCap, Ticket, LogOut } from 'lucide-react';

const DASHBOARD_PREFERENCE_KEY = 'preferred_dashboard';

export default function DashboardSelector() {
  const { user, loading, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [rememberChoice, setRememberChoice] = useState(false);

  // Determine access levels
  const hasLMSAccess = role === 'admin' || role === 'advisor' || role === 'student';
  const hasEventsAccess = role === 'admin' || role === 'event_organizer';
  const hasDualAccess = hasLMSAccess && hasEventsAccess;

  // Check for saved preference on mount
  useEffect(() => {
    if (!loading && user && hasDualAccess) {
      const savedPreference = localStorage.getItem(DASHBOARD_PREFERENCE_KEY);
      if (savedPreference === 'lms') {
        navigate('/', { replace: true });
      } else if (savedPreference === 'events') {
        navigate('/events/manage', { replace: true });
      }
    }
  }, [loading, user, hasDualAccess, navigate]);

  // Redirect users without dual access
  useEffect(() => {
    if (!loading && user && !hasDualAccess) {
      if (hasEventsAccess) {
        navigate('/events/manage', { replace: true });
      } else if (hasLMSAccess) {
        navigate('/', { replace: true });
      }
    }
  }, [loading, user, hasDualAccess, hasLMSAccess, hasEventsAccess, navigate]);

  const selectDashboard = (dashboard: 'lms' | 'events') => {
    if (rememberChoice) {
      localStorage.setItem(DASHBOARD_PREFERENCE_KEY, dashboard);
    }
    navigate(dashboard === 'lms' ? '/' : '/events/manage', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show selector only for dual access users
  if (!hasDualAccess) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">Choose where you'd like to go</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* LMS Dashboard Card */}
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
            onClick={() => selectDashboard('lms')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-2">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>LMS Dashboard</CardTitle>
              <CardDescription>
                Circle of Change Leadership Society
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Access the learning management system, view recordings, manage chapters, and moderate content.
              </p>
              <Button className="w-full">
                Go to LMS
              </Button>
            </CardContent>
          </Card>

          {/* Events Dashboard Card */}
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
            onClick={() => selectDashboard('events')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-2">
                <Ticket className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Events Dashboard</CardTitle>
              <CardDescription>
                Event Management
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Create and manage events, ticket types, view orders, and track attendee registrations.
              </p>
              <Button className="w-full">
                Go to Events
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="remember" 
              checked={rememberChoice}
              onCheckedChange={(checked) => setRememberChoice(checked === true)}
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              Remember my choice
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
