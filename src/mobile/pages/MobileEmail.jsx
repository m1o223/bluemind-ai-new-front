import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CircleHelp } from "lucide-react";

import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import {
  AppleIcon,
  AuthBackButton,
  AuthButton,
  AuthDivider,
  AuthError,
  AuthHeader,
  AuthInput,
  AuthPage,
  GoogleIcon,
} from "@/components/auth/AuthPrimitives";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, loginUser, signInWithGoogle } from "@/services/authService";
import { useApp } from "@/context/AppContext";

export default function MobileEmail() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const loginRequestRef = useRef(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isFormValid = formData.email.trim() && formData.password.trim();
  const useIOSAuthPolish = Capacitor.getPlatform() === "ios";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid || loginRequestRef.current) return;
    loginRequestRef.current = true;
    setIsLoading(true);
    setLoginSucceeded(false);
    setErrorMessage("");
    try {
      await loginUser(formData.email, formData.password);
      if (useIOSAuthPolish) {
        setLoginSucceeded(true);
        await new Promise((resolve) => window.setTimeout(resolve, 220));
      }
      navigate("/mobile/chat");
    } catch (error) {
      setLoginSucceeded(false);
      const message = getApiErrorMessage(error, t("loginFailed"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      loginRequestRef.current = false;
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    setErrorMessage("");
    try {
      await signInWithGoogle();
      navigate("/mobile/chat");
    } catch (error) {
      const message = getGoogleSignInErrorMessage(error, t("googleSignInFailed"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSocialLoading("");
    }
  };

  return (
    <AuthPage testId="mobile-login-page" mobile>
      <AuthBackButton onClick={() => navigate("/mobile")} label={t("back")} />

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <AuthHeader title={t("signIn")} description={t("signInSubtitle")} />

        <AuthInput
          label={t("email")}
          type="email"
          value={formData.email}
          onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          placeholder="example@email.com"
          autoComplete="email"
          testId="mobile-email-input"
        />
        <AuthInput
          label={t("password")}
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
          placeholder={t("enterPassword")}
          autoComplete="current-password"
          testId="mobile-password-input"
          showPasswordToggle
          passwordVisible={showPassword}
          onTogglePassword={() => setShowPassword((value) => !value)}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/mobile/forgot-password")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/54 underline underline-offset-4 transition hover:text-white/80"
          >
            <CircleHelp className="h-3.5 w-3.5" />
            {t("forgotPassword")}
          </button>
        </div>

        <AuthButton
          type="submit"
          variant="primary"
          disabled={!isFormValid || isLoading}
          testId="mobile-login-submit-button"
          loading={useIOSAuthPolish && isLoading && !loginSucceeded}
          loadingAsset="/bluemind-logo-white.png"
          continuousLoadingRotation
          success={useIOSAuthPolish && loginSucceeded}
        >
          {isLoading && !useIOSAuthPolish ? t("signingIn") : t("signIn")}
        </AuthButton>

        <AuthError testId="mobile-login-error">{errorMessage}</AuthError>

        <p className="text-center text-sm font-medium text-white/48">
          {t("noAccount")}{" "}
          <button
            type="button"
            onClick={() => navigate("/mobile/register")}
            className="font-semibold text-white underline underline-offset-4 transition hover:text-white/72"
          >
            {t("createAccountButton")}
          </button>
        </p>

        <AuthDivider />

        <div className="space-y-4">
          <AuthButton
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            icon={socialLoading === "google" ? <BlueMindLoadingDots /> : <GoogleIcon />}
            testId="mobile-google-login"
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
      </form>
    </AuthPage>
  );
}
