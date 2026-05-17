import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FullPageLoader } from "@/components/ui/circle-loader";
import { authLog } from "@/utils/authLog";

/**
 * Smart root router. Society/LMS-only:
 * - Not logged in → /auth
 * - Not approved → /pending-approval
 * - Otherwise → /lms
 */
export default function RootRouter() {
  const { user, loading, isApproved, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      authLog("routing", "waiting_for_auth");
      return;
    }
    if (!user) {
      authLog("routing", "redirect_auth", { reason: "no_user" });
      navigate("/auth", { replace: true });
      return;
    }
    if (!isApproved) {
      authLog("routing", "redirect_pending", {
        user: user.id,
        is_approved: isApproved,
        has_profile: !!profile,
        role: profile?.role,
      });
      navigate("/pending-approval", { replace: true });
      return;
    }
    authLog("routing", "redirect_lms", {
      user: user.id,
      role: profile?.role,
    });
    navigate("/lms", { replace: true });
  }, [loading, user, isApproved, profile, navigate]);

  return <FullPageLoader />;
}
