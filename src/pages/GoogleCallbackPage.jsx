import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { restoreSession } from "@/services/authService";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";
import { getPreferredAppRoute } from "@/services/navigationPreferences";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { t } = useApp();

  useEffect(() => {
    restoreSession()
      .then((session) => {
        toast.success(t("signedInWithGoogle"));
        navigate(getPreferredAppRoute(session), { replace: true });
      })
      .catch(() => {
        toast.error(t("googleSignInFailed"));
        navigate("/auth/login", { replace: true });
      });
  }, [navigate, t]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white flex items-center justify-center"
      data-testid="google-callback-page"
    >
      <div className="text-center">
        <BrandLogo forceTheme="light" className="mx-auto mb-4" logoClassName="w-12 h-12" textClassName="text-lg text-[var(--bm-text-primary)]" />
        <p className="text-sm text-[var(--bm-text-secondary)]">{t("finishingGoogleSignIn")}</p>
      </div>
    </motion.div>
  );
}
