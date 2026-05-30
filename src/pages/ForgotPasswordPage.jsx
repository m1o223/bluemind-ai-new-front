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
  const { t } = useApp();

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-white flex items-center justify-center px-4 py-10" data-testid="forgot-password-page">
      <button onClick={() => navigate("/auth/login")} className="absolute top-5 left-5 flex items-center gap-1.5 text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">{t("back")}</span>
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandLogo forceTheme="light" className="mx-auto mb-4" logoClassName="w-12 h-12" textClassName="text-lg text-[#111827]" />
          <h1 className="text-xl sm:text-2xl font-semibold text-[#111827]">{t("forgotPasswordTitle")}</h1>
          <p className="text-[#6B7280] text-sm mt-1.5">{t("forgotPasswordSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#111827] mb-1.5 block">{t("email")}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("enterEmail")} className="py-5 rounded-xl" data-testid="forgot-email-input" />
          </div>

          <Button type="submit" disabled={!email.trim() || isLoading} className="w-full py-5 text-sm bg-[#193B68] hover:bg-[#142f54] text-white rounded-xl font-medium disabled:opacity-50" data-testid="forgot-submit-button">
            {isLoading ? t("sending") : t("sendResetCode")}
          </Button>

          {errorMessage && <p className="text-sm text-red-500" data-testid="forgot-error">{errorMessage}</p>}
        </form>
      </div>
    </motion.div>
  );
}
