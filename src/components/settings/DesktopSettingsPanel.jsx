import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  BookOpen,
  Cake,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  FileUp,
  Flag,
  Globe2,
  HelpCircle,
  Info,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  Palette,
  Shield,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import {
  changePassword,
  confirmEmailChange,
  requestEmailChange,
  requestPasswordReset,
  logoutUser,
} from "@/services/authService";
import { getProfile, updatePreferences } from "@/services/profileService";
import { readStoredUser } from "@/services/storageKeys";
import { reportIssue } from "@/services/supportService";

const SUPPORT_EMAIL = "supportbluemindai@gmail.com";
const APP_VERSION = process.env.REACT_APP_VERSION || "0.1.0";
const AVATAR_COLORS = ["#193B68", "#2563EB", "#059669", "#EA580C", "#DC2626", "#7C3AED", "#0891B2", "#BE123C"];
const COLOR_OPTIONS = [
  { label: "Blue", value: "#193B68" },
  { label: "Sky", value: "#0284C7" },
  { label: "Cyan", value: "#0891B2" },
  { label: "Teal", value: "#0F766E" },
  { label: "Emerald", value: "#059669" },
  { label: "Green", value: "#16A34A" },
  { label: "Lime", value: "#65A30D" },
  { label: "Yellow", value: "#CA8A04" },
  { label: "Amber", value: "#D97706" },
  { label: "Orange", value: "#EA580C" },
  { label: "Red", value: "#DC2626" },
  { label: "Rose", value: "#E11D48" },
  { label: "Pink", value: "#DB2777" },
  { label: "Fuchsia", value: "#C026D3" },
  { label: "Purple", value: "#9333EA" },
  { label: "Violet", value: "#7C3AED" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Slate", value: "#475569" },
  { label: "Stone", value: "#57534E" },
  { label: "Zinc", value: "#52525B" },
  { label: "Mint", value: "#10B981" },
  { label: "Ocean", value: "#2563EB" },
  { label: "Berry", value: "#BE123C" },
  { label: "Copper", value: "#B45309" },
];
const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "العربية", value: "ar" },
  { label: "Svenska", value: "sv" },
];
const NOTIFICATION_ROWS = [
  {
    id: "email",
    title: "Email Notifications",
    description: "Receive important account emails.",
    section: "email",
    keys: ["importantAccountEmails", "securityEmails", "notificationSummaries"],
  },
  {
    id: "reminders",
    title: "Reminder Notifications",
    description: "Receive reminder alerts and schedules.",
    section: "reminders",
    keys: ["alerts", "daily", "weekly", "missed", "overdue"],
  },
  {
    id: "study",
    title: "Study Notifications",
    description: "Receive study plan and learning reminders.",
    section: "study",
    keys: ["sessionReminders", "dailyGoals", "weeklyProgress", "missedSessions", "streakAlerts"],
  },
  {
    id: "ai",
    title: "AI Notifications",
    description: "Receive AI task updates and completed results.",
    section: "ai",
    keys: ["taskCompleted", "researchCompleted", "imageGenerationCompleted", "longRunningTaskCompleted", "recommendations"],
  },
  {
    id: "security",
    title: "Security Notifications",
    description: "Receive login and account security alerts.",
    section: "security",
    keys: ["newLogin", "passwordChanged", "emailChanged", "securityAlerts", "accountActivity"],
  },
  {
    id: "appUpdates",
    title: "App Update Notifications",
    description: "Receive feature updates and announcements.",
    section: "system",
    keys: ["newFeatures", "appUpdates", "maintenanceAnnouncements"],
  },
  {
    id: "birthday",
    title: "Birthday Notifications",
    description: "Receive birthday greetings and celebration messages.",
    section: "birthday",
    keys: ["birthdayGreetings"],
  },
];
const HELP_TOPICS = [
  {
    title: "How to use BlueMind",
    text: "Use chat for questions, upload images or PDFs with the plus button, create study plans, manage reminders, and use AI tools when you need writing, search, or image help.",
  },
  {
    title: "Frequently Asked Questions",
    text: "Most workflows start in chat. Choose a tool only when you need a specific mode, such as Create Image, Write/Edit, or Search.",
  },
  {
    title: "Helpful links",
    text: `For account or product help, email ${SUPPORT_EMAIL}.`,
  },
  {
    title: "Guides",
    text: "Start with a clear request, attach files when needed, and ask BlueMind to organize, explain, summarize, or turn your material into a plan.",
  },
];

