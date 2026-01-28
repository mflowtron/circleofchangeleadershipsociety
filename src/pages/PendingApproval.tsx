import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';
import logoLight from '@/assets/coclc-logo-light.png';
import logoDark from '@/assets/coclc-logo-dark.png';
import { useTheme } from 'next-themes';

export default function PendingApproval() {
  const { signOut, profile, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const logo = resolvedTheme === 'dark' ? logoDark : logoLight;

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime changes on the user's profile
    const channel = supabase
      .channel('profile-approval')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newProfile = payload.new as { is_approved: boolean };
          
          if (newProfile.is_approved) {
            // Fetch role to determine redirect
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .single();

            const role = roleData?.role;
            const hasLMSAccess = role === 'admin' || role === 'advisor' || role === 'student';
            const hasEventsAccess = role === 'admin' || role === 'event_organizer';

            if (hasLMSAccess && hasEventsAccess) {
              navigate('/select-dashboard');
            } else if (hasEventsAccess && !hasLMSAccess) {
              navigate('/events/manage');
            } else {
              navigate('/');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Circle of Change" className="h-16" />
          </div>
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Clock className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          <CardDescription className="text-base">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}! Your account is currently awaiting administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            An administrator will review your registration and assign you to the appropriate chapter. 
            You'll receive access once your account has been approved.
          </p>
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={signOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
