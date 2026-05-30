import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Mail, Lock, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { registerUser, startGoogleLogin } from "../services/authService";
import { getApiErrorMessage } from "../services/api";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const { t } = useApp();

  const passwordRequirements = [
    { label: t("atLeast8"), met: formData.password.length >= 8 },
    { label: t("includeNumber"), met: /\d/.test(formData.password) },
    { label: t("includeUppercase"), met: /[A-Z]/.test(formData.password) },
  ];

  const isFormValid =
    formData.fullName.trim() &&
    formData.email.trim() &&
    formData.password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await registerUser(formData.fullName, formData.email, formData.password);
      toast.success(t("accountCreatedCheckEmail"));
      sessionStorage.setItem("pendingVerificationEmail", result?.user?.email || formData.email);
      setIsLoading(false);
      navigate(`/auth/verify-email?email=${encodeURIComponent(result?.user?.email || formData.email)}`);
    } catch (error) {
      const message = getApiErrorMessage(error, t("registrationFailed"));
      setErrorMessage(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-5 py-10"
      data-testid="register-page"
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-[#6B7280] hover:text-[#111827] transition-colors duration-200 cursor-pointer"
        data-testid="back-button"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">{t("back")}</span>
      </button>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <BrandLogo forceTheme="light" className="mx-auto mb-4" logoClassName="w-11 h-11" textClassName="text-lg text-[#111827]" />
          <h1 className="text-xl sm:text-2xl font-semibold text-[#111827]">{t("createAccount")}</h1>
          <p className="text-[#6B7280] text-sm mt-1.5">{t("createAccountSubtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#111827] mb-1.5 block">{t("fullName")}</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF]" />
              <Input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder={t("enterFullName")}
                className="pl-10 py-5 bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-xl text-sm focus:border-[#193B68] focus:ring-1 focus:ring-[#193B68] w-full"
                data-testid="fullname-input"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#111827] mb-1.5 block">{t("email")}</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF]" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t("enterEmail")}
                className="pl-10 py-5 bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-xl text-sm focus:border-[#193B68] focus:ring-1 focus:ring-[#193B68] w-full"
                data-testid="email-input"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#111827] mb-1.5 block">{t("password")}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF]" />
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t("createPassword")}
                className="pl-10 pr-10 py-5 bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-xl text-sm focus:border-[#193B68] focus:ring-1 focus:ring-[#193B68] w-full"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors duration-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>

            {/* Password requirements */}
            <div className="mt-2.5 space-y-1.5">
              {passwordRequirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-200",
                    req.met ? "border-[#193B68] bg-[#193B68]" : "border-[#D1D5DB]"
                  )}>
                    {req.met && <Check className="w-2 h-2 text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs transition-colors duration-200",
                    req.met ? "text-[#111827]" : "text-[#6B7280]"
                  )}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full py-5 text-sm bg-[#193B68] hover:bg-[#142f54] text-white rounded-xl font-medium disabled:opacity-50 transition-all duration-200 cursor-pointer"
            data-testid="register-submit-button"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("creating")}
              </span>
            ) : t("createAccountButton")}
          </Button>
          {errorMessage && (
            <p className="text-sm text-red-500" data-testid="register-error">
              {errorMessage}
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#E5E7EB]" />
          <span className="text-[#9CA3AF] text-xs">{t("orContinueWith")}</span>
          <div className="flex-1 h-px bg-[#E5E7EB]" />
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startGoogleLogin}
            className="flex items-center justify-center gap-2 py-3 border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all duration-200 cursor-pointer"
            data-testid="google-login"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-medium text-[#111827]">{t("google")}</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-3 border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all duration-200 cursor-pointer"
            data-testid="apple-login"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#111827">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span className="text-sm font-medium text-[#111827]">{t("apple")}</span>
          </button>
        </div>
        <p className="text-center text-[#9CA3AF] text-xs mt-2">{t("googleSignUpHint")}</p>

        {/* Bottom text */}
        <p className="text-center text-[#6B7280] text-sm mt-6">
          {t("alreadyHaveAccount")}{" "}
          <button
            onClick={() => navigate("/auth/login")}
            className="text-[#193B68] font-medium cursor-pointer hover:underline transition-all duration-200"
            data-testid="signin-link"
          >
            {t("signIn")}
          </button>
        </p>
      </div>
    </motion.div>
  );
}
