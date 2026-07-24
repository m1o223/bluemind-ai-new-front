import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  AuthBackButton,
  AuthButton,
  AuthError,
  AuthHeader,
  AuthInput,
  AuthPage,
} from "@/components/auth/AuthPrimitives";
import { getApiErrorMessage } from "@/services/api";
import { resetPassword } from "@/services/authService";
import { useApp } from "@/context/AppContext";

export default function MobileResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useApp();
  const [formData, setFormData] = useState({
    email: searchParams.get("email") || "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isValid = useMemo(() => (
    formData.email.trim() &&
    /^\d{6}$/.test(formData.code.trim()) &&
    formData.password.length >= 8 &&
    /[A-Z]/.test(formData.password) &&
    /\d/.test(formData.password) &&
    formData.password === formData.confirmPassword
  ), [formData]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await resetPassword(formData.email, formData.code, formData.password);
      toast.success(t("passwordResetSuccess"));
      navigate("/mobile/email", { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, t("couldNotResetPassword"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPage testId="mobile-reset-password-page" mobile>
      <AuthBackButton onClick={() => navigate("/mobile/forgot-password")} label={t("back")} />

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <AuthHeader
          title={t("resetPassword")}
          description={t("resetPasswordSubtitle")}
        />

        <AuthInput
          label={t("email")}
          type="email"
          value={formData.email}
          onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          placeholder="example@email.com"
          autoComplete="email"
          testId="mobile-reset-email-input"
        />

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-white/74">{t("resetCode")}</span>
          <input
            value={formData.code}
            onChange={(event) => setFormData({
              ...formData,
              code: event.target.value.replace(/\D/g, "").slice(0, 6),
            })}
            inputMode="numeric"
            placeholder="000000"
            data-testid="mobile-reset-code-input"
            className="h-[58px] w-full rounded-[29px] border border-white/[0.075] bg-white/[0.09] px-6 text-center text-base font-semibold tracking-[0.35em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_42px_rgba(0,0,0,0.20)] outline-none backdrop-blur-[24px] transition placeholder:text-white/34 focus:border-white/[0.16] focus:bg-white/[0.13] focus:ring-2 focus:ring-white/[0.06]"
            autoComplete="one-time-code"
          />
        </label>

        <AuthInput
          label={t("newPassword")}
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
          placeholder="Enter your password"
          autoComplete="new-password"
          testId="mobile-reset-password-input"
          showPasswordToggle
          passwordVisible={showPassword}
          onTogglePassword={() => setShowPassword((value) => !value)}
        />
        <AuthInput
          label={t("confirmNewPassword")}
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
          placeholder="Confirm your password"
          autoComplete="new-password"
          testId="mobile-reset-confirm-password-input"
          showPasswordToggle
          passwordVisible={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword((value) => !value)}
        />

        <AuthButton
          type="submit"
          variant="primary"
          disabled={!isValid || isLoading}
          testId="mobile-reset-submit-button"
        >
          {isLoading ? t("resetting") : t("resetPassword")}
        </AuthButton>

        <AuthError testId="mobile-reset-error">{errorMessage}</AuthError>
      </form>
    </AuthPage>
  );
}
