import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { authLog, authError } from '@/utils/authLog';

const APPROVAL_POLL_INTERVAL = 10000; // 10 seconds
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

    authLog('pending', 'page_mounted', {
      user: user.id,
      has_profile: !!profile,
      role: profile?.role,
      is_approved: profile?.is_approved,
    });

    const checkApproval = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        authError('pending', 'approval_check_error', { user: user.id, code: (error as any).code }, error);
        return;
      }

      if (data?.is_approved) {
        authLog('pending', 'approved_redirecting', { user: user.id });
        navigate('/');
      } else {
        authLog('pending', 'still_pending', { user: user.id, has_row: !!data });
      }
    };

    // Run immediately so approved users aren't stuck for 10s
    checkApproval();
    const interval = setInterval(checkApproval, APPROVAL_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [user, navigate, profile]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
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
          <CardTitle asChild className="text-2xl">
            <h1>Account Pending Approval</h1>
          </CardTitle>
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
    </main>
  );
}
