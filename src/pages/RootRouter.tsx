import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FullPageLoader } from '@/components/ui/circle-loader';

/**
 * Smart root router that directs users based on their roles and default preferences.
 * 
 * Logic:
 * 1. Not logged in → /auth
 * 2. Not approved → /pending-approval
 * 3. Has default_role set → redirect to that area's home
 * 4. Has LMS access → go to LMS
 * 5. Has events access → go to events
 * 6. Otherwise → pending approval
 */
export default function RootRouter() {
  const { 
    user, 
    loading, 
    isApproved, 
    profile,
    hasModuleAccess,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Not logged in
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Not approved
    if (!isApproved) {
      navigate('/pending-approval', { replace: true });
      return;
    }

    // Has a default role preference
    if (profile?.default_role) {
      const defaultRole = profile.default_role;
      if (defaultRole.includes('lms')) {
        navigate('/lms', { replace: true });
        return;
      }
      if (defaultRole.includes('events')) {
        navigate('/events/manage', { replace: true });
        return;
      }
      if (defaultRole.includes('attendee')) {
        navigate('/attendee/app/home', { replace: true });
        return;
      }
    }

    // Determine accessible areas
    const hasLMS = hasModuleAccess('lms');
    const hasEvents = hasModuleAccess('events');

    // Count accessible areas
    const accessCount = (hasLMS ? 1 : 0) + (hasEvents ? 1 : 0) + 1; // +1 for attendee (always available)

    // Multiple areas - show selector
    if (accessCount > 1) {
      navigate('/select-dashboard', { replace: true });
      return;
    }

    // Single area - go directly
    if (hasLMS) {
      navigate('/lms', { replace: true });
    } else if (hasEvents) {
      navigate('/events/manage', { replace: true });
    } else {
      // Default to attendee app
      navigate('/attendee/app/home', { replace: true });
    }
  }, [loading, user, isApproved, profile, navigate, hasModuleAccess]);

  if (loading) {
    return <FullPageLoader />;
  }

  // While redirecting, show loader
  return <FullPageLoader />;
}
