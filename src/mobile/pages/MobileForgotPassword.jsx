import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { requestPasswordReset } from "@/services/authService";
import { useApp } from "@/context/AppContext";

export default function MobileForgotPassword() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await requestPasswordReset(trimmedEmail);
      toast.success(t("resetCodeSent"));
      navigate(`/mobile/reset-password?email=${encodeURIComponent(trimmedEmail)}`);
    } catch (error) {
      const message = getApiErrorMessage(error, t("couldNotRequestPasswordReset"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPage testId="mobile-forgot-password-page" mobile>
      <AuthBackButton onClick={() => navigate("/mobile/email")} label={t("back")} />

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <AuthHeader
          title={t("forgotPasswordTitle")}
          description={t("forgotPasswordSubtitle")}
        />

        <AuthInput
          label={t("email")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@email.com"
          autoComplete="email"
          testId="mobile-forgot-email-input"
        />

        <AuthButton
          type="submit"
          variant="primary"
          disabled={!email.trim() || isLoading}
          testId="mobile-forgot-submit-button"
        >
          {isLoading ? t("sending") : t("sendResetCode")}
        </AuthButton>

        <AuthError testId="mobile-forgot-error">{errorMessage}</AuthError>
      </form>
    </AuthPage>
  );
}
