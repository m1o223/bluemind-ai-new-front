import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/BrandLogo";

export default function AuthSelectionPage() {
  const navigate = useNavigate();
  const { t, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const primaryText = isDark ? "text-white" : "text-[#111827]";
  const mutedText = isDark ? "text-[#A7A7A7]" : "text-[#6B7280]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-[#1a1a1a] text-white" : "bg-white text-[#111827]"}`}
      data-testid="auth-selection-page"
    >
      <Button
        onClick={() => navigate("/")}
        variant="ghost"
        className={`fixed top-6 left-6 ${isDark ? "text-[#A7A7A7] hover:text-white hover:bg-white/[0.08]" : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F7FA]"}`}
        data-testid="back-button"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        {t("back")}
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <BrandLogo forceTheme={isDark ? "dark" : "light"} className="mx-auto mb-4" logoClassName="w-12 h-12" textClassName={`text-lg ${primaryText}`} />
          <h1 className={`text-xl font-semibold ${primaryText}`}>{t("welcomeToBlueMind")}</h1>
          <p className={`${mutedText} text-sm mt-1`}>{t("authSelectionSubtitle")}</p>
        </div>

        <Button
          onClick={() => navigate("/auth/register")}
          className="w-full py-6 text-base bg-[#193B68] hover:bg-[#142f54] text-white rounded-xl"
          data-testid="register-option-button"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          {t("createAccountButton")}
        </Button>

        <Button
          onClick={() => navigate("/auth/login")}
          variant="ghost"
          className={`w-full mt-3 ${isDark ? "text-[#A7A7A7] hover:text-white hover:bg-white/[0.08]" : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F7FA]"}`}
          data-testid="signin-option-button"
        >
          {t("signInInstead")}
        </Button>
      </motion.div>
    </motion.div>
  );
}