function initialsFor(user) {
  const source = String(user?.name || user?.email || "BlueMind").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0] || ""}${parts[1][0] || ""}` : source.slice(0, 2);
  return letters.toUpperCase();
}

function avatarColorFor(user) {
  const source = `${user?.name || ""}${user?.email || ""}` || "BlueMind";
  const hash = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDate(value) {
  if (!value) return "Unavailable";
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function createSupportAttachment(file) {
  const dataUrl = await fileToDataUrl(file);
  return {
    name: file.name || "attachment",
    type: file.type || "application/octet-stream",
    size: file.size || 0,
    dataUrl,
  };
}

function Toggle({ checked, disabled, isDark, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-transparent bg-[#193B68]" : isDark ? "border-white/[0.12] bg-white/[0.08]" : "border-[#CBD5E1] bg-[#E2E8F0]",
      )}
    >
      <span className={cn("absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

function TextInput({ isDark, className, ...props }) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none transition-colors",
        isDark
          ? "border-white/[0.10] bg-[#171717] text-white placeholder:text-[#777] focus:border-white/30"
          : "border-[#CBD5E1] bg-[#F8FAFC] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#193B68]",
        className,
      )}
    />
  );
}

function PrimaryButton({ children, loading, className, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={cn("min-h-11 rounded-2xl bg-[#193B68] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#142f54] disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      {loading ? "Saving..." : children}
    </button>
  );
}

function SettingCard({ isDark, children, className }) {
  return (
    <div className={cn("overflow-hidden rounded-[24px] border shadow-sm", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[#E5E7EB] bg-white", className)}>
      {children}
    </div>
  );
}

function Row({ icon: Icon, title, description, value, trailing, onClick, isDark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[72px] w-full items-center gap-3 border-b px-5 text-left last:border-b-0",
        isDark ? "border-white/[0.07] hover:bg-white/[0.055]" : "border-[#E5E7EB] hover:bg-[#F8FAFC]",
        !onClick && "cursor-default",
      )}
    >
      {Icon && <Icon className={cn("h-5 w-5 shrink-0", isDark ? "text-[#D8D8D8]" : "text-[#475569]")} />}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-extrabold", isDark ? "text-white" : "text-[#111827]")}>{title}</span>
        {description && <span className={cn("mt-1 block text-xs font-semibold leading-5", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{description}</span>}
      </span>
      {value && <span className={cn("max-w-[220px] truncate text-sm font-semibold", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{value}</span>}
      {trailing}
      {onClick && !trailing && <ChevronRight className={cn("h-4 w-4 shrink-0", isDark ? "text-[#8C8C8C]" : "text-[#94A3B8]")} />}
    </button>
  );
}

export default function DesktopSettingsPanel({ initialSection = "account", open = true, modal = false, onClose }) {
  const navigate = useNavigate();
  const { prefs, setPrefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const normalizeSection = (sectionId) => (["account", "general", "notifications", "report-issue", "help-center", "about"].includes(sectionId) ? sectionId : "account");
  const [activeSection, setActiveSection] = useState(() => normalizeSection(initialSection));
  const [accountPane, setAccountPane] = useState("");
  const [generalPane, setGeneralPane] = useState("");
  const [aboutPane, setAboutPane] = useState("");
  const [user, setUser] = useState(() => readStoredUser());
  const [saving, setSaving] = useState("");
  const [emailChange, setEmailChange] = useState({ currentPassword: "", newEmail: "", code: "", pendingEmail: "" });
  const [passwordChange, setPasswordChange] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordRecovery, setPasswordRecovery] = useState({ email: "", sent: false });
  const [issueReport, setIssueReport] = useState({ title: "", description: "", attachments: [] });
  const [openHelpTopic, setOpenHelpTopic] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const issueCameraInputRef = useRef(null);
  const issuePhotosInputRef = useRef(null);
  const issueFilesInputRef = useRef(null);

  const navItems = [
    { id: "account", title: "Account", icon: KeyRound },
    { id: "general", title: "General", icon: Settings },
    { id: "notifications", title: "Notifications", icon: Bell },
    { id: "report-issue", title: "Report App Issue", icon: Flag },
    { id: "help-center", title: "Help Center", icon: HelpCircle },
    { id: "about", title: "About", icon: Info },
  ];
  const email = user?.email || "";
  const plan = user?.authProvider === "guest" ? "Guest" : "Free";
  const currentLanguage = LANGUAGE_OPTIONS.find((item) => item.value === (prefs.appLanguage || prefs.language)) || LANGUAGE_OPTIONS[0];
  const currentTheme = prefs.theme || "system";
  const currentAccent = COLOR_OPTIONS.find((item) => item.value.toLowerCase() === String(prefs.appColor || prefs.accentColor || "#193B68").toLowerCase()) || COLOR_OPTIONS[0];
  const currentMessageColor = COLOR_OPTIONS.find((item) => item.value.toLowerCase() === String(prefs.messageColor || prefs.chatColor || "#193B68").toLowerCase()) || COLOR_OPTIONS[0];
  const avatarColor = useMemo(() => avatarColorFor(user), [user]);
  const panelBg = isDark ? "border-white/[0.08] bg-[#202020]" : "border-white/80 bg-[#FAFBFC]";
  const sidebarBg = isDark ? "border-white/[0.08] bg-[#181818]" : "border-[#E5E7EB] bg-white";
  const muted = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const closeSettings = onClose || (() => navigate("/chat"));

  useEffect(() => {
    setActiveSection(normalizeSection(initialSection));
    setAccountPane("");
    setGeneralPane("");
    setAboutPane("");
  }, [initialSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (!cancelled && profile) setUser(profile);
      })
      .catch((error) => {
        console.warn("Could not load settings profile", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setSection = (sectionId) => {
    const nextSection = normalizeSection(sectionId);
    setActiveSection(nextSection);
    setAccountPane("");
    setGeneralPane("");
    setAboutPane("");
    if (!modal) {
      navigate(`/settings/${nextSection}`, { replace: false });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setLogoutConfirmOpen(false);
      closeSettings();
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not log out."));
    }
  };

  const savePreference = async (patch) => {
    setSaving("preferences");
    try {
      const result = await updatePreferences(patch);
      if (result?.preferences) setPrefs(result.preferences);
      if (result?.user) setUser(result.user);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save settings."));
    } finally {
      setSaving("");
    }
  };

  const isNotificationEnabled = (row) => {
    const section = prefs.notificationPreferences?.[row.section] || {};
    return prefs.notificationsEnabled !== false && row.keys.some((key) => section[key] === true);
  };

  const toggleNotificationRow = async (row) => {
    const enabled = !isNotificationEnabled(row);
    const notificationPreferences = {
      ...(prefs.notificationPreferences || {}),
      [row.section]: {
        ...(prefs.notificationPreferences?.[row.section] || {}),
        ...Object.fromEntries(row.keys.map((key) => [key, enabled])),
      },
    };
    const notificationsEnabled = enabled || NOTIFICATION_ROWS.some((candidate) => {
      if (candidate.id === row.id) return false;
      const section = notificationPreferences[candidate.section] || {};
      return candidate.keys.some((key) => section[key] === true);
    });
    await savePreference({ notificationsEnabled, notificationPreferences });
  };

  const handleRequestEmailChange = async (event) => {
    event.preventDefault();
    setSaving("email");
    try {
      const result = await requestEmailChange(emailChange.currentPassword, emailChange.newEmail);
      setEmailChange((current) => ({ ...current, code: "", pendingEmail: result.pendingEmail || current.newEmail }));
      toast.success("Verification code sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not start email change."));
    } finally {
      setSaving("");
    }
  };

  const handleConfirmEmailChange = async (event) => {
    event.preventDefault();
    setSaving("email-code");
    try {
      const result = await confirmEmailChange(emailChange.code);
      if (result?.user) setUser(result.user);
      setEmailChange({ currentPassword: "", newEmail: "", code: "", pendingEmail: "" });
      toast.success("Email updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not confirm email change."));
    } finally {
      setSaving("");
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setSaving("password");
    try {
      await changePassword(passwordChange.currentPassword, passwordChange.newPassword, passwordChange.confirmPassword);
      setPasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change password."));
    } finally {
      setSaving("");
    }
  };

  const handleRequestPasswordReset = async (event) => {
    event.preventDefault();
    setSaving("forgot-password");
    try {
      await requestPasswordReset(passwordRecovery.email.trim());
      setPasswordRecovery((current) => ({ ...current, sent: true }));
      toast.success("Recovery email sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send recovery email."));
    } finally {
      setSaving("");
    }
  };

  const handleIssueFiles = async (files) => {
    const selectedFiles = Array.from(files || []).filter(Boolean).slice(0, 3 - issueReport.attachments.length);
    if (!selectedFiles.length) return;
    setSaving("issue-attachment");
    try {
      const attachments = await Promise.all(selectedFiles.map(createSupportAttachment));
      setIssueReport((current) => ({ ...current, attachments: [...current.attachments, ...attachments].slice(0, 3) }));
    } catch (error) {
      toast.error(error?.message || "Could not attach file.");
    } finally {
      setSaving("");
      [issueCameraInputRef, issuePhotosInputRef, issueFilesInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = "";
      });
    }
  };

  const handleSubmitIssueReport = async (event) => {
    event.preventDefault();
    if (!issueReport.title.trim() || !issueReport.description.trim()) return;
    setSaving("issue-report");
    try {
      await reportIssue({
        title: issueReport.title.trim(),
        description: issueReport.description.trim(),
        platform: "desktop",
        appVersion: APP_VERSION,
        attachments: issueReport.attachments,
      });
      setIssueReport({ title: "", description: "", attachments: [] });
      toast.success("Issue report sent to BlueMind support");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send issue report."));
    } finally {
      setSaving("");
    }
  };

  const Avatar = ({ large = false }) => (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-black/5", large ? "h-24 w-24" : "h-12 w-12")}
      style={user?.avatarUrl ? undefined : { backgroundColor: avatarColor }}
    >
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className={cn("font-extrabold text-white", large ? "text-3xl" : "text-base")}>{initialsFor(user)}</span>}
    </div>
  );

  const renderAccount = () => {
    if (accountPane === "change-email") {
      return (
        <div className="max-w-2xl space-y-5">
          <button type="button" onClick={() => setAccountPane("")} className="text-sm font-extrabold text-[#4C8DFF]">Back to Account</button>
          <form onSubmit={handleRequestEmailChange} className="space-y-4">
            <TextInput isDark={isDark} type="email" value={email} readOnly />
            <TextInput isDark={isDark} type="email" value={emailChange.newEmail} onChange={(event) => setEmailChange({ ...emailChange, newEmail: event.target.value })} placeholder="New Email" autoComplete="email" />
            <TextInput isDark={isDark} type="password" value={emailChange.currentPassword} onChange={(event) => setEmailChange({ ...emailChange, currentPassword: event.target.value })} placeholder="Current Password" autoComplete="current-password" />
            <PrimaryButton type="submit" loading={saving === "email"} disabled={!emailChange.currentPassword || !emailChange.newEmail || saving === "email"}>Continue</PrimaryButton>
          </form>
          {emailChange.pendingEmail && (
            <form onSubmit={handleConfirmEmailChange} className={cn("space-y-4 rounded-[24px] border p-4", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[#E5E7EB] bg-white")}>
              <p className={cn("text-sm font-semibold", muted)}>Enter the 6-digit code sent to {emailChange.pendingEmail}.</p>
              <TextInput isDark={isDark} value={emailChange.code} inputMode="numeric" onChange={(event) => setEmailChange({ ...emailChange, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="000000" />
              <PrimaryButton type="submit" loading={saving === "email-code"} disabled={!/^\d{6}$/.test(emailChange.code) || saving === "email-code"}>Confirm Email</PrimaryButton>
            </form>
          )}
        </div>
      );
    }

    if (accountPane === "change-password") {
      return (
        <div className="max-w-2xl space-y-5">
          <button type="button" onClick={() => setAccountPane("")} className="text-sm font-extrabold text-[#4C8DFF]">Back to Account</button>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <TextInput isDark={isDark} type="password" value={passwordChange.currentPassword} onChange={(event) => setPasswordChange({ ...passwordChange, currentPassword: event.target.value })} placeholder="Current Password" autoComplete="current-password" />
            <TextInput isDark={isDark} type="password" value={passwordChange.newPassword} onChange={(event) => setPasswordChange({ ...passwordChange, newPassword: event.target.value })} placeholder="New Password" autoComplete="new-password" />
            <TextInput isDark={isDark} type="password" value={passwordChange.confirmPassword} onChange={(event) => setPasswordChange({ ...passwordChange, confirmPassword: event.target.value })} placeholder="Confirm Password" autoComplete="new-password" />
            <PrimaryButton type="submit" loading={saving === "password"} disabled={!passwordChange.currentPassword || !passwordChange.newPassword || passwordChange.newPassword !== passwordChange.confirmPassword || saving === "password"}>Save</PrimaryButton>
          </form>
          <button type="button" onClick={() => setAccountPane("forgot-password")} className="text-sm font-bold text-[#4C8DFF]">Forgot Password?</button>
        </div>
      );
    }

    if (accountPane === "forgot-password") {
      return (
        <div className="max-w-2xl space-y-5">
          <button type="button" onClick={() => setAccountPane("change-password")} className="text-sm font-extrabold text-[#4C8DFF]">Back to Change Password</button>
          <form onSubmit={handleRequestPasswordReset} className="space-y-4">
            <TextInput isDark={isDark} type="email" value={passwordRecovery.email} onChange={(event) => setPasswordRecovery({ email: event.target.value, sent: false })} placeholder={email || "account@email.com"} autoComplete="email" />
            <PrimaryButton type="submit" loading={saving === "forgot-password"} disabled={!passwordRecovery.email.trim() || saving === "forgot-password"}>Send Recovery Email</PrimaryButton>
          </form>
          {passwordRecovery.sent && <p className={cn("text-sm font-semibold", muted)}>If this email belongs to a BlueMind account, a recovery email has been sent.</p>}
        </div>
      );
    }

    return (
      <SettingCard isDark={isDark} className="max-w-3xl">
        <Row isDark={isDark} icon={Mail} title="Email" value={email || "Unavailable"} />
        <Row isDark={isDark} icon={Mail} title="Change Email" description="Update the email connected to your BlueMind account." onClick={() => setAccountPane("change-email")} />
        <Row isDark={isDark} icon={KeyRound} title="Change Password" description="Change your account password securely." onClick={() => setAccountPane("change-password")} />
        <Row isDark={isDark} icon={CreditCard} title="Subscription" value={plan} description="Current BlueMind plan." />
      </SettingCard>
    );
  };

  const renderColorSelector = ({ title, description, activeColor, onSelect }) => (
    <div className="max-w-4xl space-y-5">
      <button type="button" onClick={() => setGeneralPane("")} className="text-sm font-extrabold text-[#4C8DFF]">Back to General</button>
      <div>
        <h3 className="text-xl font-extrabold">{title}</h3>
        <p className={cn("mt-1 text-sm font-semibold", muted)}>{description}</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onSelect(color)}
            className={cn("flex min-h-[64px] items-center gap-3 rounded-[20px] border px-4 transition-colors", activeColor.value === color.value ? "border-[#193B68] bg-[#193B68]/10" : isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[#E5E7EB] bg-white")}
          >
            <span className="h-6 w-6 rounded-full shadow-sm" style={{ backgroundColor: color.value }} />
            <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{color.label}</span>
            {activeColor.value === color.value && <Check className="h-4 w-4 text-[#4C8DFF]" />}
          </button>
        ))}
      </div>
    </div>
  );

  const renderGeneral = () => {
    if (generalPane === "language") {
      return (
        <div className="max-w-3xl space-y-5">
          <button type="button" onClick={() => setGeneralPane("")} className="text-sm font-extrabold text-[#4C8DFF]">Back to General</button>
          <SettingCard isDark={isDark}>
            {LANGUAGE_OPTIONS.map((language) => (
              <Row
                key={language.value}
                isDark={isDark}
                icon={Globe2}
                title={language.label}
                trailing={currentLanguage.value === language.value ? <Check className="h-5 w-5 text-[#4C8DFF]" /> : null}
                onClick={() => savePreference({ appLanguage: language.value, language: language.value })}
              />
            ))}
          </SettingCard>
        </div>
      );
    }

    if (generalPane === "appearance") {
      return (
        <div className="max-w-3xl space-y-5">
          <button type="button" onClick={() => setGeneralPane("")} className="text-sm font-extrabold text-[#4C8DFF]">Back to General</button>
          <SettingCard isDark={isDark}>
            {["system", "dark", "light"].map((theme) => (
              <Row
                key={theme}
                isDark={isDark}
                icon={Moon}
                title={theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
                trailing={currentTheme === theme ? <Check className="h-5 w-5 text-[#4C8DFF]" /> : null}
                onClick={() => savePreference({ theme })}
              />
            ))}
          </SettingCard>
        </div>
      );
    }

    if (generalPane === "accent-color") {
      return renderColorSelector({
        title: "Accent Color",
        description: "Choose your BlueMind accent color.",
        activeColor: currentAccent,
        onSelect: (color) => savePreference({ appColor: color.value, accentColor: color.value }),
      });
    }

    if (generalPane === "message-color") {
      return renderColorSelector({
        title: "Message Color",
        description: "Choose the color of your messages.",
        activeColor: currentMessageColor,
        onSelect: (color) => savePreference({ messageColor: color.value, chatColor: color.value }),
      });
    }

    return (
      <SettingCard isDark={isDark} className="max-w-3xl">
        <Row isDark={isDark} icon={Globe2} title="Language" description="Choose your application language." value={currentLanguage.label} onClick={() => setGeneralPane("language")} />
        <Row isDark={isDark} icon={Moon} title="Appearance" description="Choose application theme." value={currentTheme === "system" ? "System" : currentTheme === "dark" ? "Dark" : "Light"} onClick={() => setGeneralPane("appearance")} />
        <Row isDark={isDark} icon={Palette} title="Accent Color" description="Choose your BlueMind accent color." value={currentAccent.label} onClick={() => setGeneralPane("accent-color")} />
        <Row isDark={isDark} icon={Palette} title="Message Color" description="Choose the color of your messages." value={currentMessageColor.label} onClick={() => setGeneralPane("message-color")} />
        <Row isDark={isDark} icon={Cake} title="Birthday Greetings" description="Receive birthday wishes and celebration effects." trailing={<Toggle checked={prefs.birthdayGreetings !== false} disabled={saving === "preferences"} isDark={isDark} onChange={() => savePreference({ birthdayGreetings: prefs.birthdayGreetings === false })} />} />
        <Row isDark={isDark} icon={Sparkles} title="Animations" description="Enable visual effects and transitions." trailing={<Toggle checked={prefs.animations !== false} disabled={saving === "preferences"} isDark={isDark} onChange={() => savePreference({ animations: prefs.animations === false })} />} />
      </SettingCard>
    );
  };

  const renderNotifications = () => (
    <SettingCard isDark={isDark} className="max-w-3xl">
      {NOTIFICATION_ROWS.map((row) => (
        <Row
          key={row.id}
          isDark={isDark}
          icon={Bell}
          title={row.title}
          description={row.description}
          trailing={<Toggle checked={isNotificationEnabled(row)} disabled={saving === "preferences"} isDark={isDark} onChange={() => toggleNotificationRow(row)} />}
        />
      ))}
    </SettingCard>
  );

  const renderReportIssue = () => (
    <form onSubmit={handleSubmitIssueReport} className="max-w-3xl space-y-5">
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">Issue Title</span>
        <TextInput isDark={isDark} value={issueReport.title} onChange={(event) => setIssueReport((current) => ({ ...current, title: event.target.value }))} placeholder="Cannot upload images" maxLength={140} />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">Issue Description</span>
        <textarea
          value={issueReport.description}
          onChange={(event) => setIssueReport((current) => ({ ...current, description: event.target.value }))}
          placeholder="Describe what happened and what you expected."
          rows={8}
          className={cn("w-full resize-none rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 outline-none", isDark ? "border-white/[0.10] bg-[#171717] text-white placeholder:text-[#777]" : "border-[#CBD5E1] bg-[#F8FAFC] text-[#111827] placeholder:text-[#94A3B8]")}
        />
      </label>
      <SettingCard isDark={isDark} className="p-4">
        <p className="text-sm font-extrabold">Attach screenshots or files</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            ["Camera", Camera, () => issueCameraInputRef.current?.click()],
            ["Photos", FileUp, () => issuePhotosInputRef.current?.click()],
            ["Files", FileUp, () => issueFilesInputRef.current?.click()],
          ].map(([label, Icon, action]) => (
            <button key={label} type="button" onClick={action} className={cn("flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-extrabold", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[#E5E7EB] bg-[#F8FAFC]")}>
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
        {issueReport.attachments.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {issueReport.attachments.map((attachment, index) => (
              <div key={`${attachment.name}-${index}`} className={cn("relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border", isDark ? "border-white/[0.08] bg-black/20" : "border-[#E5E7EB] bg-white")}>
                {attachment.type.startsWith("image/") ? <img src={attachment.dataUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-bold">{attachment.name}</div>}
                <button type="button" onClick={() => setIssueReport((current) => ({ ...current, attachments: current.attachments.filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingCard>
      <PrimaryButton type="submit" loading={saving === "issue-report"} disabled={!issueReport.title.trim() || issueReport.description.trim().length < 10 || saving === "issue-report"}>Submit report</PrimaryButton>
      <input ref={issueCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleIssueFiles(event.target.files)} />
      <input ref={issuePhotosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleIssueFiles(event.target.files)} />
      <input ref={issueFilesInputRef} type="file" multiple className="hidden" onChange={(event) => handleIssueFiles(event.target.files)} />
    </form>
  );

  const renderHelpCenter = () => (
    <div className="max-w-3xl space-y-3">
      {HELP_TOPICS.map((topic) => {
        const open = openHelpTopic === topic.title;
        return (
          <button key={topic.title} type="button" onClick={() => setOpenHelpTopic(open ? "" : topic.title)} className={cn("w-full rounded-[22px] border p-5 text-left transition-colors", isDark ? "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.07]" : "border-[#E5E7EB] bg-white hover:bg-[#F8FAFC]")}>
            <span className="flex items-center gap-3 text-base font-extrabold">
              <HelpCircle className="h-5 w-5" />
              <span className="flex-1">{topic.title}</span>
              <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
            </span>
            <AnimatePresence initial={false}>
              {open && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={cn("overflow-hidden pt-3 text-sm font-semibold leading-6", muted)}>
                  {topic.text}
                </motion.p>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );

  const renderAbout = () => {
    if (aboutPane === "privacy") {
      return (
        <div className="max-w-3xl space-y-4">
          <button type="button" onClick={() => setAboutPane("")} className="text-sm font-extrabold text-[#4C8DFF]">Back to About</button>
          <SettingCard isDark={isDark} className="p-6">
            <h3 className="text-xl font-extrabold">Privacy Policy</h3>
            <p className={cn("mt-3 text-sm font-semibold leading-7", muted)}>BlueMind AI uses your account data, chat content, uploaded files, reminders, profile details, and settings to provide the app experience you request. Profile and preference data stays connected to your authenticated account so desktop and mobile stay in sync.</p>
          </SettingCard>
        </div>
      );
    }
    if (aboutPane === "terms") {
      return (
        <div className="max-w-3xl space-y-4">
          <button type="button" onClick={() => setAboutPane("")} className="text-sm font-extrabold text-[#4C8DFF]">Back to About</button>
          <SettingCard isDark={isDark} className="p-6">
            <h3 className="text-xl font-extrabold">Terms of Service</h3>
            <p className={cn("mt-3 text-sm font-semibold leading-7", muted)}>Use BlueMind AI for lawful learning, productivity, research, writing, planning, and creative work. Review AI-generated content before relying on it, submitting it, or sharing it.</p>
          </SettingCard>
        </div>
      );
    }
    return (
      <div className="max-w-3xl space-y-5">
        <SettingCard isDark={isDark} className="p-7 text-center">
          <h3 className="text-2xl font-extrabold">BlueMind AI</h3>
          <p className={cn("mx-auto mt-3 max-w-xl text-sm font-semibold leading-7", muted)}>BlueMind AI is an AI-powered learning and productivity platform designed to help students organize knowledge, study smarter, manage plans, upload files, and interact with intelligent assistants.</p>
        </SettingCard>
        <SettingCard isDark={isDark}>
          <Row isDark={isDark} icon={Info} title="Version" value={APP_VERSION} />
          <Row isDark={isDark} icon={Mail} title="Support Email" value={SUPPORT_EMAIL} onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}`; }} />
          <Row isDark={isDark} icon={Shield} title="Privacy Policy" onClick={() => setAboutPane("privacy")} />
          <Row isDark={isDark} icon={BookOpen} title="Terms of Service" onClick={() => setAboutPane("terms")} />
          <Row isDark={isDark} icon={Globe2} title="Website" value="bluemind-frontend.vercel.app" onClick={() => window.open("https://bluemind-frontend.vercel.app", "_blank", "noopener,noreferrer")} />
        </SettingCard>
        <p className={cn("text-center text-xs font-semibold", muted)}>Copyright BlueMind AI</p>
      </div>
    );
  };

  const renderContent = () => {
    if (activeSection === "account") return renderAccount();
    if (activeSection === "general") return renderGeneral();
    if (activeSection === "notifications") return renderNotifications();
    if (activeSection === "report-issue") return renderReportIssue();
    if (activeSection === "help-center") return renderHelpCenter();
    if (activeSection === "about") return renderAbout();
    return renderAccount();
  };

  const pageTitle = navItems.find((item) => item.id === activeSection)?.title || "Settings";

  if (!open) return null;

  const panel = (
      <section className={cn("relative grid h-[min(860px,calc(100vh-48px))] w-full max-w-6xl grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-[34px] border shadow-2xl", panelBg)}>
        <aside className={cn("flex min-h-0 flex-col border-r p-4", sidebarBg)}>
          <button type="button" onClick={() => setSection("account")} className="mb-5 flex items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
            <Avatar />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold">BlueMind Settings</span>
              <span className={cn("block truncate text-xs font-semibold", muted)}>{email || "Account settings"}</span>
            </span>
          </button>
          <nav className="min-h-0 flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex min-h-[46px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-extrabold transition-colors",
                    active
                      ? isDark ? "bg-white/[0.10] text-white" : "bg-[#193B68]/10 text-[#193B68]"
                      : isDark ? "text-[#D8D8D8] hover:bg-white/[0.06] hover:text-white" : "text-[#334155] hover:bg-[#EEF2F7] hover:text-[#111827]",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.title}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className={cn(
              "mt-4 flex min-h-[50px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-extrabold transition-colors",
              isDark ? "text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Log out
          </button>
        </aside>

        <div className="flex min-h-0 flex-col">
          <header className={cn("flex h-20 shrink-0 items-center justify-between border-b px-8", isDark ? "border-white/[0.08]" : "border-[#E5E7EB]")}>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">{pageTitle}</h1>
              <p className={cn("mt-1 text-sm font-semibold", muted)}>Use the sidebar to switch settings sections.</p>
            </div>
            <button type="button" onClick={closeSettings} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors", isDark ? "text-white hover:bg-white/[0.08]" : "text-[#111827] hover:bg-[#EEF2F7]")} aria-label="Close settings">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
            <AnimatePresence mode="wait">
              <motion.div key={`${activeSection}-${accountPane}-${generalPane}-${aboutPane}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: "easeOut" }}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence>
          {logoutConfirmOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-6"
            >
              <motion.div
                initial={{ y: 14, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 14, opacity: 0, scale: 0.98 }}
                className={cn("w-full max-w-md rounded-[28px] p-6 ring-1", isDark ? "bg-[#262626] ring-white/[0.08]" : "bg-white ring-black/[0.08]")}
              >
                <p className={cn("text-lg font-extrabold", isDark ? "text-white" : "text-[#111827]")}>Log out?</p>
                <p className={cn("mt-2 text-sm font-medium leading-6", muted)}>You will need to sign in again to use BlueMind AI.</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setLogoutConfirmOpen(false)} className={cn("min-h-12 rounded-2xl text-sm font-bold", isDark ? "bg-white/[0.08] text-white" : "bg-[#EEF2F7] text-[#111827]")}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleLogout} className="min-h-12 rounded-2xl bg-red-600 text-sm font-bold text-white">
                    Log out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-6" data-testid="desktop-settings-modal">
        <motion.button
          type="button"
          aria-label="Close settings"
          className="absolute inset-0 bg-black/45 backdrop-blur-[5px]"
          onClick={closeSettings}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
        <motion.div
          className="relative z-10 w-full max-w-6xl"
          initial={{ opacity: 0, y: 18, scale: 0.965 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.975 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {panel}
        </motion.div>
      </div>
    );
  }

  return (
    <main className={cn("flex min-h-screen items-center justify-center p-6", isDark ? "bg-[#151515] text-white" : "bg-[#EEF2F7] text-[#111827]")}>
      {panel}
    </main>
  );
}
