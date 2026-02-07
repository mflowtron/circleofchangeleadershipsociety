import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, AccessArea, AppRole } from '@/contexts/AuthContext';
import { FullPageLoader } from '@/components/ui/circle-loader';

/**
 * Smart root router that directs users based on their roles and default preferences.
 * 
 * Logic:
 * 1. Not logged in → /auth
 * 2. Not approved → /pending-approval
 * 3. Has default_role set → redirect to that area's home
 * 4. Has only one accessible area → redirect to that area's home
 * 5. Has multiple accessible areas → show area selector
 */
export default function RootRouter() {
  const { 
    user, 
    loading, 
    isApproved, 
    defaultRole,
    accessibleAreas,
    hasLMSAccess,
    hasEMAccess,
    hasAttendeeAccess,
  } = useAuth();
  const navigate = useNavigate();

  // Helper to get home route for an area
  const getAreaHome = (area: AccessArea): string => {
    switch (area) {
      case 'lms':
        return '/lms';
      case 'em':
        return '/events/manage';
      case 'attendee':
        return '/attendee/app/home';
    }
  };

  // Helper to get home route for a specific role
  const getRoleHome = (role: AppRole): string => {
    // LMS roles
    if (['lms_student', 'lms_advisor', 'lms_admin', 'admin', 'advisor', 'student'].includes(role)) {
      return '/lms';
    }
    // EM roles
    if (['em_admin', 'em_manager', 'event_organizer'].includes(role)) {
      return '/events/manage';
    }
    if (role === 'em_advisor') {
      return '/events/my-orders';
    }
    // Attendee roles
    if (['attendee_student', 'attendee_advisor'].includes(role)) {
      return '/attendee/app/home';
    }
    return '/lms';
  };

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
    if (defaultRole) {
      navigate(getRoleHome(defaultRole), { replace: true });
      return;
    }

    // Only one accessible area
    if (accessibleAreas.length === 1) {
      navigate(getAreaHome(accessibleAreas[0]), { replace: true });
      return;
    }

    // Multiple areas - show selector
    if (accessibleAreas.length > 1) {
      navigate('/select-dashboard', { replace: true });
      return;
    }

    // Fallback: No roles assigned (shouldn't happen, but handle gracefully)
    // Default to LMS if they have access, otherwise auth
    if (hasLMSAccess) {
      navigate('/lms', { replace: true });
    } else if (hasEMAccess) {
      navigate('/events/manage', { replace: true });
    } else if (hasAttendeeAccess) {
      navigate('/attendee/app/home', { replace: true });
    } else {
      // No access at all - might be a new user without roles
      navigate('/pending-approval', { replace: true });
    }
  }, [loading, user, isApproved, defaultRole, accessibleAreas, navigate, hasLMSAccess, hasEMAccess, hasAttendeeAccess]);

  if (loading) {
    return <FullPageLoader />;
  }

  // While redirecting, show loader
  return <FullPageLoader />;
}
