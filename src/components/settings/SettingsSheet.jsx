import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
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
  Pencil,
  Shield,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, typeClasses } from "@/lib/interactions";
import { getApiErrorMessage } from "@/services/api";
import {
  changePassword,
  confirmEmailChange,
  logoutUser,
  requestEmailChange,
  requestPasswordReset,
} from "@/services/authService";
import { getProfile, updatePreferences, updateProfile } from "@/services/profileService";
import { readStoredUser } from "@/services/storageKeys";
import { reportIssue } from "@/services/supportService";
import { AVATAR_COLORS, COLOR_OPTIONS } from "@/theme/colors";

const ACCENT_COLORS = COLOR_OPTIONS;
const MESSAGE_COLORS = COLOR_OPTIONS;
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
    section: "studyPlan",
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
    keys: ["newLoginDetected", "passwordChanged", "emailChanged", "securityAlerts", "accountActivityAlerts"],
  },
  {
    id: "appUpdates",
    title: "App Update Notifications",
    description: "Receive feature updates and announcements.",
    section: "system",
    keys: ["newFeatures", "appUpdates", "maintenanceAnnouncements", "serviceAlerts"],
  },
  {
    id: "birthday",
    title: "Birthday Notifications",
    description: "Receive birthday greetings and celebration messages.",
    section: "birthday",
    keys: ["greetings"],
  },
];
const APP_VERSION = "0.1.0";
const SUPPORT_EMAIL = "supportbluemindai@gmail.com";
const HELP_TOPICS = [
  {
    question: "How do I use BlueMind?",
    answer: "Use BlueMind to chat with AI, upload images and PDFs, create study plans, organize learning, and manage reminders. Start from chat, choose a tool when needed, then send your question or file.",
  },
  {
    question: "How do I upload images?",
    answer: "Press +, select Camera or Photos, choose an image, then send it with your message.",
  },
  {
    question: "How do I upload PDF files?",
    answer: "Press +, select Files, choose your PDF, then send it. BlueMind will use the file as context for your request.",
  },
  {
    question: "How do I change my password?",
    answer: "Open Settings, choose Account, then Change Password. Enter your current password, new password, and confirmation, then save.",
  },
  {
    question: "How do notifications work?",
    answer: "Open Settings, choose Notifications, then turn each category on or off. Reminder notifications use your reminder schedule, while AI, security, app update, study, email, and birthday notifications follow your saved preferences.",
  },
  {
    question: "How do I change language?",
    answer: "Open Settings, choose General, then Language. Select English, العربية, or Svenska. The selection is saved and shared across desktop and mobile.",
  },
  {
    question: "How do I contact support?",
    answer: `Email ${SUPPORT_EMAIL}, or use Report an Issue from Settings to send a detailed report with your account email and optional screenshot.`,
  },
];

function initialsFor(user) {
  const name = String(user?.name || user?.email || "BlueMind").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1
    ? `${parts[0][0] || ""}${parts[1][0] || ""}`
    : name.slice(0, 2);

  return letters.toUpperCase();
}

