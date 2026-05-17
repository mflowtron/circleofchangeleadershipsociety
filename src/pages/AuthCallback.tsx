import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FullPageLoader } from '@/components/ui/circle-loader';
import { authLog, authWarn, authError } from '@/utils/authLog';

/**
 * Handles auth callback for email verification and password reset flows
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      authLog('callback', 'entered');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          authError('callback', 'get_session_error', { message: error.message }, error);
          setMessage('Sign in failed. Redirecting...');
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }

        if (session) {
          authLog('callback', 'session_present', { user: session.user.id });
          // Add a small delay to ensure trigger has completed for new users
          await new Promise(resolve => setTimeout(resolve, 500));

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_approved, role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profileError) {
            authError('callback', 'profile_query_error', {
              user: session.user.id,
              code: (profileError as any).code,
            }, profileError);
            // Retry once for brand-new accounts whose trigger is still running
            setMessage('Setting up your account...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryResult = await supabase
              .from('profiles')
              .select('is_approved, role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            if (retryResult.data) {
              const isApproved = retryResult.data.is_approved;
              authLog('callback', 'profile_retry_success', {
                user: session.user.id,
                role: retryResult.data.role,
                is_approved: isApproved,
              });
              navigate(isApproved ? '/' : '/pending-approval', { replace: true });
              return;
            }
            authWarn('callback', 'profile_retry_empty_default_pending', { user: session.user.id });
            navigate('/pending-approval', { replace: true });
            return;
          }

          if (!profileData) {
            authWarn('callback', 'profile_empty_default_pending', { user: session.user.id });
            navigate('/pending-approval', { replace: true });
            return;
          }

          const isApproved = profileData.is_approved;
          authLog('callback', 'profile_loaded', {
            user: session.user.id,
            role: profileData.role,
            is_approved: isApproved,
          });
          navigate(isApproved ? '/' : '/pending-approval', { replace: true });
        } else {
          authLog('callback', 'no_session_redirect_auth');
          navigate('/auth', { replace: true });
        }
      } catch (e) {
        authError('callback', 'unexpected_error', undefined, e);
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
