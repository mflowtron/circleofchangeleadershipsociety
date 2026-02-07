import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FullPageLoader } from '@/components/ui/circle-loader';

/**
 * Handles auth callback for email verification and password reset flows
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setMessage('Sign in failed. Redirecting...');
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }

        if (session) {
          // Add a small delay to ensure trigger has completed for new users
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_approved, role')
            .eq('user_id', session.user.id)
            .single();

          console.log('Auth callback - profile result:', profileData);

          // Check if profile query failed (not just empty data)
          if (profileError) {
            console.error('Profile query error:', profileError);
            // If profile doesn't exist yet, wait and retry
            if (profileError.code === 'PGRST116') {
              setMessage('Setting up your account...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retryResult = await supabase
                .from('profiles')
                .select('is_approved')
                .eq('user_id', session.user.id)
                .single();
              if (retryResult.data) {
                const isApproved = retryResult.data.is_approved;
                if (!isApproved) {
                  navigate('/pending-approval', { replace: true });
                } else {
                  navigate('/', { replace: true });
                }
                return;
              }
            }
            // Default to pending approval for safety if profile can't be fetched
            navigate('/pending-approval', { replace: true });
            return;
          }

          const isApproved = profileData?.is_approved ?? false;

          if (!isApproved) {
            navigate('/pending-approval', { replace: true });
          } else {
            // Let the RootRouter handle the routing based on roles
            navigate('/', { replace: true });
          }
        } else {
          // No session, redirect to auth
          navigate('/auth', { replace: true });
        }
      } catch (e) {
        console.error('Auth callback error:', e);
        setMessage('Something went wrong. Redirecting...');
        setTimeout(() => navigate('/auth'), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <FullPageLoader />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}
