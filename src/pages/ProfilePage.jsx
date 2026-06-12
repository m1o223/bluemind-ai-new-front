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
import { inputClasses, typeClasses } from "@/lib/interactions";
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
import { COLOR_OPTIONS } from "@/theme/colors";

const getProfileColorOptions = (labels) =>
  COLOR_OPTIONS.filter((color) => labels.includes(color.label)).map((color) => ({
    id: color.value,
    label: color.label,
  }));

const chatColors = getProfileColorOptions(["Blue", "Green", "Red", "Purple"]);
const accentColors = getProfileColorOptions(["Blue", "Teal", "Indigo", "Rose"]);

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
        isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]",
      )}
      data-testid={mobile ? "mobile-profile-page" : "profile-page"}
    >
      {/* Header */}
      <header
        className={cn(
          "border-b px-4 sm:px-6",
          mobile ? "sticky top-0 z-20 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl" : "py-4",
          isDark
            ? mobile ? "bg-[var(--bm-bg-app)]/92 border-[var(--bm-bg-elevated)]" : "bg-[var(--bm-bg-card)] border-[var(--bm-bg-elevated)]"
            : mobile ? "bg-[var(--bm-bg-app)]/92 border-[var(--bm-border)]" : "bg-white border-[var(--bm-border)]",
        )}
      >
        <div className={cn("mx-auto flex min-w-0 items-center gap-2 sm:gap-3", mobile ? "max-w-[430px]" : "max-w-2xl")}>
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "flex items-center justify-center transition-colors cursor-pointer",
              mobile ? "h-10 w-10 rounded-full" : "w-9 h-9 rounded-lg",
              isDark ? "text-[var(--bm-text-muted)] hover:text-white hover:bg-[var(--bm-bg-elevated)]" : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
            )}
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BrandLogo
            logoClassName="w-8 h-8"
            textClassName={cn("hidden min-[390px]:inline text-sm sm:text-base", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}
          />
          <h1 className={cn("min-w-0 truncate text-base font-semibold sm:text-lg", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{settingsMode ? t("settings") : t("profile")}</h1>
          <span className={cn("ml-auto max-w-[34vw] truncate text-xs", saveStatus === "error" ? "text-red-500" : isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
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
                  isDark ? "border-white/[0.08] bg-white/[0.05] text-[var(--bm-border)] hover:bg-white/[0.09]" : "border-[var(--bm-border)] bg-white text-[var(--bm-primary)] hover:bg-[var(--bm-bg-elevated)]",
                )}
              >
                {section.label}
              </a>
            ))}
          </nav>
        )}

        {/* User Info */}
        <section id="settings-profile" className={cn("order-1 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          {settingsMode && (
            <h2 className={cn("mb-4 text-base font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("profile")}</h2>
          )}
          <div className="flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-[var(--bm-active-bg)] border border-[var(--bm-active-bg)]")}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Mail className="w-5 h-5" style={{ color: prefs.appColor }} />
              )}
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs mb-0.5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{user?.name || t("email")}</p>
              <p className={cn("text-sm font-medium truncate", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section id="settings-appearance" className={cn("order-4 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          <h2 className={cn("text-base font-semibold mb-5", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("appearance")}</h2>

          {/* Theme */}
          <div className="mb-6">
            <p className={cn("text-sm font-medium mb-3", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{t("theme")}</p>
            <div className={cn("grid grid-cols-1 gap-2 rounded-xl p-1 min-[420px]:grid-cols-3", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-hover-bg)]")}>
              <button
                onClick={() => handleUpdate("theme", "light")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  prefs.theme === "light"
                    ? (isDark ? "bg-[var(--bm-bg-elevated)] text-white shadow-sm" : "bg-white text-[var(--bm-text-primary)] shadow-sm")
                    : (isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")
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
                    ? (isDark ? "bg-[var(--bm-bg-elevated)] text-white shadow-sm" : "bg-white text-[var(--bm-text-primary)] shadow-sm")
                    : (isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")
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
                    ? (isDark ? "bg-[var(--bm-bg-elevated)] text-white shadow-sm" : "bg-white text-[var(--bm-text-primary)] shadow-sm")
                    : (isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")
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
            <p className={cn("text-sm font-medium mb-3", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{t("chatColor")}</p>
            <div className="flex items-center gap-3">
              {chatColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleUpdate("chatColor", color.id)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ring-2 ring-offset-2",
                    prefs.chatColor === color.id ? "ring-[var(--bm-text-primary)]" : "ring-transparent",
                    isDark && "ring-offset-[var(--bm-bg-elevated)]"
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
              <Palette className={cn("w-4 h-4", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")} />
              <p className={cn("text-sm font-medium", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{t("appColor")}</p>
            </div>
            <div className="flex items-center gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleUpdate("appColor", color.id)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ring-2 ring-offset-2",
                    prefs.appColor === color.id ? "ring-[var(--bm-text-primary)]" : "ring-transparent",
                    isDark && "ring-offset-[var(--bm-bg-elevated)]"
                  )}
                  style={{ backgroundColor: color.id }}
                  data-testid={`accent-color-${color.label.toLowerCase()}`}
                >
                  {prefs.appColor === color.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className={cn("mt-6 rounded-xl border p-4", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg", isDark ? "bg-[var(--bm-bg-elevated)]" : "bg-white")}>
                  <MessageSquare className="h-4 w-4" style={{ color: prefs.appColor }} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("openAppDirectlyToChat")}</p>
                  <p className={cn("mt-1 text-xs leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("openAppDirectlyToChatHint")}</p>
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
                    : isDark ? "border-[var(--bm-border-strong)] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border-strong)] bg-white",
                )}
                style={prefs.openAppDirectlyToChat ? { backgroundColor: prefs.appColor || "var(--bm-primary)" } : undefined}
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
        <section id="settings-language" className={cn("order-5 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          <h2 className={cn("text-base font-semibold mb-4", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("appLanguage")}</h2>
          <LanguageSelector
            currentLang={prefs.appLanguage || prefs.language}
            onSelect={handleLanguageSelect}
            isDark={isDark}
          />
        </section>

        {/* Security */}
        <section id="settings-account" className={cn("order-2 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className={cn("w-4 h-4", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")} />
            <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{settingsMode ? (t("account") || "Account") : t("security")}</h2>
          </div>

          <div className={cn("overflow-hidden rounded-xl border", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
            <button
              type="button"
              onClick={() => toggleSecuritySection("email")}
              className={cn("flex w-full items-center justify-between px-4 py-3 text-sm font-medium", isDark ? "text-white hover:bg-[var(--bm-bg-elevated)]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-bg-elevated)]")}
              data-testid="change-email-toggle"
            >
              {t("changeEmail")}
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSecuritySection === "email" && "rotate-180")} />
            </button>

            {openSecuritySection === "email" && (
              <div className={cn("border-t p-4", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
                <form onSubmit={handleRequestEmailChange} className="space-y-3">
                  <input
                    type="password"
                    value={emailChange.currentPassword}
                    onChange={(event) => setEmailChange({ ...emailChange, currentPassword: event.target.value })}
                    placeholder={t("currentPassword")}
                    className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
                    data-testid="change-email-current-password"
                  />
                  <input
                    type="email"
                    value={emailChange.newEmail}
                    onChange={(event) => setEmailChange({ ...emailChange, newEmail: event.target.value })}
                    placeholder={t("newEmail")}
                    className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
                    data-testid="change-email-new-email"
                  />
                  <button
                    type="submit"
                    disabled={!emailChange.currentPassword || !emailChange.newEmail || securityLoading === "email"}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--bm-primary)] text-white disabled:opacity-50"
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
              <p className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("codeSentTo", { email: emailChange.pendingEmail })}</p>
              <input
                value={emailChange.code}
                onChange={(event) => setEmailChange({ ...emailChange, code: event.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder={t("verificationCode")}
                inputMode="numeric"
                className={cn(inputClasses.field, typeClasses.body, "font-semibold tracking-[0.25em]")}
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

          <div className={cn("mt-3 overflow-hidden rounded-xl border", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
            <button
              type="button"
              onClick={() => toggleSecuritySection("password")}
              className={cn("flex w-full items-center justify-between px-4 py-3 text-sm font-medium", isDark ? "text-white hover:bg-[var(--bm-bg-elevated)]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-bg-elevated)]")}
              data-testid="change-password-toggle"
            >
              {t("changePassword")}
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSecuritySection === "password" && "rotate-180")} />
            </button>

            {openSecuritySection === "password" && (
              <div className={cn("border-t p-4", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    value={passwordChange.currentPassword}
                    onChange={(event) => setPasswordChange({ ...passwordChange, currentPassword: event.target.value })}
                    placeholder={t("currentPassword")}
                    className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
                    data-testid="change-password-current"
                  />
                  <input
                    type="password"
                    value={passwordChange.newPassword}
                    onChange={(event) => setPasswordChange({ ...passwordChange, newPassword: event.target.value })}
                    placeholder={t("newPassword")}
                    className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
                    data-testid="change-password-new"
                  />
                  <input
                    type="password"
                    value={passwordChange.confirmPassword}
                    onChange={(event) => setPasswordChange({ ...passwordChange, confirmPassword: event.target.value })}
                    placeholder={t("confirmNewPassword")}
                    className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
                    data-testid="change-password-confirm"
                  />
                  <button
                    type="submit"
                    disabled={!passwordChange.currentPassword || !passwordChange.newPassword || passwordChange.newPassword !== passwordChange.confirmPassword || securityLoading === "password"}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-[var(--bm-primary)] text-white disabled:opacity-50"
                    data-testid="change-password-button"
                  >
                    {securityLoading === "password" ? t("updating") : t("updatePassword")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        <section id="settings-notifications" className={cn("order-3 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          <h2 className={cn("text-base font-semibold mb-2", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("notifications") || "Notifications"}</h2>
          <p className={cn("text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
            Notification preferences use the same reminder and push notification system across desktop and mobile.
          </p>
        </section>

        <section id="settings-privacy" className={cn("order-6 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          <h2 className={cn("text-base font-semibold mb-2", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("privacy") || "Privacy"}</h2>
          <p className={cn("text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
            Profile, account, and preference data are shared from one authenticated BlueMind account.
          </p>
        </section>

        <section id="settings-about" className={cn("order-7 scroll-mt-24 rounded-xl border p-5 mb-6", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          <h2 className={cn("text-base font-semibold mb-2", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("about") || "About"}</h2>
          <p className={cn("text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
            {APP_NAME}
          </p>
        </section>

        {/* Actions */}
        <section className={cn("order-8 rounded-xl border p-5", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")}>
          <h2 className={cn("text-base font-semibold mb-4", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("actions")}</h2>
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
          <div className={cn("relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-xl", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")} data-testid="logout-confirm-modal">
            <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("logoutConfirmTitle")}</h2>
            <p className={cn("mt-2 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("logoutConfirmBody")}</p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={cn("flex-1 rounded-xl border py-3 text-sm font-medium", isDark ? "border-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]")}
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
          <div className={cn("relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-xl", isDark ? "bg-[var(--bm-bg-elevated)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]")} data-testid="ai-language-modal">
            <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("aiLanguageQuestion")}</h2>
            <label className={cn("mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm cursor-pointer", isDark ? "border-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] text-[var(--bm-text-secondary)] bg-[var(--bm-bg-elevated)]")}>
              <input
                type="checkbox"
                checked={matchAiLanguage}
                onChange={(event) => setMatchAiLanguage(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--bm-primary)]"
                data-testid="match-ai-language-checkbox"
              />
              <span>
                <span className="block font-medium">{t("matchAiLanguage")}</span>
                <span className={cn("mt-1 block text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("aiLanguageAutoHint")}</span>
              </span>
            </label>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLanguagePrompt(null)}
                className={cn("flex-1 rounded-xl border py-3 text-sm font-medium", isDark ? "border-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]")}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveLanguagePreference}
                className="flex-1 rounded-xl bg-[var(--bm-primary)] py-3 text-sm font-medium text-white hover:bg-[var(--bm-primary-hover)]"
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
