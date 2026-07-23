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

export default function MobileWelcome() {
  const navigate = useNavigate();
  const [socialLoading, setSocialLoading] = useState("");

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    try {
      await signInWithGoogle();
      navigate("/mobile/chat");
    } catch (error) {
      toast.error(getGoogleSignInErrorMessage(error, "Google sign-in failed"));
    } finally {
      setSocialLoading("");
    }
  };

  return (
    <AuthPage testId="mobile-auth-welcome" mobile>
      <div className="w-full">
        <AuthHeader
          title="Get Started with BlueMind AI"
          description="Choose how you want to enter your BlueMind workspace."
        />

        <div className="space-y-4">
          <AuthButton
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            icon={socialLoading === "google" ? <BlueMindLoadingDots /> : <GoogleIcon />}
            testId="mobile-google-auth-button"
          >
            Continue with Google
          </AuthButton>
          <AuthButton
            onClick={() => toast.info("Apple sign-in is being prepared.")}
            disabled={Boolean(socialLoading)}
            icon={<AppleIcon />}
          >
            Continue with Apple
          </AuthButton>
        </div>

        <AuthDivider />

        <div className="space-y-4">
          <AuthButton onClick={() => navigate("/mobile/email")} testId="mobile-login-button">
            Login
          </AuthButton>
          <AuthButton onClick={() => navigate("/mobile/register")}>
            Create Account
          </AuthButton>
        </div>
      </div>
    </AuthPage>
  );
}