function avatarColorFor(user) {
  const source = `${user?.name || ""}${user?.email || ""}` || "BlueMind";
  const hash = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function createAvatarDataUrl(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const sourceX = ((image.naturalWidth || image.width) - sourceSize) / 2;
    const sourceY = ((image.naturalHeight || image.height) - sourceSize) / 2;

    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

function SettingRow({ icon: Icon, title, value, trailing, accent, danger, disabled, onClick, children, isDark = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[68px] w-full items-center border-b px-4 text-left last:border-b-0",
        iconClasses.iconText,
        onClick && interactionClasses.menuItem,
        isDark ? "border-white/[0.07]" : "border-[var(--bm-border)]",
        disabled && "opacity-55",
      )}
    >
      <Icon className={cn("shrink-0", iconClasses.sidebar, danger ? "text-red-500" : accent ? "text-[var(--bm-primary)]" : isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block font-semibold", typeClasses.body, danger ? "text-red-500" : accent ? "text-[#2563EB]" : isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
          {title}
        </span>
        {children}
      </span>
      {value && <span className={cn("max-w-[42%] truncate font-medium", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{value}</span>}
      {trailing}
      {onClick && !disabled && !trailing && <ChevronRight className={cn("shrink-0", iconClasses.button, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")} />}
    </button>
  );
}

function ToggleSwitch({ checked, isDark = true }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors",
        checked ? "bg-[var(--bluemind-app-color,var(--bm-primary))]" : isDark ? "bg-white/15" : "bg-[var(--bm-border-strong)]",
      )}
      aria-hidden="true"
    >
      <span className={cn("h-6 w-6 rounded-full bg-white shadow-sm transition-transform", checked && "translate-x-6")} />
    </span>
  );
}

function SettingsCard({ children, isDark = true }) {
  return (
    <div className={cn("overflow-hidden rounded-[26px] shadow-sm ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      {children}
    </div>
  );
}

function SectionTitle({ children, isDark = true }) {
  return <h3 className={cn("mb-2 px-1 font-bold uppercase tracking-[0.08em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{children}</h3>;
}

function ComingSoonPanel({ title, isDark = true }) {
  return (
    <div className={cn("rounded-[26px] p-5 text-center ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("font-bold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{title}</p>
      <p className={cn("mt-2 font-medium", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Coming Soon</p>
    </div>
  );
}

function SettingsInput({ label, readOnly, isDark = true, ...props }) {
  return (
    <label className="block">
      <span className={cn("mb-2 block font-bold uppercase tracking-[0.08em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{label}</span>
      <input
        {...props}
        readOnly={readOnly}
        className={cn(
          inputClasses.field,
          "font-semibold",
          typeClasses.body,
          readOnly && "cursor-default text-[var(--bm-text-secondary)]",
        )}
      />
    </label>
  );
}

function PrimarySettingsButton({ children, loading, ...props }) {
  return (
    <button
      type="submit"
      {...props}
      className={cn(
        "flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--bm-primary)] px-4 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-55",
        typeClasses.small,
        interactionClasses.control,
        props.className,
      )}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : children}
    </button>
  );
}

export default function SettingsSheet({
  open = true,
  onClose,
  mobile = false,
  initialPane = "main",
  overlay = true,
}) {
  const navigate = useNavigate();
  const { prefs, resolvedTheme, setPrefs } = useApp();
  const isDark = resolvedTheme === "dark";
  const fileInputRef = useRef(null);
  const issueCameraInputRef = useRef(null);
  const issuePhotosInputRef = useRef(null);
  const issueFilesInputRef = useRef(null);
  const [pane, setPane] = useState(initialPane === "settings" ? "main" : initialPane);
  const [user, setUser] = useState(() => readStoredUser());
  const [saving, setSaving] = useState("");
  const [openHelpTopic, setOpenHelpTopic] = useState(HELP_TOPICS[0]?.question || "");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [issueReport, setIssueReport] = useState({
    title: "",
    description: "",
    attachments: [],
  });
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
  const [passwordRecovery, setPasswordRecovery] = useState({
    email: "",
    sent: false,
  });

  useEffect(() => {
    if (open) {
      setPane(initialPane === "settings" ? "main" : initialPane);
    }
  }, [initialPane, open]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (!cancelled && profile) setUser(profile);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open]);

  const appearanceText = useMemo(() => {
    const theme = prefs.theme || "system";
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }, [prefs.theme]);
  const accent = ACCENT_COLORS.find((color) => color.value.toLowerCase() === String(prefs.appColor || prefs.accentColor || "var(--bm-primary)").toLowerCase()) || ACCENT_COLORS[0];
  const currentLanguage = LANGUAGE_OPTIONS.find((language) => language.value === String(prefs.appLanguage || prefs.language || "en").toLowerCase()) || LANGUAGE_OPTIONS[0];
  const activeMessageColor = MESSAGE_COLORS.find((color) => color.value.toLowerCase() === String(prefs.chatColor || "var(--bm-primary)").toLowerCase()) || MESSAGE_COLORS[0];
  const plan = user?.subscription?.plan || user?.plan || user?.accountPlan || (user?.authProvider === "guest" ? "Guest" : "Free");

  const close = () => {
    setLogoutConfirmOpen(false);
    onClose?.();
  };

  const savePreference = async (patch) => {
    const previousPrefs = prefs;
    setPrefs({ ...prefs, ...patch });
    setSaving("preferences");

    try {
      const result = await updatePreferences(patch);
      if (result?.preferences) setPrefs(result.preferences);
      if (result?.user) setUser(result.user);
      toast.success("Settings saved");
    } catch (error) {
      setPrefs(previousPrefs);
      toast.error(getApiErrorMessage(error, "Could not save settings."));
    } finally {
      setSaving("");
    }
  };

  const handleAvatarFile = async (file) => {
    if (!file) return;

    setSaving("avatar");
    try {
      const avatarUrl = await createAvatarDataUrl(file);
      setUser((current) => ({ ...current, avatarUrl }));
      const next = await updateProfile({ avatarUrl });
      if (next) setUser(next);
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, error.message || "Could not update profile picture."));
    } finally {
      setSaving("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      close();
      navigate(mobile ? "/mobile" : "/", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not log out."));
    }
  };

  const handleRequestEmailChange = async (event) => {
    event.preventDefault();
    if (!emailChange.currentPassword || !emailChange.newEmail) return;

    setSaving("change-email");
    try {
      const result = await requestEmailChange(emailChange.currentPassword, emailChange.newEmail);
      setEmailChange((current) => ({
        ...current,
        code: "",
        pendingEmail: result?.pendingEmail || current.newEmail,
      }));
      toast.success("Verification code sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not start email change."));
    } finally {
      setSaving("");
    }
  };

  const handleConfirmEmailChange = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(emailChange.code)) return;

    setSaving("confirm-email");
    try {
      const result = await confirmEmailChange(emailChange.code);
      if (result?.user) setUser(result.user);
      setEmailChange({ currentPassword: "", newEmail: "", code: "", pendingEmail: "" });
      toast.success("Email updated");
      backToMain();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not confirm email change."));
    } finally {
      setSaving("");
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (
      !passwordChange.currentPassword ||
      !passwordChange.newPassword ||
      passwordChange.newPassword !== passwordChange.confirmPassword
    ) {
      return;
    }

    setSaving("change-password");
    try {
      await changePassword(
        passwordChange.currentPassword,
        passwordChange.newPassword,
        passwordChange.confirmPassword,
      );
      setPasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated");
      backToMain();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change password."));
    } finally {
      setSaving("");
    }
  };

  const handleRequestPasswordReset = async (event) => {
    event.preventDefault();
    if (!passwordRecovery.email.trim()) return;

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
      setIssueReport((current) => ({
        ...current,
        attachments: [...current.attachments, ...attachments].slice(0, 3),
      }));
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
        platform: mobile ? "mobile" : "desktop",
        appVersion: APP_VERSION,
        attachments: issueReport.attachments,
      });
      setIssueReport({ title: "", description: "", attachments: [] });
      toast.success("Issue report sent to BlueMind support");
      backToMain();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send issue report."));
    } finally {
      setSaving("");
    }
  };

  const openChild = (nextPane) => setPane(nextPane);
  const backToMain = () => setPane("main");
  const Row = (props) => <SettingRow isDark={isDark} {...props} />;
  const Card = (props) => <SettingsCard isDark={isDark} {...props} />;
  const Title = (props) => <SectionTitle isDark={isDark} {...props} />;
  const Input = (props) => <SettingsInput isDark={isDark} {...props} />;
  const descriptionClass = cn("mt-1 block text-xs font-medium leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]");

  const isNotificationEnabled = (row) => {
    const section = prefs.notificationPreferences?.[row.section] || {};
    return prefs.notificationsEnabled !== false && row.keys.some((key) => section[key] === true);
  };

  const toggleNotificationRow = (row) => {
    const enabled = !isNotificationEnabled(row);
    const nextSection = Object.fromEntries(row.keys.map((key) => [key, enabled]));
    const notificationPreferences = {
      ...(prefs.notificationPreferences || {}),
      [row.section]: {
        ...(prefs.notificationPreferences?.[row.section] || {}),
        ...nextSection,
      },
    };
    const notificationsEnabled = enabled || NOTIFICATION_ROWS.some((candidate) => {
      if (candidate.id === row.id) return false;
      const section = notificationPreferences[candidate.section] || {};
      return candidate.keys.some((key) => section[key] === true);
    });

    savePreference({ notificationsEnabled, notificationPreferences });
  };

  const renderProfileHeader = () => (
    <div className="flex flex-col items-center pb-6 pt-2 text-center">
      <div className="relative">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-white/10"
          style={user?.avatarUrl ? undefined : { backgroundColor: avatarColorFor(user) }}
          aria-label="Edit avatar"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-extrabold text-white">{initialsFor(user)}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn("absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bm-primary)] text-white shadow-lg ring-4", isDark ? "ring-[var(--bm-bg-card)]" : "ring-[var(--bm-bg-app)]")}
          aria-label="Edit profile picture"
        >
          {saving === "avatar" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className={cn("mt-4 max-w-full truncate text-xl font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{user?.name || "BlueMind User"}</p>
      <p className={cn("mt-1 max-w-full truncate text-sm font-medium", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{user?.email || ""}</p>
    </div>
  );

  const renderMain = () => (
    <>
      {renderProfileHeader()}

      <div className="space-y-6">
        <section>
          <Title>Account</Title>
          <Card>
            <Row icon={Mail} title="Email" value={user?.email || "Unavailable"} />
            <Row icon={Mail} title="Change Email" onClick={() => openChild("change-email")} />
            <Row icon={KeyRound} title="Change Password" onClick={() => openChild("change-password")} />
            <Row icon={CreditCard} title="Subscription" value={plan} onClick={() => openChild("subscription")} />
          </Card>
        </section>

        <section>
          <Title>App settings</Title>
          <Card>
            <Row icon={Settings} title="General" onClick={() => openChild("general")} />
            <Row icon={Bell} title="Notifications" onClick={() => openChild("notifications")} />
          </Card>
        </section>

        <section>
          <Title>Get help</Title>
          <Card>
            <Row icon={Flag} title="Report app issue" onClick={() => openChild("report-issue")} />
            <Row icon={HelpCircle} title="Help Center" onClick={() => openChild("help-center")} />
            <Row icon={Info} title="About" onClick={() => openChild("about")} />
          </Card>
        </section>

        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          className={cn("flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[26px] text-[15px] font-bold text-red-500 ring-1 active:bg-red-500/10", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </>
  );

  const renderChangeEmail = () => (
    <div className="space-y-5">
      <form onSubmit={handleRequestEmailChange} className="space-y-4">
        <Input
          label="Current Email"
          type="email"
          value={user?.email || ""}
          readOnly
          data-testid="settings-current-email"
        />
        <Input
          label="New Email"
          type="email"
          value={emailChange.newEmail}
          onChange={(event) => setEmailChange({ ...emailChange, newEmail: event.target.value })}
          placeholder="new@email.com"
          autoComplete="email"
          data-testid="settings-new-email"
        />
        <Input
          label="Current Password"
          type="password"
          value={emailChange.currentPassword}
          onChange={(event) => setEmailChange({ ...emailChange, currentPassword: event.target.value })}
          placeholder="Required to protect your account"
          autoComplete="current-password"
          data-testid="settings-email-current-password"
        />
        <PrimarySettingsButton
          disabled={!emailChange.currentPassword || !emailChange.newEmail || saving === "change-email"}
          loading={saving === "change-email"}
          data-testid="settings-change-email-continue"
        >
          Continue
        </PrimarySettingsButton>
      </form>

      {emailChange.pendingEmail && (
        <form onSubmit={handleConfirmEmailChange} className={cn("space-y-4 rounded-[24px] p-4 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
          <p className={cn("text-sm font-semibold leading-6", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>
            Enter the 6-digit code sent to {emailChange.pendingEmail}.
          </p>
          <Input
            label="Verification Code"
            inputMode="numeric"
            value={emailChange.code}
            onChange={(event) => setEmailChange({
              ...emailChange,
              code: event.target.value.replace(/\D/g, "").slice(0, 6),
            })}
            placeholder="000000"
            data-testid="settings-email-code"
          />
          <PrimarySettingsButton
            disabled={!/^\d{6}$/.test(emailChange.code) || saving === "confirm-email"}
            loading={saving === "confirm-email"}
            data-testid="settings-confirm-email-change"
          >
            Confirm Email
          </PrimarySettingsButton>
        </form>
      )}

      <button
        type="button"
        onClick={() => openChild("email-recovery")}
        className="text-sm font-bold text-[var(--bm-primary)]"
        data-testid="settings-email-recovery-link"
      >
        Forgot access to email?
      </button>
    </div>
  );

  const renderEmailRecovery = () => (
    <div className={cn("rounded-[26px] p-5 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("text-base font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Email recovery</p>
      <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        BlueMind does not currently expose an automated backend email-access recovery endpoint. If you are signed in and know your password, use Change Email. Otherwise, use the password recovery flow below to recover account access through your registered email.
      </p>
      <button
        type="button"
        onClick={() => openChild("forgot-password")}
        className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--bm-primary)] px-4 text-sm font-extrabold text-white active:bg-[var(--bm-primary-hover)]"
      >
        Open Password Recovery
      </button>
    </div>
  );

  const renderChangePassword = () => (
    <div className="space-y-5">
      <form onSubmit={handleChangePassword} className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          value={passwordChange.currentPassword}
          onChange={(event) => setPasswordChange({ ...passwordChange, currentPassword: event.target.value })}
          placeholder="Current password"
          autoComplete="current-password"
          data-testid="settings-current-password"
        />
        <Input
          label="New Password"
          type="password"
          value={passwordChange.newPassword}
          onChange={(event) => setPasswordChange({ ...passwordChange, newPassword: event.target.value })}
          placeholder="New password"
          autoComplete="new-password"
          data-testid="settings-new-password"
        />
        <Input
          label="Confirm Password"
          type="password"
          value={passwordChange.confirmPassword}
          onChange={(event) => setPasswordChange({ ...passwordChange, confirmPassword: event.target.value })}
          placeholder="Confirm password"
          autoComplete="new-password"
          data-testid="settings-confirm-password"
        />
        <PrimarySettingsButton
          disabled={
            !passwordChange.currentPassword ||
            !passwordChange.newPassword ||
            passwordChange.newPassword !== passwordChange.confirmPassword ||
            saving === "change-password"
          }
          loading={saving === "change-password"}
          data-testid="settings-change-password-save"
        >
          Save
        </PrimarySettingsButton>
      </form>

      <button
        type="button"
        onClick={() => openChild("forgot-password")}
        className="text-sm font-bold text-[var(--bm-primary)]"
        data-testid="settings-forgot-password-link"
      >
        Forgot Password?
      </button>
    </div>
  );

  const renderForgotPassword = () => (
    <div className="space-y-5">
      <form onSubmit={handleRequestPasswordReset} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={passwordRecovery.email}
          onChange={(event) => setPasswordRecovery({ email: event.target.value, sent: false })}
          placeholder={user?.email || "account@email.com"}
          autoComplete="email"
          data-testid="settings-recovery-email"
        />
        <PrimarySettingsButton
          disabled={!passwordRecovery.email.trim() || saving === "forgot-password"}
          loading={saving === "forgot-password"}
          data-testid="settings-send-recovery-email"
        >
          Send Recovery Email
        </PrimarySettingsButton>
      </form>
      {passwordRecovery.sent && (
        <div className={cn("rounded-[24px] p-4 text-sm font-semibold leading-6 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)] ring-white/[0.06]" : "bg-white text-[var(--bm-text-secondary)] ring-black/[0.06]")}>
          If this email belongs to a BlueMind account, a recovery email has been sent.
        </div>
      )}
    </div>
  );

  const renderSubscription = () => (
    <div className={cn("rounded-[26px] p-5 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("text-sm font-bold uppercase tracking-[0.08em]", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Current Plan</p>
      <p className={cn("mt-2 text-2xl font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{plan}</p>
      <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        Subscription data is read from your authenticated BlueMind account.
      </p>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-3">
      {["system", "dark", "light"].map((theme) => (
        <button
          key={theme}
          type="button"
          onClick={() => savePreference({ theme })}
          className={cn("flex min-h-[60px] w-full items-center gap-3 rounded-[22px] px-4 text-left ring-1", isDark ? "bg-[var(--bm-bg-elevated)] text-white ring-white/[0.06]" : "bg-white text-[var(--bm-text-primary)] ring-black/[0.06]")}
        >
          <Moon className={cn("h-5 w-5", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")} />
          <span className="flex-1 text-[15px] font-semibold capitalize">{theme}</span>
          {prefs.theme === theme && <Check className="h-5 w-5 text-[var(--bm-primary)]" />}
        </button>
      ))}
    </div>
  );

  const renderLanguage = () => (
    <div className="space-y-3">
      {LANGUAGE_OPTIONS.map((language) => (
        <button
          key={language.value}
          type="button"
          onClick={() => savePreference({ appLanguage: language.value, language: language.value })}
          className={cn("flex min-h-[60px] w-full items-center gap-3 rounded-[22px] px-4 text-left ring-1", isDark ? "bg-[var(--bm-bg-elevated)] text-white ring-white/[0.06]" : "bg-white text-[var(--bm-text-primary)] ring-black/[0.06]")}
        >
          <Globe2 className={cn("h-5 w-5", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")} />
          <span className="flex-1 text-[15px] font-semibold">{language.label}</span>
          {currentLanguage.value === language.value && <Check className="h-5 w-5 text-[var(--bm-primary)]" />}
        </button>
      ))}
    </div>
  );

  const renderGeneral = () => (
    <Card>
      <Row icon={Globe2} title="Language" value={currentLanguage.label} onClick={() => openChild("language")}>
        <span className={descriptionClass}>Choose your application language.</span>
      </Row>
      <Row icon={Moon} title="Appearance" value={appearanceText} onClick={() => openChild("appearance")}>
        <span className={descriptionClass}>Choose application theme.</span>
      </Row>
      <Row icon={Palette} title="Accent Color" value={accent.label} onClick={() => openChild("accent-color")}>
        <span className={descriptionClass}>Choose your BlueMind accent color.</span>
      </Row>
      <Row icon={Palette} title="Message Color" value={activeMessageColor.label} onClick={() => openChild("message-color")}>
        <span className={descriptionClass}>Choose the color of your messages.</span>
      </Row>
      <Row
        icon={Cake}
        title="Birthday Greetings"
        onClick={() => savePreference({ birthdayGreetings: prefs.birthdayGreetings === false })}
        trailing={<ToggleSwitch checked={prefs.birthdayGreetings !== false} isDark={isDark} />}
      >
        <span className={descriptionClass}>Receive birthday wishes and celebration effects.</span>
      </Row>
      <Row
        icon={Sparkles}
        title="Animations"
        onClick={() => savePreference({ animations: prefs.animations === false })}
        trailing={<ToggleSwitch checked={prefs.animations !== false} isDark={isDark} />}
      >
        <span className={descriptionClass}>Enable visual effects and transitions.</span>
      </Row>
    </Card>
  );

  const renderNotifications = () => (
    <Card>
      {NOTIFICATION_ROWS.map((row) => {
        const enabled = isNotificationEnabled(row);

        return (
          <Row
            key={row.id}
            icon={Bell}
            title={row.title}
            onClick={() => toggleNotificationRow(row)}
            trailing={<ToggleSwitch checked={enabled} isDark={isDark} />}
          >
            <span className={descriptionClass}>{row.description}</span>
          </Row>
        );
      })}
    </Card>
  );

  const renderReportIssue = () => (
    <form onSubmit={handleSubmitIssueReport} className="space-y-5">
      <Input
        label="Issue Title"
        value={issueReport.title}
        onChange={(event) => setIssueReport((current) => ({ ...current, title: event.target.value }))}
        placeholder="Cannot upload images"
        maxLength={140}
        data-testid="issue-title"
      />

      <label className="block">
        <span className={cn("mb-2 block text-xs font-bold uppercase tracking-[0.08em]", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Issue Description</span>
        <textarea
          value={issueReport.description}
          onChange={(event) => setIssueReport((current) => ({ ...current, description: event.target.value }))}
          placeholder="When I select an image on mobile the image does not appear inside chat."
          rows={7}
          maxLength={6000}
          className={cn(
            inputClasses.textarea,
            "resize-none font-semibold",
            typeClasses.body,
          )}
          data-testid="issue-description"
        />
      </label>

      <section className={cn("rounded-[26px] p-4 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
        <p className={cn("text-sm font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Attach Screenshot</p>
        <p className={cn("mt-1 text-xs font-medium leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          Add a screenshot, photo, or file that helps explain the issue.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => issueCameraInputRef.current?.click()}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl text-xs font-bold ring-1", isDark ? "bg-white/[0.05] text-white ring-white/[0.08]" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)] ring-black/[0.06]")}
          >
            <Camera className="h-5 w-5" />
            Camera
          </button>
          <button
            type="button"
            onClick={() => issuePhotosInputRef.current?.click()}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl text-xs font-bold ring-1", isDark ? "bg-white/[0.05] text-white ring-white/[0.08]" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)] ring-black/[0.06]")}
          >
            <FileUp className="h-5 w-5" />
            Photos
          </button>
          <button
            type="button"
            onClick={() => issueFilesInputRef.current?.click()}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl text-xs font-bold ring-1", isDark ? "bg-white/[0.05] text-white ring-white/[0.08]" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)] ring-black/[0.06]")}
          >
            <FileUp className="h-5 w-5" />
            Files
          </button>
        </div>

        {issueReport.attachments.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {issueReport.attachments.map((attachment, index) => (
              <div key={`${attachment.name}-${index}`} className={cn("relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1", isDark ? "bg-[var(--bm-bg-app)] ring-white/[0.08]" : "bg-[var(--bm-bg-elevated)] ring-black/[0.06]")}>
                {attachment.type.startsWith("image/") ? (
                  <img src={attachment.dataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-bold">
                    {attachment.name}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIssueReport((current) => ({
                    ...current,
                    attachments: current.attachments.filter((_, itemIndex) => itemIndex !== index),
                  }))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <PrimarySettingsButton
        disabled={!issueReport.title.trim() || issueReport.description.trim().length < 10 || saving === "issue-report"}
        loading={saving === "issue-report"}
        data-testid="send-issue-report"
      >
        Send
      </PrimarySettingsButton>
    </form>
  );

  const renderHelpCenter = () => (
    <div className="space-y-5">
      <section>
        <Title>Getting Started</Title>
        <Card>
          {HELP_TOPICS.map((topic) => {
            const isOpen = openHelpTopic === topic.question;
            return (
              <button
                key={topic.question}
                type="button"
                onClick={() => setOpenHelpTopic(isOpen ? "" : topic.question)}
                className={cn("w-full border-b px-4 py-4 text-left last:border-b-0", isDark ? "border-white/[0.07]" : "border-[var(--bm-border)]")}
              >
                <span className={cn("flex items-center gap-3 text-[15px] font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
                  <HelpCircle className={cn("h-5 w-5 shrink-0", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")} />
                  <span className="flex-1">{topic.question}</span>
                  <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-90", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")} />
                </span>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={cn("overflow-hidden pl-8 pt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}
                    >
                      {topic.answer}
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </Card>
      </section>
    </div>
  );

  const renderPrivacyPolicy = () => (
    <div className={cn("rounded-[26px] p-5 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("text-base font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Privacy Policy</p>
      <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        BlueMind AI uses your account data, chat content, uploaded files, reminders, profile details, and settings to provide the app experience you request. We keep profile and preference data connected to your authenticated account so desktop and mobile stay in sync.
      </p>
      <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        Support requests are sent to {SUPPORT_EMAIL} with your account email, timestamp, app version, platform, description, and any attachment you choose to include.
      </p>
    </div>
  );

  const renderTermsOfService = () => (
    <div className={cn("rounded-[26px] p-5 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("text-base font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Terms of Service</p>
      <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        Use BlueMind AI for lawful learning, productivity, research, writing, planning, and creative work. You are responsible for reviewing AI-generated content before relying on it, submitting it, or sharing it.
      </p>
      <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        Do not upload content you do not have permission to use, and do not use BlueMind to harm others, bypass security, or violate applicable rules.
      </p>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-5">
      <div className={cn("rounded-[26px] p-5 text-center ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
        <p className={cn("text-xl font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind AI</p>
        <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          BlueMind AI is an AI-powered learning and productivity platform designed to help students organize knowledge, study smarter, manage plans, upload files, and interact with intelligent assistants.
        </p>
      </div>
      <Card>
        <Row icon={Info} title="Version" value={APP_VERSION} />
        <Row icon={Mail} title="Support Email" value={SUPPORT_EMAIL} onClick={() => window.location.href = `mailto:${SUPPORT_EMAIL}`} />
        <Row icon={Shield} title="Privacy Policy" onClick={() => openChild("privacy-policy")} />
        <Row icon={BookOpen} title="Terms of Service" onClick={() => openChild("terms-of-service")} />
        <Row icon={Globe2} title="Website" value="bluemind-frontend.vercel.app" onClick={() => window.open("https://bluemind-frontend.vercel.app", "_blank", "noopener,noreferrer")} />
      </Card>
      <p className={cn("text-center text-xs font-semibold", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        Copyright BlueMind AI
      </p>
    </div>
  );

  const renderAccentColor = () => (
    <div className="grid grid-cols-2 gap-3">
      {ACCENT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => savePreference({ appColor: color.value, accentColor: color.value })}
          className={cn("flex min-h-[76px] items-center gap-3 rounded-[24px] px-4 text-left ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}
        >
          <span className="h-7 w-7 rounded-full" style={{ backgroundColor: color.value }} />
          <span className={cn("flex-1 text-sm font-bold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{color.label}</span>
          {accent.value === color.value && <Check className="h-5 w-5 text-[var(--bm-primary)]" />}
        </button>
      ))}
    </div>
  );

  const renderMessageColor = () => {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MESSAGE_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => savePreference({ chatColor: color.value })}
            className={cn("flex min-h-[74px] items-center gap-3 rounded-[24px] px-4 text-left ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}
            data-testid={`message-color-${color.label.toLowerCase()}`}
          >
            <span className="h-7 w-7 rounded-full shadow-sm ring-1 ring-black/10" style={{ backgroundColor: color.value }} />
            <span className={cn("min-w-0 flex-1 truncate text-sm font-bold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{color.label}</span>
            {activeMessageColor.value.toLowerCase() === color.value.toLowerCase() && <Check className="h-5 w-5 shrink-0 text-[var(--bm-primary)]" />}
          </button>
        ))}
      </div>
    );
  };

  const childTitles = {
    "change-email": "Change Email",
    "email-recovery": "Email Recovery",
    "change-password": "Change Password",
    "forgot-password": "Forgot Password",
    subscription: "Subscription",
    language: "Language",
    appearance: "Appearance",
    "accent-color": "Accent Color",
    "message-color": "Message Color",
    general: "General",
    notifications: "Notifications",
    "report-issue": "Report app issue",
    "help-center": "Help Center",
    about: "About",
    "privacy-policy": "Privacy Policy",
    "terms-of-service": "Terms of Service",
    account: "Account",
    profile: "Profile",
  };

  const renderChild = () => {
    if (pane === "change-email") return renderChangeEmail();
    if (pane === "email-recovery") return renderEmailRecovery();
    if (pane === "change-password") return renderChangePassword();
    if (pane === "forgot-password") return renderForgotPassword();
    if (pane === "subscription") return renderSubscription();
    if (pane === "general") return renderGeneral();
    if (pane === "language") return renderLanguage();
    if (pane === "appearance") return renderAppearance();
    if (pane === "accent-color") return renderAccentColor();
    if (pane === "message-color") return renderMessageColor();
    if (pane === "notifications") return renderNotifications();
    if (pane === "report-issue") return renderReportIssue();
    if (pane === "help-center") return renderHelpCenter();
    if (pane === "about") return renderAbout();
    if (pane === "privacy-policy") return renderPrivacyPolicy();
    if (pane === "terms-of-service") return renderTermsOfService();

    return <ComingSoonPanel title={childTitles[pane] || "Settings"} isDark={isDark} />;
  };

  const sheetContent = (
    <motion.div
      initial={{ y: "100%", opacity: 0.96 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex w-full flex-col overflow-hidden shadow-[0_-28px_90px_rgba(0,0,0,0.18)]",
        isDark ? "bg-[var(--bm-bg-card)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]",
        mobile ? "h-[88dvh] rounded-t-[34px]" : "mx-auto h-[86dvh] max-w-[560px] rounded-[34px]",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-5 pt-2">
        {pane === "main" ? (
          <span className="w-10" />
        ) : (
          <button type="button" onClick={backToMain} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "text-white active:bg-white/[0.08]" : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]")} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base font-extrabold">{pane === "main" ? "Settings" : childTitles[pane] || "Settings"}</h2>
        <button type="button" onClick={close} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "text-white active:bg-white/[0.08]" : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]")} aria-label="Close settings">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-2">
        {pane === "main" ? renderMain() : renderChild()}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleAvatarFile(event.target.files?.[0])}
      />
      <input
        ref={issueCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleIssueFiles(event.target.files)}
      />
      <input
        ref={issuePhotosInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => handleIssueFiles(event.target.files)}
      />
      <input
        ref={issueFilesInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        multiple
        className="hidden"
        onChange={(event) => handleIssueFiles(event.target.files)}
      />

      <AnimatePresence>
        {logoutConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end bg-black/55 p-4"
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className={cn("w-full rounded-[28px] p-5 ring-1", isDark ? "bg-[var(--bm-bg-elevated)] ring-white/[0.08]" : "bg-white ring-black/[0.08]")}
            >
              <p className={cn("text-lg font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Log out?</p>
              <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>You will need to sign in again to use BlueMind AI.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setLogoutConfirmOpen(false)} className={cn("min-h-12 rounded-2xl text-sm font-bold", isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>
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
    </motion.div>
  );

  if (!open) return null;

  if (!overlay) {
    return <div className={cn("flex min-h-[100dvh] items-end justify-center p-0 md:items-center md:p-6", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")}>{sheetContent}</div>;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] flex items-end justify-center bg-black/55 backdrop-blur-[14px] md:items-center md:p-6"
        onClick={close}
      >
        <div className="w-full md:flex md:justify-center" onClick={(event) => event.stopPropagation()}>
          {sheetContent}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
