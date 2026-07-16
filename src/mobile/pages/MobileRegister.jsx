import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";

import BrandLogo from "@/components/BrandLogo";
import BlueMindAnimatedBackground from "@/components/BlueMindAnimatedBackground";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { ACTION_ERROR_HOLD_MS, waitForActionFeedback } from "@/lib/actionFeedback";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, registerUser, signInWithGoogle } from "@/services/authService";

function GoogleIcon() {
  return (
    <img
      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      alt=""
      aria-hidden="true"
      className="h-5 w-5"
    />
  );
}

export default function MobileRegister() {
  const navigate = useNavigate();
  const { resolvedTheme, t } = useApp();
  const isDark = resolvedTheme === "dark";
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionState, setActionState] = useState("");
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const passwordRequirements = [
    { label: t("atLeast8"), met: formData.password.length >= 8 },
    { label: t("includeNumber"), met: /\d/.test(formData.password) },
    { label: t("includeUppercase"), met: /[A-Z]/.test(formData.password) },
  ];

  const isFormValid =
    formData.fullName.trim() &&
    formData.email.trim() &&
    formData.password.length >= 8;
  const surfaceColor = isDark ? "var(--bm-bg-app)" : "var(--bm-bg-app)";
  const textColor = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const mutedText = isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]";
  const inputClass = "font-semibold";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setActionState("processing");
    setErrorMessage("");

    try {
      const result = await registerUser(formData.fullName, formData.email, formData.password);
      toast.success(t("accountCreatedCheckEmail"));
      sessionStorage.setItem("pendingVerificationEmail", result?.user?.email || formData.email);
      setActionState("success");
      await waitForActionFeedback();
      navigate(`/auth/verify-email?email=${encodeURIComponent(result?.user?.email || formData.email)}`);
    } catch (error) {
      const message = getApiErrorMessage(error, t("registrationFailed"));
      setActionState("error");
      await waitForActionFeedback(ACTION_ERROR_HOLD_MS);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setActionState("");
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    setErrorMessage("");
    try {
      await signInWithGoogle();
      toast.success(t("welcomeBackToast"));
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
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 overflow-y-auto ${textColor}`}
      style={{
        backgroundColor: surfaceColor,
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      data-testid="mobile-register-page"
    >
      <BlueMindAnimatedBackground />
      <section className="relative z-10 mx-auto flex min-h-full w-full max-w-[430px] flex-col px-6 py-5">
        <button
          type="button"
          onClick={() => navigate("/mobile/email")}
          className={`mb-6 inline-flex h-11 items-center gap-2 self-start rounded-full px-3 text-sm font-semibold transition-colors ${
            isDark ? "bg-white/[0.06] text-white" : "bg-white text-[var(--bm-text-primary)] shadow-sm"
          }`}
          aria-label={t("back")}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>{t("back")}</span>
        </button>

        <div className="mb-7 text-center">
          <BrandLogo showName={false} logoClassName="mx-auto h-16 w-16" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">{t("createAccount")}</h1>
          <p className={`mt-2 text-sm font-medium ${mutedText}`}>{t("createAccountSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{t("fullName")}</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--bm-text-muted)]" />
              <Input
                type="text"
                value={formData.fullName}
                onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                placeholder={t("enterFullName")}
                className={`h-[52px] rounded-2xl !pl-[56px] text-[15px] ${inputClass}`}
                data-testid="mobile-fullname-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">{t("email")}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--bm-text-muted)]" />
              <Input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder={t("enterEmail")}
                className={`h-[52px] rounded-2xl !pl-[56px] text-[15px] ${inputClass}`}
                data-testid="mobile-register-email-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">{t("password")}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--bm-text-muted)]" />
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                placeholder={t("createPassword")}
                className={`h-[52px] rounded-2xl !pl-[56px] !pr-[52px] text-[15px] ${inputClass}`}
                data-testid="mobile-register-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--bm-text-muted)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {passwordRequirements.map((requirement) => (
                <div key={requirement.label} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors",
                      requirement.met ? "border-[var(--bm-primary)] bg-[var(--bm-primary)]" : "border-[var(--bm-border-strong)]"
                    )}
                  >
                    {requirement.met && <Check className="h-2 w-2 text-white" />}
                  </div>
                  <span className={cn(
                    "text-[13px] font-semibold",
                    requirement.met ? textColor : isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-primary)]"
                  )}>
                    {requirement.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            actionState={actionState}
            className="h-[52px] w-full rounded-2xl text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--bluemind-app-color, var(--bm-primary))" }}
            data-testid="mobile-register-submit-button"
          >
            {isLoading ? t("creating") : t("createAccountButton")}
          </Button>

          {errorMessage && (
            <p className="text-sm font-medium text-red-500" data-testid="mobile-register-error">
              {errorMessage}
            </p>
          )}
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className={isDark ? "h-px flex-1 bg-white/[0.1]" : "h-px flex-1 bg-[var(--bm-border)]"} />
          <span className="text-xs font-medium text-[var(--bm-text-muted)]">{t("orContinueWith")}</span>
          <div className={isDark ? "h-px flex-1 bg-white/[0.1]" : "h-px flex-1 bg-[var(--bm-border)]"} />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[var(--bm-border)] bg-white text-[15px] font-semibold text-[var(--bm-text-primary)] shadow-sm transition-colors disabled:opacity-70"
            data-testid="mobile-register-google-login"
          >
            {socialLoading === "google" ? <BlueMindLoadingDots className="text-[var(--bm-primary)]" /> : <GoogleIcon />}
            <span>{t("google")}</span>
          </button>
        </div>

        <p className={`mt-7 text-center text-sm ${mutedText}`}>
          {t("alreadyHaveAccount")}{" "}
          <button type="button" onClick={() => navigate("/mobile/email")} className="font-semibold text-[var(--bm-primary)]">
            {t("signIn")}
          </button>
        </p>
      </section>
    </motion.main>
  );
}
