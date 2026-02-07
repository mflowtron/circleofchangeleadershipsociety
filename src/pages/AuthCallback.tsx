import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { storePWAAuthSession } from '@/hooks/usePWAAuth';
import { FullPageLoader } from '@/components/ui/circle-loader';

/**
 * Handles OAuth callback and redirects appropriately
 * Also stores session for PWA to pick up if opened in external browser
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
          // Store session for PWA to pick up (in case this was opened from PWA)
          storePWAAuthSession(session.access_token, session.refresh_token);

          // Check if this window was opened from a PWA
          // If so, we can try to close it and let the PWA handle the session
          const isPopup = window.opener !== null;
          
          if (isPopup) {
            setMessage('Sign in successful! You can close this window.');
            // Try to close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 1500);
            return;
          }

          // Normal browser flow - redirect based on user role
          // Add a small delay to ensure trigger has completed for new users
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const [profileResult, roleResult] = await Promise.all([
            supabase.from('profiles').select('is_approved').eq('user_id', session.user.id).single(),
            supabase.from('user_roles').select('role').eq('user_id', session.user.id).single()
          ]);

          console.log('Auth callback - profile result:', profileResult);
          console.log('Auth callback - role result:', roleResult);

          // Check if profile query failed (not just empty data)
          if (profileResult.error) {
            console.error('Profile query error:', profileResult.error);
            // If profile doesn't exist yet, wait and retry
            if (profileResult.error.code === 'PGRST116') {
              setMessage('Setting up your account...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retryResult = await supabase.from('profiles').select('is_approved').eq('user_id', session.user.id).single();
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

          const isApproved = profileResult.data?.is_approved ?? false;

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
