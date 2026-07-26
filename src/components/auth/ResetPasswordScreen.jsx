import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/services/api";
import { resetPassword } from "@/services/authService";
import {
  clearPasswordResetSession,
  readPasswordResetSession,
} from "@/services/passwordResetSession";
import { useApp } from "@/context/AppContext";
import {
  AuthBackButton,
  AuthButton,
  AuthError,
  AuthHeader,
  AuthInput,
  AuthPage,
  PasswordChecklist,
} from "@/components/auth/AuthPrimitives";

export default function ResetPasswordScreen({
  mobile = false,
  verifyPath,
  loginPath,
  testId,
}) {
  const navigate = useNavigate();
  const { t } = useApp();
  const resetSession = useMemo(() => readPasswordResetSession(), []);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!resetSession) {
      navigate(verifyPath, { replace: true });
    }
  }, [navigate, resetSession, verifyPath]);

  const requirements = useMemo(() => [
    { label: t("minimum8Characters"), met: formData.password.length >= 8 },
    { label: t("oneUppercaseLetter"), met: /[A-Z]/.test(formData.password) },
    { label: t("oneLowercaseLetter"), met: /[a-z]/.test(formData.password) },
    { label: t("oneNumber"), met: /\d/.test(formData.password) },
    {
      label: t("passwordsMatch"),
      met: Boolean(formData.password) && formData.password === formData.confirmPassword,
    },
  ], [formData.password, formData.confirmPassword, t]);

  const isValid = requirements.every((requirement) => requirement.met);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValid || !resetSession) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await resetPassword({
        email: resetSession.email,
        resetToken: resetSession.resetToken,
        password: formData.password,
      });
      clearPasswordResetSession();
      toast.success(t("passwordResetSuccess"));
      navigate(loginPath, { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, t("couldNotResetPassword"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!resetSession) {
    return null;
  }

  return (
    <AuthPage testId={testId} mobile={mobile}>
      <AuthBackButton onClick={() => navigate(verifyPath)} label={t("back")} />

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <AuthHeader
          title={t("resetPassword")}
          description={t("chooseNewSecurePassword")}
        />

        <AuthInput
          label={t("newPassword")}
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
          placeholder={t("enterNewPassword")}
          autoComplete="new-password"
          testId={`${testId}-password-input`}
          showPasswordToggle
          passwordVisible={showPassword}
          onTogglePassword={() => setShowPassword((value) => !value)}
        />

        <AuthInput
          label={t("confirmNewPassword")}
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
          placeholder={t("confirmYourNewPassword")}
          autoComplete="new-password"
          testId={`${testId}-confirm-password-input`}
          showPasswordToggle
          passwordVisible={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword((value) => !value)}
        />

        <PasswordChecklist requirements={requirements} />

        <AuthButton
          type="submit"
          variant="primary"
          disabled={!isValid || isLoading}
          testId={`${testId}-submit-button`}
        >
          {isLoading ? t("resetting") : t("resetPassword")}
        </AuthButton>

        <AuthError testId={`${testId}-error`}>{errorMessage}</AuthError>
      </form>
    </AuthPage>
  );
}
