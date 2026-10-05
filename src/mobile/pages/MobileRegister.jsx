import { useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  PasswordChecklist,
} from "@/components/auth/AuthPrimitives";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, registerUser, signInWithGoogle } from "@/services/authService";
import { useApp } from "@/context/AppContext";

function getDisplayNameFromEmail(email) {
  return email.split("@")[0]?.trim() || "BlueMind User";
}

export default function MobileRegister() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const useIOSAuthPolish = Capacitor.getPlatform() === "ios";

  const requirements = useMemo(() => [
    { label: t("minimum8Characters"), met: formData.password.length >= 8 },
    { label: t("oneUppercaseLetter"), met: /[A-Z]/.test(formData.password) },
    { label: t("oneLowercaseLetter"), met: /[a-z]/.test(formData.password) },
    { label: t("oneNumber"), met: /\d/.test(formData.password) },
    { label: t("oneSpecialCharacter"), met: /[^A-Za-z0-9]/.test(formData.password) },
  ], [formData.password, t]);

  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const isFormValid =
    formData.email.trim() &&
    passwordsMatch &&
    requirements.every((requirement) => requirement.met);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await registerUser(
        getDisplayNameFromEmail(formData.email),
        formData.email,
        formData.password,
      );
      sessionStorage.setItem("pendingVerificationEmail", result?.user?.email || formData.email);
      navigate(`/auth/verify-email?email=${encodeURIComponent(result?.user?.email || formData.email)}`);
    } catch (error) {
      const message = getApiErrorMessage(error, t("registrationFailed"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
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
    <AuthPage testId="mobile-register-page" mobile>
      <AuthBackButton onClick={() => navigate("/mobile")} label={t("back")} />

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <AuthHeader title={t("createAccountButton")} description={t("createAccountSubtitle")} />

        <AuthInput
          label={t("email")}
          type="email"
          value={formData.email}
          onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          placeholder="example@email.com"
          autoComplete="email"
          icon="email"
          testId="mobile-register-email-input"
        />
        <AuthInput
          label={t("password")}
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
          placeholder={t("createPassword")}
          autoComplete="new-password"
          icon="password"
          testId="mobile-register-password-input"
          showPasswordToggle
          passwordVisible={showPassword}
          onTogglePassword={() => setShowPassword((value) => !value)}
        />
        <AuthInput
          label={t("confirmNewPassword")}
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
          placeholder={t("confirmNewPassword")}
          autoComplete="new-password"
          icon={useIOSAuthPolish ? "confirmPassword" : "password"}
          showPasswordToggle
          passwordVisible={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword((value) => !value)}
        />

        <PasswordChecklist
          requirements={[
            ...requirements,
            { label: t("passwordsMatch"), met: Boolean(passwordsMatch) },
          ]}
        />

        <AuthButton
          type="submit"
          variant="primary"
          disabled={!isFormValid || isLoading}
          testId="mobile-register-submit-button"
          loading={useIOSAuthPolish && isLoading}
        >
          {isLoading && !useIOSAuthPolish ? t("creating") : t("createAccountButton")}
        </AuthButton>

        <AuthError testId="mobile-register-error">{errorMessage}</AuthError>

        <p className="text-center text-sm font-medium text-white/48">
          {t("alreadyHaveAccount")}{" "}
          <button
            type="button"
            onClick={() => navigate("/mobile/email")}
            className="font-semibold text-white underline underline-offset-4 transition hover:text-white/72"
          >
            {t("signIn")}
          </button>
        </p>

        <AuthDivider />

        <div className="space-y-4">
          <AuthButton
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            icon={socialLoading === "google" ? <BlueMindLoadingDots /> : <GoogleIcon />}
            testId="mobile-register-google-login"
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
