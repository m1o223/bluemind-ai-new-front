import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Moon,
  Sun,
  Monitor,
  Logout,
  Mail,
  Check,
  Palette,
  ShieldCheck,
  ChevronDown,
  MessageSquare,
} from "lucide-react";

import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import LanguageSelector from "../components/ui/LanguageSelector";
import BrandLogo, { APP_NAME } from "@/components/BrandLogo";
import { useCallback, useEffect, useState } from "react";

import {
  getProfile,
  updatePreferences,
} from "../services/profileService";
import { getApiErrorMessage } from "../services/api";
import {
  changePassword,
  confirmEmailChange,
  logoutUser,
  requestEmailChange,
} from "../services/authService";

const chatColors = [
  { id: "#193B68", label: "Blue" },
  { id: "#10B37F", label: "Green" },
  { id: "#DC2626", label: "Red" },
  { id: "#7C3AED", label: "Purple" },
];

const accentColors = [
  { id: "#193B68", label: "Blue" },
  { id: "#00C4B8", label: "Teal" },
  { id: "#4F46E5", label: "Indigo" },
  { id: "#E11D48", label: "Rose" },
];

export default function ProfilePage({ mobile = false, settingsMode = false }) {
  const navigate = useNavigate();

  const { prefs, setPrefs, updatePref, t, resolvedTheme } = useApp();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [securityLoading, setSecurityLoading] = useState("");
  const [openSecuritySection, setOpenSecuritySection] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [languagePrompt, setLanguagePrompt] = useState(null);
  const [matchAiLanguage, setMatchAiLanguage] = useState(false);
  const [emailChange, setEmailChange] = useState({
    currentPassword: "",
    newEmail: "",
    code: "",
    pendingEmail: "",
  });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const isDark = resolvedTheme === "dark";
  const settingsSections = [
    { id: "settings-profile", label: t("profile") },
    { id: "settings-account", label: t("account") || "Account" },
    { id: "settings-notifications", label: t("notifications") || "Notifications" },
    { id: "settings-appearance", label: t("appearance") },
    { id: "settings-language", label: t("language") || t("appLanguage") },
    { id: "settings-privacy", label: t("privacy") || "Privacy" },
    { id: "settings-about", label: t("about") || "About" },
  ];

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getProfile();

      setUser(data);
      if (data?.preferences) {
        setPrefs(data.preferences);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [setPrefs]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdate = async (key, value) => {
    const previousPrefs = prefs;
    const patch = { [key]: value };

    updatePref(key, value);
    setSaveStatus("saving");

    try {
      const result = await updatePreferences(patch);

      if (result?.preferences) {
        setPrefs(result.preferences);
      }

      if (result?.user) {
        setUser(result.user);
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1600);
    } catch (error) {
      setPrefs(previousPrefs);
      setSaveStatus("error");
      toast.error(error.message || t("saveFailed"));
    }
  };

  const handleLanguageSelect = (code) => {
    if (code === (prefs.appLanguage || prefs.language)) {
      return;
    }

    setLanguagePrompt({ code });
    setMatchAiLanguage(prefs.aiLanguageMode === "match_app");
  };

  const handleSaveLanguagePreference = async () => {
    if (!languagePrompt?.code) {
      return;
    }

    const previousPrefs = prefs;
    const patch = {
      appLanguage: languagePrompt.code,
      language: languagePrompt.code,
      aiLanguageMode: matchAiLanguage ? "match_app" : "auto",
    };

    setPrefs({
      ...prefs,
      ...patch,
    });
    setSaveStatus("saving");

    try {
      const result = await updatePreferences(patch);

      if (result?.preferences) {
        setPrefs(result.preferences);
      }

      if (result?.user) {
        setUser(result.user);
      }

      setLanguagePrompt(null);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1600);
    } catch (error) {
      setPrefs(previousPrefs);
      setSaveStatus("error");
      toast.error(error.message || t("saveFailed"));
    }
  };

  const handleLogout = async () => {
    toast.success(t("logout"));

    await logoutUser();

    setTimeout(() => navigate(mobile ? "/mobile" : "/"), 500);
  };

  const toggleSecuritySection = (section) => {
    setOpenSecuritySection((current) => current === section ? "" : section);
  };

  const handleRequestEmailChange = async (event) => {
    event.preventDefault();
    setSecurityLoading("email");

    try {
      const result = await requestEmailChange(emailChange.currentPassword, emailChange.newEmail);
      setEmailChange((prev) => ({
        ...prev,
        pendingEmail: result.pendingEmail || prev.newEmail,
        code: "",
      }));
      toast.success(t("emailChangeCodeSent"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("couldNotStartEmailChange")));
    } finally {
      setSecurityLoading("");
    }
  };

  const handleConfirmEmailChange = async (event) => {
    event.preventDefault();
    setSecurityLoading("email-code");

    try {
      const result = await confirmEmailChange(emailChange.code);
      if (result?.user) setUser(result.user);
      setEmailChange({ currentPassword: "", newEmail: "", code: "", pendingEmail: "" });
      toast.success(t("emailUpdated"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("couldNotConfirmEmailChange")));
    } finally {
      setSecurityLoading("");
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setSecurityLoading("password");

    try {
      await changePassword(
        passwordChange.currentPassword,
        passwordChange.newPassword,
        passwordChange.confirmPassword,
      );
      setPasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success(t("passwordUpdatedSessionsRevoked"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("couldNotChangePassword")));
    } finally {
      setSecurityLoading("");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        mobile ? "min-h-[100dvh]" : "min-h-screen",
        isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]",
      )}
      data-testid={mobile ? "mobile-profile-page" : "profile-page"}
    >
      {/* Header */}
      <header
        className={cn(
          "border-b px-4 sm:px-6",
          mobile ? "sticky top-0 z-20 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl" : "py-4",
          isDark
            ? mobile ? "bg-[#1a1a1a]/92 border-[#333]" : "bg-[#222] border-[#333]"
            : mobile ? "bg-[#FAFBFC]/92 border-[#E5E7EB]" : "bg-white border-[#E5E7EB]",
        )}
      >
        <div className={cn("mx-auto flex min-w-0 items-center gap-2 sm:gap-3", mobile ? "max-w-[430px]" : "max-w-2xl")}>
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "flex items-center justify-center transition-colors cursor-pointer",
              mobile ? "h-10 w-10 rounded-full" : "w-9 h-9 rounded-lg",
              isDark ? "text-[#999] hover:text-white hover:bg-[#333]" : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]",
            )}
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BrandLogo
            logoClassName="w-8 h-8"
            textClassName={cn("hidden min-[390px]:inline text-sm sm:text-base", isDark ? "text-white" : "text-[#111827]")}
          />
          <h1 className={cn("min-w-0 truncate text-base font-semibold sm:text-lg", isDark ? "text-white" : "text-[#111827]")}>{settingsMode ? t("settings") : t("profile")}</h1>
          <span className={cn("ml-auto max-w-[34vw] truncate text-xs", saveStatus === "error" ? "text-red-500" : isDark ? "text-[#888]" : "text-[#6B7280]")}>
            {isLoading ? t("loadingSettings") : saveStatus === "saving" ? t("saving") : saveStatus === "saved" ? t("saved") : saveStatus === "error" ? t("saveFailed") : ""}
          </span>
        </div>
      </header>

      {/* Content */}
      <div
        className={cn(
          "flex flex-1 flex-col mx-auto w-full px-4 sm:px-6",
          mobile ? "max-w-[430px] py-4 pb-[max(24px,env(safe-area-inset-bottom))]" : "max-w-2xl py-6 sm:py-8",
        )}
      >
        {settingsMode && (
          <nav
            className={cn(
              "order-0 mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              mobile ? "-mx-1 px-1" : "",
            )}
            aria-label="Settings sections"
          >
            {settingsSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                  isDark ? "border-white/[0.08] bg-white/[0.05] text-[#E5E7EB] hover:bg-white/[0.09]" : "border-[#E5E7EB] bg-white text-[#193B68] hover:bg-[#F8FAFC]",
                )}
              >
                {section.label}
              </a>
            ))}
          </nav>
        )}

        {/* User Info */}
        <section id="settings-profile" className={cn("order-1 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          {settingsMode && (
            <h2 className={cn("mb-4 text-base font-semibold", isDark ? "text-white" : "text-[#111827]")}>{t("profile")}</h2>
          )}
          <div className="flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden", isDark ? "bg-[#333]" : "bg-[#EEF2FF] border border-[#E0E7FF]")}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Mail className="w-5 h-5" style={{ color: prefs.appColor }} />
              )}
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs mb-0.5", isDark ? "text-[#888]" : "text-[#9CA3AF]")}>{user?.name || t("email")}</p>
              <p className={cn("text-sm font-medium truncate", isDark ? "text-white" : "text-[#111827]")}>{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section id="settings-appearance" className={cn("order-4 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          <h2 className={cn("text-base font-semibold mb-5", isDark ? "text-white" : "text-[#111827]")}>{t("appearance")}</h2>

          {/* Theme */}
          <div className="mb-6">
            <p className={cn("text-sm font-medium mb-3", isDark ? "text-[#ccc]" : "text-[#374151]")}>{t("theme")}</p>
            <div className={cn("grid grid-cols-1 gap-2 rounded-xl p-1 min-[420px]:grid-cols-3", isDark ? "bg-[#1a1a1a]" : "bg-[#F3F4F6]")}>
              <button
                onClick={() => handleUpdate("theme", "light")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  prefs.theme === "light"
                    ? (isDark ? "bg-[#333] text-white shadow-sm" : "bg-white text-[#111827] shadow-sm")
                    : (isDark ? "text-[#888]" : "text-[#6B7280]")
                )}
                data-testid="theme-light"
              >
                <Sun className="w-4 h-4" />
                {t("light")}
              </button>
              <button
                onClick={() => handleUpdate("theme", "dark")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  prefs.theme === "dark"
                    ? (isDark ? "bg-[#333] text-white shadow-sm" : "bg-white text-[#111827] shadow-sm")
                    : (isDark ? "text-[#888]" : "text-[#6B7280]")
                )}
                data-testid="theme-dark"
              >
                <Moon className="w-4 h-4" />
                {t("dark")}
              </button>
              <button
                onClick={() => handleUpdate("theme", "system")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  prefs.theme === "system"
                    ? (isDark ? "bg-[#333] text-white shadow-sm" : "bg-white text-[#111827] shadow-sm")
                    : (isDark ? "text-[#888]" : "text-[#6B7280]")
                )}
                data-testid="theme-system"
              >
                <Monitor className="w-4 h-4" />
                {t("system")}
              </button>
            </div>
          </div>

          {/* Chat Color */}
          <div className="mb-6">
            <p className={cn("text-sm font-medium mb-3", isDark ? "text-[#ccc]" : "text-[#374151]")}>{t("chatColor")}</p>
            <div className="flex items-center gap-3">
              {chatColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleUpdate("chatColor", color.id)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ring-2 ring-offset-2",
                    prefs.chatColor === color.id ? "ring-[#111827]" : "ring-transparent",
                    isDark && "ring-offset-[#252525]"
                  )}
                  style={{ backgroundColor: color.id }}
                  data-testid={`chat-color-${color.label.toLowerCase()}`}
                >
                  {prefs.chatColor === color.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className={cn("w-4 h-4", isDark ? "text-[#888]" : "text-[#6B7280]")} />
              <p className={cn("text-sm font-medium", isDark ? "text-[#ccc]" : "text-[#374151]")}>{t("appColor")}</p>
            </div>
            <div className="flex items-center gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleUpdate("appColor", color.id)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ring-2 ring-offset-2",
                    prefs.appColor === color.id ? "ring-[#111827]" : "ring-transparent",
                    isDark && "ring-offset-[#252525]"
                  )}
                  style={{ backgroundColor: color.id }}
                  data-testid={`accent-color-${color.label.toLowerCase()}`}
                >
                  {prefs.appColor === color.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className={cn("mt-6 rounded-xl border p-4", isDark ? "border-[#333] bg-[#1f1f1f]" : "border-[#E5E7EB] bg-[#F9FAFB]")}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg", isDark ? "bg-[#333]" : "bg-white")}>
                  <MessageSquare className="h-4 w-4" style={{ color: prefs.appColor }} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-[#111827]")}>{t("openAppDirectlyToChat")}</p>
                  <p className={cn("mt-1 text-xs leading-5", isDark ? "text-[#999]" : "text-[#6B7280]")}>{t("openAppDirectlyToChatHint")}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.openAppDirectlyToChat}
                onClick={() => handleUpdate("openAppDirectlyToChat", !prefs.openAppDirectlyToChat)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200",
                  prefs.openAppDirectlyToChat
                    ? "border-transparent"
                    : isDark ? "border-[#444] bg-[#2a2a2a]" : "border-[#D1D5DB] bg-white",
                )}
                style={prefs.openAppDirectlyToChat ? { backgroundColor: prefs.appColor || "#193B68" } : undefined}
                data-testid="open-direct-chat-toggle"
              >
                <span
                  className={cn(
                    "absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                    prefs.openAppDirectlyToChat ? "translate-x-5" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Language */}
        <section id="settings-language" className={cn("order-5 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          <h2 className={cn("text-base font-semibold mb-4", isDark ? "text-white" : "text-[#111827]")}>{t("appLanguage")}</h2>
          <LanguageSelector
            currentLang={prefs.appLanguage || prefs.language}
            onSelect={handleLanguageSelect}
            isDark={isDark}
          />
        </section>

        {/* Security */}
        <section id="settings-account" className={cn("order-2 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className={cn("w-4 h-4", isDark ? "text-[#888]" : "text-[#6B7280]")} />
            <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-[#111827]")}>{settingsMode ? (t("account") || "Account") : t("security")}</h2>
          </div>

          <div className={cn("overflow-hidden rounded-xl border", isDark ? "border-[#333]" : "border-[#E5E7EB]")}>
            <button
              type="button"
              onClick={() => toggleSecuritySection("email")}
              className={cn("flex w-full items-center justify-between px-4 py-3 text-sm font-medium", isDark ? "text-white hover:bg-[#2a2a2a]" : "text-[#111827] hover:bg-[#F9FAFB]")}
              data-testid="change-email-toggle"
            >
              {t("changeEmail")}
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSecuritySection === "email" && "rotate-180")} />
            </button>

            {openSecuritySection === "email" && (
              <div className={cn("border-t p-4", isDark ? "border-[#333]" : "border-[#E5E7EB]")}>
                <form onSubmit={handleRequestEmailChange} className="space-y-3">
                  <input
                    type="password"
                    value={emailChange.currentPassword}
                    onChange={(event) => setEmailChange({ ...emailChange, currentPassword: event.target.value })}
                    placeholder={t("currentPassword")}
                    className={cn("w-full px-4 py-3 rounded-xl border text-sm outline-none", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
                    data-testid="change-email-current-password"
                  />
                  <input
                    type="email"
                    value={emailChange.newEmail}
                    onChange={(event) => setEmailChange({ ...emailChange, newEmail: event.target.value })}
                    placeholder={t("newEmail")}
                    className={cn("w-full px-4 py-3 rounded-xl border text-sm outline-none", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
                    data-testid="change-email-new-email"
                  />
                  <button
                    type="submit"
                    disabled={!emailChange.currentPassword || !emailChange.newEmail || securityLoading === "email"}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-[#193B68] text-white disabled:opacity-50"
                    data-testid="change-email-request-button"
                  >
                    {securityLoading === "email" ? t("sending") : t("sendVerificationCode")}
                  </button>
                </form>
              </div>
            )}
          </div>

          {emailChange.pendingEmail && (
            <form onSubmit={handleConfirmEmailChange} className="space-y-3 mb-5">
              <p className={cn("text-xs", isDark ? "text-[#888]" : "text-[#6B7280]")}>{t("codeSentTo", { email: emailChange.pendingEmail })}</p>
              <input
                value={emailChange.code}
                onChange={(event) => setEmailChange({ ...emailChange, code: event.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder={t("verificationCode")}
                inputMode="numeric"
                className={cn("w-full px-4 py-3 rounded-xl border text-sm outline-none tracking-[0.25em]", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#666]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
                data-testid="change-email-code"
              />
              <button
                type="submit"
                disabled={!/^\d{6}$/.test(emailChange.code) || securityLoading === "email-code"}
                className="w-full py-3 rounded-xl text-sm font-medium bg-[#10B37F] text-white disabled:opacity-50"
                data-testid="change-email-confirm-button"
              >
                {securityLoading === "email-code" ? `${t("confirm")}...` : t("confirmNewEmail")}
              </button>
            </form>
          )}

          <div className={cn("mt-3 overflow-hidden rounded-xl border", isDark ? "border-[#333]" : "border-[#E5E7EB]")}>
            <button
              type="button"
              onClick={() => toggleSecuritySection("password")}
              className={cn("flex w-full items-center justify-between px-4 py-3 text-sm font-medium", isDark ? "text-white hover:bg-[#2a2a2a]" : "text-[#111827] hover:bg-[#F9FAFB]")}
              data-testid="change-password-toggle"
            >
              {t("changePassword")}
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSecuritySection === "password" && "rotate-180")} />
            </button>

            {openSecuritySection === "password" && (
              <div className={cn("border-t p-4", isDark ? "border-[#333]" : "border-[#E5E7EB]")}>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    value={passwordChange.currentPassword}
                    onChange={(event) => setPasswordChange({ ...passwordChange, currentPassword: event.target.value })}
                    placeholder={t("currentPassword")}
                    className={cn("w-full px-4 py-3 rounded-xl border text-sm outline-none", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
                    data-testid="change-password-current"
                  />
                  <input
                    type="password"
                    value={passwordChange.newPassword}
                    onChange={(event) => setPasswordChange({ ...passwordChange, newPassword: event.target.value })}
                    placeholder={t("newPassword")}
                    className={cn("w-full px-4 py-3 rounded-xl border text-sm outline-none", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
                    data-testid="change-password-new"
                  />
                  <input
                    type="password"
                    value={passwordChange.confirmPassword}
                    onChange={(event) => setPasswordChange({ ...passwordChange, confirmPassword: event.target.value })}
                    placeholder={t("confirmNewPassword")}
                    className={cn("w-full px-4 py-3 rounded-xl border text-sm outline-none", isDark ? "bg-[#1a1a1a] border-[#333] text-white placeholder-[#888]" : "bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]")}
                    data-testid="change-password-confirm"
                  />
                  <button
                    type="submit"
                    disabled={!passwordChange.currentPassword || !passwordChange.newPassword || passwordChange.newPassword !== passwordChange.confirmPassword || securityLoading === "password"}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-[#193B68] text-white disabled:opacity-50"
                    data-testid="change-password-button"
                  >
                    {securityLoading === "password" ? t("updating") : t("updatePassword")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        <section id="settings-notifications" className={cn("order-3 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          <h2 className={cn("text-base font-semibold mb-2", isDark ? "text-white" : "text-[#111827]")}>{t("notifications") || "Notifications"}</h2>
          <p className={cn("text-sm leading-6", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>
            Notification preferences use the same reminder and push notification system across desktop and mobile.
          </p>
        </section>

        <section id="settings-privacy" className={cn("order-6 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          <h2 className={cn("text-base font-semibold mb-2", isDark ? "text-white" : "text-[#111827]")}>{t("privacy") || "Privacy"}</h2>
          <p className={cn("text-sm leading-6", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>
            Profile, account, and preference data are shared from one authenticated BlueMind account.
          </p>
        </section>

        <section id="settings-about" className={cn("order-7 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          <h2 className={cn("text-base font-semibold mb-2", isDark ? "text-white" : "text-[#111827]")}>{t("about") || "About"}</h2>
          <p className={cn("text-sm leading-6", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>
            {APP_NAME}
          </p>
        </section>

        {/* Actions */}
        <section className={cn("order-8 rounded-xl border p-5", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")}>
          <h2 className={cn("text-base font-semibold mb-4", isDark ? "text-white" : "text-[#111827]")}>{t("actions")}</h2>
          <div className="space-y-3">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer",
                isDark ? "border-red-900 text-red-400 hover:bg-red-900/20" : "border-red-200 text-red-500 hover:bg-red-50"
              )}
              data-testid="logout-button"
            >
              {t("logout")}
            </button>
          </div>
        </section>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowLogoutConfirm(false)} />
          <div className={cn("relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-xl", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")} data-testid="logout-confirm-modal">
            <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-[#111827]")}>{t("logoutConfirmTitle")}</h2>
            <p className={cn("mt-2 text-sm", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>{t("logoutConfirmBody")}</p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={cn("flex-1 rounded-xl border py-3 text-sm font-medium", isDark ? "border-[#333] text-[#ddd] hover:bg-[#2a2a2a]" : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]")}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700"
                data-testid="logout-confirm-button"
              >
                {t("logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {languagePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setLanguagePrompt(null)} />
          <div className={cn("relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-xl", isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#E5E7EB]")} data-testid="ai-language-modal">
            <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-[#111827]")}>{t("aiLanguageQuestion")}</h2>
            <label className={cn("mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm cursor-pointer", isDark ? "border-[#333] text-[#ddd] bg-[#1f1f1f]" : "border-[#E5E7EB] text-[#374151] bg-[#F9FAFB]")}>
              <input
                type="checkbox"
                checked={matchAiLanguage}
                onChange={(event) => setMatchAiLanguage(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#193B68]"
                data-testid="match-ai-language-checkbox"
              />
              <span>
                <span className="block font-medium">{t("matchAiLanguage")}</span>
                <span className={cn("mt-1 block text-xs", isDark ? "text-[#999]" : "text-[#6B7280]")}>{t("aiLanguageAutoHint")}</span>
              </span>
            </label>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLanguagePrompt(null)}
                className={cn("flex-1 rounded-xl border py-3 text-sm font-medium", isDark ? "border-[#333] text-[#ddd] hover:bg-[#2a2a2a]" : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]")}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveLanguagePreference}
                className="flex-1 rounded-xl bg-[#193B68] py-3 text-sm font-medium text-white hover:bg-[#142f54]"
                data-testid="save-language-preference"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
