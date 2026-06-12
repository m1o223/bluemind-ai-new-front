import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/services/api";
import { requestPasswordReset } from "@/services/authService";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { t, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const pageClass = isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-white text-[var(--bm-text-primary)]";
  const primaryText = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const mutedText = isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]";
  const inputClass = "font-semibold";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await requestPasswordReset(email);
      toast.success(t("resetCodeSent"));
      navigate(`/auth/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      const message = getApiErrorMessage(error, t("couldNotRequestPasswordReset"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen flex items-center justify-center px-4 py-10 ${pageClass}`} data-testid="forgot-password-page">
      <button onClick={() => navigate("/auth/login")} className={`absolute top-5 left-5 flex items-center gap-1.5 transition-colors cursor-pointer ${isDark ? "text-[var(--bm-text-muted)] hover:text-white" : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)]"}`}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">{t("back")}</span>
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandLogo forceTheme={isDark ? "dark" : "light"} className="mx-auto mb-4" logoClassName="w-12 h-12" textClassName={`text-lg ${primaryText}`} />
          <h1 className={`text-xl sm:text-2xl font-semibold ${primaryText}`}>{t("forgotPasswordTitle")}</h1>
          <p className={`${mutedText} text-sm mt-1.5`}>{t("forgotPasswordSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-1.5 block ${primaryText}`}>{t("email")}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("enterEmail")} className={`py-5 rounded-xl ${inputClass}`} data-testid="forgot-email-input" />
          </div>

          <Button type="submit" disabled={!email.trim() || isLoading} className="w-full py-5 text-sm bg-[var(--bm-primary)] hover:bg-[var(--bm-primary-hover)] text-white rounded-xl font-medium disabled:opacity-50" data-testid="forgot-submit-button">
            {isLoading ? t("sending") : t("sendResetCode")}
          </Button>

          {errorMessage && <p className="text-sm text-red-500" data-testid="forgot-error">{errorMessage}</p>}
        </form>
      </div>
    </motion.div>
  );
}
