import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getGoogleSignInErrorMessage, loginUser, signInWithGoogle } from "../services/authService";
import { getApiErrorMessage } from "../services/api";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { ACTION_ERROR_HOLD_MS, waitForActionFeedback } from "@/lib/actionFeedback";
import { getPreferredAppRoute } from "@/services/navigationPreferences";

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionState, setActionState] = useState("");
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { t, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const pageClass = isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-white text-[var(--bm-text-primary)]";
  const primaryText = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const mutedText = isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]";
  const dividerClass = isDark ? "bg-white/[0.10]" : "bg-[var(--bm-border)]";
  const inputClass = "font-semibold";
  const socialButtonClass = isDark
    ? "border-white/[0.10] bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/[0.16]"
    : "border-[var(--bm-border)] hover:bg-[var(--bm-bg-elevated)] hover:border-[var(--bm-border-strong)]";

  const isFormValid = formData.email.trim() && formData.password.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setActionState("processing");
    setErrorMessage("");
    try {
      const session = await loginUser(formData.email, formData.password);
      toast.success(t("welcomeBackToast"));
      setActionState("success");
      await waitForActionFeedback();
      setIsLoading(false);
      navigate(getPreferredAppRoute(session));
    } catch (error) {
      const message = getApiErrorMessage(error, t("loginFailed"));
      setActionState("error");
      await waitForActionFeedback(ACTION_ERROR_HOLD_MS);
      setErrorMessage(message);
      toast.error(message);
      setIsLoading(false);
      setActionState("");
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    setErrorMessage("");
    try {
      const session = await signInWithGoogle();
      toast.success(t("welcomeBackToast"));
      navigate(getPreferredAppRoute(session));
    } catch (error) {
      const message = getGoogleSignInErrorMessage(error, t("googleSignInFailed"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSocialLoading("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen flex items-center justify-center px-4 sm:px-5 py-10 ${pageClass}`}
      data-testid="login-page"
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className={`absolute top-5 left-5 flex items-center gap-1.5 transition-colors duration-200 cursor-pointer ${isDark ? "text-[var(--bm-text-muted)] hover:text-white" : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)]"}`}
        data-testid="back-button"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">{t("back")}</span>
      </button>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <BrandLogo forceTheme={isDark ? "dark" : "light"} className="mx-auto mb-4" logoClassName="w-11 h-11" textClassName={`text-lg ${primaryText}`} />
          <h1 className={`text-xl sm:text-2xl font-semibold ${primaryText}`}>{t("welcomeBack")}</h1>
          <p className={`${mutedText} text-sm mt-1.5`}>{t("signInSubtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-1.5 block ${primaryText}`}>{t("email")}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--bm-text-muted)]" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t("enterEmail")}
                className={`!pl-[56px] py-5 rounded-xl text-sm w-full ${inputClass}`}
                data-testid="email-input"
              />
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium mb-1.5 block ${primaryText}`}>{t("password")}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--bm-text-muted)]" />
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t("enterPassword")}
                className={`!pl-[56px] !pr-[52px] py-5 rounded-xl text-sm w-full ${inputClass}`}
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--bm-text-muted)] hover:text-[var(--bm-text-secondary)] transition-colors duration-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                className="border-[var(--bm-border)] data-[state=checked]:bg-[var(--bm-primary)] data-[state=checked]:border-[var(--bm-primary)] cursor-pointer"
                data-testid="remember-checkbox"
              />
              <label htmlFor="remember" className={`text-sm cursor-pointer ${mutedText}`}>{t("rememberMe")}</label>
            </div>
            <button type="button" onClick={() => navigate("/auth/forgot-password")} className="text-sm text-[var(--bm-primary)] hover:underline cursor-pointer transition-all duration-200" data-testid="forgot-password-link">
              {t("forgotPassword")}
            </button>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            actionState={actionState}
            className="w-full py-5 text-sm bg-[var(--bm-primary)] hover:bg-[var(--bm-primary-hover)] text-white rounded-xl font-medium disabled:opacity-50 transition-all duration-200 cursor-pointer"
            data-testid="login-submit-button"
          >
            {isLoading ? t("signingIn") : t("signIn")}
          </Button>
          {errorMessage && (
            <p className="text-sm text-red-500" data-testid="login-error">
              {errorMessage}
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className={`flex-1 h-px ${dividerClass}`} />
          <span className="text-[var(--bm-text-muted)] text-xs">{t("orContinueWith")}</span>
          <div className={`flex-1 h-px ${dividerClass}`} />
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            className={`flex items-center justify-center gap-2 py-3 border rounded-xl transition-all duration-200 cursor-pointer ${socialButtonClass}`}
            data-testid="google-login"
          >
            {socialLoading === "google" ? <BlueMindLoadingDots className="text-[var(--bm-primary)]" /> : <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--bm-success)"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--bm-warning)"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--bm-error)"/>
            </svg>}
            <span className={`text-sm font-medium ${primaryText}`}>{t("google")}</span>
          </button>
        </div>
        <p className="text-center text-[var(--bm-text-muted)] text-xs mt-2">{t("googleSignInHint")}</p>

        {/* Bottom text */}
        <p className={`text-center text-sm mt-6 ${mutedText}`}>
          {t("noAccount")}{" "}
          <button
            onClick={() => navigate("/auth/register")}
            className="text-[var(--bm-primary)] font-medium cursor-pointer hover:underline transition-all duration-200"
            data-testid="register-link"
          >
            {t("createOne")}
          </button>
        </p>
      </div>
    </motion.div>
  );
}
