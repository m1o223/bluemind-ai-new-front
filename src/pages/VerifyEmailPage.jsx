import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/services/api";
import { resendVerificationCode, verifyEmail } from "@/services/authService";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";
import { getPreferredAppRoute } from "@/services/navigationPreferences";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || sessionStorage.getItem("pendingVerificationEmail") || "";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errorMessage, setErrorMessage] = useState("");
  const { t } = useApp();

  const isValid = useMemo(() => email.trim() && /^\d{6}$/.test(code.trim()), [email, code]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const session = await verifyEmail(email, code);
      sessionStorage.removeItem("pendingVerificationEmail");
      toast.success(t("emailVerifiedSuccess"));
      navigate(getPreferredAppRoute(session), { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, t("verificationFailed"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || cooldown > 0) return;

    setIsResending(true);
    setErrorMessage("");

    try {
      const result = await resendVerificationCode(email);
      toast.success(result?.alreadyVerified ? t("emailAlreadyVerified") : t("verificationCodeSent"));
      setCooldown(result?.verification?.resendAvailableInSeconds || 60);
    } catch (error) {
      const retryAfter = error?.response?.data?.error?.details?.retryAfterSeconds;
      if (retryAfter) setCooldown(retryAfter);
      const message = getApiErrorMessage(error, t("couldNotResendVerificationCode"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-white flex items-center justify-center px-4 py-10" data-testid="verify-email-page">
      <button onClick={() => navigate("/auth/login")} className="absolute top-5 left-5 flex items-center gap-1.5 text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">{t("back")}</span>
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandLogo forceTheme="light" className="mx-auto mb-4" logoClassName="w-12 h-12" textClassName="text-lg text-[#111827]" />
          <h1 className="text-xl sm:text-2xl font-semibold text-[#111827]">{t("verifyEmail")}</h1>
          <p className="text-[#6B7280] text-sm mt-1.5">{t("verifyEmailSubtitle")}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#111827] mb-1.5 block">{t("email")}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("enterEmail")} className="py-5 rounded-xl" data-testid="verify-email-input" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#111827] mb-1.5 block">{t("verificationCode")}</label>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" className="py-5 rounded-xl text-center tracking-[0.35em] font-semibold" data-testid="verify-code-input" />
          </div>

          <Button type="submit" disabled={!isValid || isSubmitting} className="w-full py-5 text-sm bg-[#193B68] hover:bg-[#142f54] text-white rounded-xl font-medium disabled:opacity-50" data-testid="verify-submit-button">
            {isSubmitting ? t("verifying") : t("verifyEmailButton")}
          </Button>
        </form>

        <button type="button" onClick={handleResend} disabled={!email.trim() || cooldown > 0 || isResending} className="w-full mt-4 text-sm text-[#193B68] disabled:text-[#9CA3AF] hover:underline" data-testid="resend-code-button">
          {isResending ? t("sending") : cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendCode")}
        </button>

        {errorMessage && <p className="text-sm text-red-500 mt-4" data-testid="verify-error">{errorMessage}</p>}
      </div>
    </motion.div>
  );
}
