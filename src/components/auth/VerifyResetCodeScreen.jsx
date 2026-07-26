import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/services/api";
import { requestPasswordReset, verifyPasswordResetCode } from "@/services/authService";
import {
  readPasswordResetEmail,
  storePasswordResetEmail,
  storePasswordResetSession,
} from "@/services/passwordResetSession";
import { useApp } from "@/context/AppContext";
import {
  AuthBackButton,
  AuthError,
  AuthHeader,
  AuthPage,
  ResetCodeOtpInput,
} from "@/components/auth/AuthPrimitives";

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function parseLockedError(error) {
  const apiError = error?.response?.data?.error || error?.error;
  return {
    locked: apiError?.code === "PASSWORD_RESET_RESEND_LOCKED",
    retryAfterSeconds: apiError?.details?.retryAfterSeconds || 0,
    maxResendAttempts: apiError?.details?.maxResendAttempts || 3,
  };
}

export default function VerifyResetCodeScreen({
  mobile = false,
  forgotPath,
  resetPath,
  testId,
}) {
  const navigate = useNavigate();
  const { t } = useApp();
  const [searchParams] = useSearchParams();
  const email = useMemo(
    () => searchParams.get("email") || readPasswordResetEmail(),
    [searchParams]
  );
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [maxResendAttempts, setMaxResendAttempts] = useState(3);
  const [lockedMessage, setLockedMessage] = useState("");
  const verifiedCodeRef = useRef("");

  useEffect(() => {
    if (!email) {
      navigate(forgotPath, { replace: true });
      return;
    }

    storePasswordResetEmail(email);
  }, [email, forgotPath, navigate]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!email || code.length !== 6 || isVerifying || verifiedCodeRef.current === code) {
      return;
    }

    let active = true;
    verifiedCodeRef.current = code;
    setIsVerifying(true);
    setErrorMessage("");

    verifyPasswordResetCode(email, code)
      .then((result) => {
        if (!active) return;
        storePasswordResetSession({
          email,
          resetToken: result.resetToken,
          expiresAt: result.expiresAt,
        });
        navigate(resetPath, { replace: true });
      })
      .catch((error) => {
        if (!active) return;
        const message = getApiErrorMessage(error, t("invalidOrExpiredResetCode"));
        setErrorMessage(message);
        setCode("");
        verifiedCodeRef.current = "";
        toast.error(message);
      })
      .finally(() => {
        if (active) {
          setIsVerifying(false);
        }
      });

    return () => {
      active = false;
    };
  }, [code, email, isVerifying, navigate, resetPath, t]);

  const resendDisabled = isResending || cooldownSeconds > 0 || Boolean(lockedMessage) || resendAttempts >= maxResendAttempts;

  const handleResend = async () => {
    if (!email || resendDisabled) return;

    setIsResending(true);
    setErrorMessage("");

    try {
      const result = await requestPasswordReset(email);
      const reset = result?.reset || {};
      const nextAttempts = reset.resendAttempts ?? resendAttempts + 1;
      const nextMax = reset.maxResendAttempts ?? maxResendAttempts;
      setCode("");
      verifiedCodeRef.current = "";
      setCooldownSeconds(reset.resendAvailableInSeconds || 60);
      setResendAttempts(nextAttempts);
      setMaxResendAttempts(nextMax);

      if (reset.lockedForSeconds > 0 || nextAttempts >= nextMax) {
        setLockedMessage(t("tooManyResetAttempts"));
      }

      toast.success(t("resetCodeSent"));
    } catch (error) {
      const locked = parseLockedError(error);
      if (locked.locked) {
        setMaxResendAttempts(locked.maxResendAttempts);
        setResendAttempts(locked.maxResendAttempts);
        setCooldownSeconds(locked.retryAfterSeconds);
        setLockedMessage(t("tooManyResetAttempts"));
      }

      const message = getApiErrorMessage(error, t("couldNotResendResetCode"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthPage testId={testId} mobile={mobile}>
      <AuthBackButton onClick={() => navigate(forgotPath)} label={t("back")} />

      <section className="w-full space-y-6">
        <AuthHeader
          title={t("verifyResetCode")}
          description={t("verifyResetCodeSubtitle")}
        />

        <ResetCodeOtpInput
          value={code}
          onChange={setCode}
          disabled={isVerifying}
          testId={`${testId}-otp`}
        />

        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-white/52">{t("didntReceiveCode")}</p>
          {lockedMessage ? (
            <p className="text-sm font-semibold text-red-400">{lockedMessage}</p>
          ) : cooldownSeconds > 0 ? (
            <p className="text-sm font-semibold text-white/72">{formatTimer(cooldownSeconds)}</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendDisabled}
              className="text-sm font-semibold text-white underline underline-offset-4 transition disabled:cursor-not-allowed disabled:text-white/30"
            >
              {isResending ? t("sending") : t("resendCodeShort")}
            </button>
          )}
          <p className="text-xs font-semibold text-white/36">
            {t("resetResendAttempt", { current: resendAttempts, total: maxResendAttempts })}
          </p>
        </div>

        {isVerifying ? (
          <p className="text-center text-sm font-semibold text-white/56">{t("verifying")}</p>
        ) : null}

        <AuthError testId={`${testId}-error`}>{errorMessage}</AuthError>
      </section>
    </AuthPage>
  );
}
