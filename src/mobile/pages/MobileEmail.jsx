import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, loginUser, signInWithGoogle } from "@/services/authService";

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

function LoadingSpinner({ className = "border-[var(--bm-text-muted)]/30 border-t-[var(--bm-primary)]" }) {
  return <span className={`h-4 w-4 animate-spin rounded-full border-2 ${className}`} />;
}

export default function MobileEmail() {
  const navigate = useNavigate();
  const { resolvedTheme, t } = useApp();
  const isDark = resolvedTheme === "dark";
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  const isFormValid = formData.email.trim() && formData.password.trim();
  const surfaceColor = isDark ? "var(--bm-bg-app)" : "var(--bm-bg-app)";
  const textColor = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const mutedText = isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]";
  const inputClass = "font-semibold";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      await loginUser(formData.email, formData.password);
      toast.success(t("welcomeBackToast"));
      navigate("/mobile/chat");
    } catch (error) {
      const message = getApiErrorMessage(error, t("loginFailed"));
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
      data-testid="mobile-login-page"
    >
      <section className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-6 py-5">
        <button
          type="button"
          onClick={() => navigate("/mobile")}
          className={`mb-7 inline-flex h-11 items-center gap-2 self-start rounded-full px-3 text-sm font-semibold transition-colors ${
            isDark ? "bg-white/[0.06] text-white" : "bg-white text-[var(--bm-text-primary)] shadow-sm"
          }`}
          aria-label={t("back")}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>{t("back")}</span>
        </button>

        <div className="mb-8 text-center">
          <BrandLogo showName={false} logoClassName="mx-auto h-16 w-16" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">{t("welcomeBack")}</h1>
          <p className={`mt-2 text-sm font-medium ${mutedText}`}>{t("signInSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                data-testid="mobile-email-input"
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
                placeholder={t("enterPassword")}
                className={`h-[52px] rounded-2xl !pl-[56px] !pr-[52px] text-[15px] ${inputClass}`}
                data-testid="mobile-password-input"
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
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className={`flex items-center gap-2 text-sm ${mutedText}`}>
              <Checkbox
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                className="border-[var(--bm-border)] data-[state=checked]:border-[var(--bm-primary)] data-[state=checked]:bg-[var(--bm-primary)]"
              />
              <span>{t("rememberMe")}</span>
            </label>
            <button
              type="button"
              onClick={() => navigate("/auth/forgot-password")}
              className="text-sm font-semibold text-[var(--bm-primary)]"
            >
              {t("forgotPassword")}
            </button>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="h-[52px] w-full rounded-2xl text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--bluemind-app-color, var(--bm-primary))" }}
            data-testid="mobile-login-submit-button"
          >
            {isLoading ? <LoadingSpinner className="border-white/30 border-t-white" /> : t("signIn")}
          </Button>

          {errorMessage && (
            <p className="text-sm font-medium text-red-500" data-testid="mobile-login-error">
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
            data-testid="mobile-google-login"
          >
            {socialLoading === "google" ? <LoadingSpinner /> : <GoogleIcon />}
            <span>{t("google")}</span>
          </button>
        </div>

        <p className={`mt-7 text-center text-sm ${mutedText}`}>
          {t("noAccount")}{" "}
          <button type="button" onClick={() => navigate("/mobile/register")} className="font-semibold text-[var(--bm-primary)]">
            {t("createOne")}
          </button>
        </p>
      </section>
    </motion.main>
  );
}
