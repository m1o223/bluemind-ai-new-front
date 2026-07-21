import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import BlueMindAnimatedBackground from "@/components/BlueMindAnimatedBackground";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { ACTION_ERROR_HOLD_MS, waitForActionFeedback } from "@/lib/actionFeedback";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, loginUser, signInWithGoogle } from "@/services/authService";

function GoogleIcon() {
  return (
    <img
      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      alt=""
      aria-hidden="true"
      className="h-6 w-6"
    />
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M16.18 12.62c-.03-2.75 2.25-4.08 2.35-4.14-1.29-1.88-3.28-2.14-3.97-2.17-1.67-.17-3.29 1-4.14 1-.87 0-2.18-.98-3.6-.95-1.83.03-3.54 1.09-4.48 2.74-1.94 3.36-.49 8.3 1.36 11.02.93 1.33 2.02 2.82 3.43 2.77 1.38-.06 1.9-.89 3.57-.89 1.65 0 2.14.89 3.59.86 1.49-.03 2.43-1.34 3.32-2.68 1.08-1.54 1.51-3.06 1.53-3.14-.03-.01-2.93-1.12-2.96-4.42ZM13.47 4.54c.74-.92 1.24-2.17 1.1-3.43-1.07.05-2.41.74-3.18 1.63-.69.79-1.31 2.09-1.15 3.31 1.21.09 2.46-.61 3.23-1.51Z" />
    </svg>
  );
}

function SocialButton({ children, icon, onClick, disabled, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-[60px] w-full items-center justify-center rounded-[30px] bg-white px-6 text-xl font-semibold text-black transition duration-150 hover:bg-white/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#121923] active:scale-[0.985] disabled:opacity-60"
      data-testid={testId}
    >
      <span className="absolute left-6 flex h-6 w-6 items-center justify-center text-black">{icon}</span>
      <span className="px-8 text-center leading-none">{children}</span>
    </button>
  );
}

export default function MobileEmail() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionState, setActionState] = useState("");
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  const isFormValid = formData.email.trim() && formData.password.trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setActionState("processing");
    setErrorMessage("");

    try {
      await loginUser(formData.email, formData.password);
      toast.success(t("welcomeBackToast"));
      setActionState("success");
      await waitForActionFeedback();
      navigate("/mobile/chat");
    } catch (error) {
      const message = getApiErrorMessage(error, t("loginFailed"));
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
      className="fixed inset-0 overflow-y-auto bg-[#0b315e] text-white"
      style={{
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      data-testid="mobile-login-page"
    >
      <BlueMindAnimatedBackground />
      <section className="relative z-10 mx-auto flex min-h-full w-full max-w-[430px] flex-col">
        <div className="relative min-h-[35dvh] flex-1">
          <button
            type="button"
            onClick={() => navigate("/mobile")}
            className="absolute left-5 top-4 inline-flex h-10 items-center gap-1 rounded-full bg-white/16 px-4 text-sm font-bold text-white transition duration-150 hover:bg-white/22 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
            style={{ marginTop: "env(safe-area-inset-top)" }}
            aria-label="Back"
          >
            <span>Back</span>
            <ArrowRight className="h-4 w-4 stroke-[2.4]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 mx-auto mb-5 w-[92%] rounded-[40px] bg-[#121923] px-7 py-7 text-white">
          <SocialButton
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            testId="mobile-google-login"
            icon={socialLoading === "google" ? <BlueMindLoadingDots className="text-black" /> : <GoogleIcon />}
          >
            Continue with Google
          </SocialButton>

          <div className="h-4" />

          <SocialButton
            onClick={() => toast.info("Apple sign-in is being prepared.")}
            disabled={Boolean(socialLoading)}
            testId="mobile-apple-login"
            icon={<AppleLogo />}
          >
            Continue with Apple
          </SocialButton>

          <div className="flex items-center gap-4 py-6" aria-hidden="true">
            <div className="h-px flex-1 bg-white/16" />
            <span className="text-sm font-semibold text-white/62">or</span>
            <div className="h-px flex-1 bg-white/16" />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">{t("welcomeBack")}</h1>
            <p className="mt-2 text-lg font-medium text-white/62">{t("signInSubtitle")}</p>
          </div>

          <div className="space-y-[18px]">
          <div>
            <label className="mb-2 block text-base font-semibold text-white">{t("email")}</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-white/52" />
              <Input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder={t("enterEmail")}
                className="h-[58px] rounded-[20px] border-0 bg-[#1a2531] !pl-[58px] !pr-5 text-base font-semibold text-white placeholder:text-white/38 focus-visible:ring-1 focus-visible:ring-white/16"
                data-testid="mobile-email-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-base font-semibold text-white">{t("password")}</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-white/52" />
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                placeholder={t("enterPassword")}
                className="h-[58px] rounded-[20px] border-0 bg-[#1a2531] !pl-[58px] !pr-[58px] text-base font-semibold text-white placeholder:text-white/38 focus-visible:ring-1 focus-visible:ring-white/16"
                data-testid="mobile-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/52"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-0">
            <label className="flex items-center gap-2 text-sm font-medium text-white/62">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                className="border-white/22 bg-[#1a2531] data-[state=checked]:border-[var(--bm-primary)] data-[state=checked]:bg-[var(--bm-primary)]"
              />
              <span>{t("rememberMe")}</span>
            </label>
            <button
              type="button"
              onClick={() => navigate("/auth/forgot-password")}
              className="text-sm font-semibold text-white/78"
            >
              {t("forgotPassword")}
            </button>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            actionState={actionState}
            className="mt-6 h-[60px] w-full rounded-[30px] text-xl font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--bluemind-app-color, var(--bm-primary))" }}
            data-testid="mobile-login-submit-button"
          >
            {isLoading ? t("signingIn") : t("signIn")}
          </Button>

          {errorMessage && (
            <p className="text-sm font-medium text-red-500" data-testid="mobile-login-error">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="mt-4 flex h-[60px] w-full items-center justify-center rounded-[30px] bg-white px-6 text-xl font-semibold text-black transition hover:bg-white/95 active:scale-[0.985] disabled:opacity-60"
          >
            Login
          </button>
          </div>
        </form>
      </section>
    </motion.main>
  );
}
