import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import {
  AppleIcon,
  AuthButton,
  AuthDivider,
  AuthHeader,
  AuthPage,
  GoogleIcon,
} from "@/components/auth/AuthPrimitives";
import { getGoogleSignInErrorMessage, signInWithGoogle } from "@/services/authService";
import { useApp } from "@/context/AppContext";

export default function MobileWelcome() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [socialLoading, setSocialLoading] = useState("");

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    try {
      await signInWithGoogle();
      navigate("/mobile/chat");
    } catch (error) {
      toast.error(getGoogleSignInErrorMessage(error, t("googleSignInFailed")));
    } finally {
      setSocialLoading("");
    }
  };

  return (
    <AuthPage testId="mobile-auth-welcome" mobile>
      <div className="w-full">
        <AuthHeader
          title={t("welcomeToBlueMind")}
          description={t("authSelectionSubtitle")}
        />

        <div className="space-y-4">
          <AuthButton
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            icon={socialLoading === "google" ? <BlueMindLoadingDots /> : <GoogleIcon />}
            testId="mobile-google-auth-button"
          >
            {t("orContinueWith")} {t("google")}
          </AuthButton>
          <AuthButton
            onClick={() => toast.info("Apple sign-in is being prepared.")}
            disabled={Boolean(socialLoading)}
            icon={<AppleIcon />}
          >
            {t("orContinueWith")} {t("apple")}
          </AuthButton>
        </div>

        <AuthDivider />

        <div className="space-y-4">
          <AuthButton onClick={() => navigate("/mobile/email")} testId="mobile-login-button">
            {t("signIn")}
          </AuthButton>
          <AuthButton onClick={() => navigate("/mobile/register")}>
            {t("createAccountButton")}
          </AuthButton>
        </div>
      </div>
    </AuthPage>
  );
}
