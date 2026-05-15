import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FullPageLoader } from '@/components/ui/circle-loader';

/**
 * Smart root router. Society (LMS) is the only app surface.
 *  - Not logged in → /auth
 *  - Not approved → /pending-approval
 *  - Approved → /lms
 */
export default function RootRouter() {
  const { user, loading, isApproved } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!isApproved) {
      navigate('/pending-approval', { replace: true });
      return;
    }
    navigate('/lms', { replace: true });
  }, [loading, user, isApproved, navigate]);

  return <FullPageLoader />;
}
