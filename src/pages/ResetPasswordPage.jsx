import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/services/api";
import { resetPassword } from "@/services/authService";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: searchParams.get("email") || "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { t, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const pageClass = isDark ? "bg-[#1a1a1a] text-white" : "bg-white text-[#111827]";
  const primaryText = isDark ? "text-white" : "text-[#111827]";
  const mutedText = isDark ? "text-[#A7A7A7]" : "text-[#6B7280]";
  const inputClass = isDark
    ? "bg-[#202020] border-white/[0.10] text-white placeholder:text-[#777] focus:border-[#4C8DFF]"
    : "bg-white border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#193B68]";

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
      navigate("/auth/login", { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, t("couldNotResetPassword"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen flex items-center justify-center px-4 py-10 ${pageClass}`} data-testid="reset-password-page">
      <button onClick={() => navigate("/auth/login")} className={`absolute top-5 left-5 flex items-center gap-1.5 transition-colors cursor-pointer ${isDark ? "text-[#A7A7A7] hover:text-white" : "text-[#6B7280] hover:text-[#111827]"}`}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">{t("back")}</span>
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandLogo forceTheme={isDark ? "dark" : "light"} className="mx-auto mb-4" logoClassName="w-12 h-12" textClassName={`text-lg ${primaryText}`} />
          <h1 className={`text-xl sm:text-2xl font-semibold ${primaryText}`}>{t("resetPassword")}</h1>
          <p className={`${mutedText} text-sm mt-1.5`}>{t("resetPasswordSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t("email")} className={`py-5 rounded-xl ${inputClass}`} data-testid="reset-email-input" />
          <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" placeholder={t("resetCode")} className={`py-5 rounded-xl text-center tracking-[0.35em] font-semibold ${inputClass}`} data-testid="reset-code-input" />
          <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={t("newPassword")} className={`py-5 rounded-xl ${inputClass}`} data-testid="reset-password-input" />
          <Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder={t("confirmNewPassword")} className={`py-5 rounded-xl ${inputClass}`} data-testid="reset-confirm-password-input" />

          <Button type="submit" disabled={!isValid || isLoading} className="w-full py-5 text-sm bg-[#193B68] hover:bg-[#142f54] text-white rounded-xl font-medium disabled:opacity-50" data-testid="reset-submit-button">
            {isLoading ? t("resetting") : t("resetPassword")}
          </Button>

          {errorMessage && <p className="text-sm text-red-500" data-testid="reset-error">{errorMessage}</p>}
        </form>
      </div>
    </motion.div>
  );
}
