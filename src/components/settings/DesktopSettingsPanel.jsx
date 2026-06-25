import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  BookOpen,
  Brain,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Database,
  FileUp,
  Flag,
  Globe2,
  HardDrive,
  HelpCircle,
  Info,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Moon,
  Palette,
  Shield,
  SlidersHorizontal,
  Sparkles,
  UserRound,
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
import { getProfile, updatePreferences } from "@/services/profileService";
import { readStoredUser } from "@/services/storageKeys";
import { reportIssue } from "@/services/supportService";
import { AVATAR_COLORS, COLOR_OPTIONS } from "@/theme/colors";

const SUPPORT_EMAIL = "supportbluemindai@gmail.com";
const APP_VERSION = process.env.REACT_APP_VERSION || "0.1.0";

const LANGUAGE_OPTIONS = [
  { label: "Auto-detect", value: "auto" },
  { label: "English", value: "en" },
  { label: "العربية", value: "ar" },
  { label: "Svenska", value: "sv" },
];

const APPEARANCE_OPTIONS = [
  { label: "System", value: "system" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
];

const CONTRAST_OPTIONS = [
  { label: "System", value: "system" },
  { label: "High", value: "high" },
  { label: "Low", value: "low" },
];

const NOTIFICATION_CHANNEL_OPTIONS = [
  { label: "Off", value: "off" },
  { label: "Push", value: "push" },
  { label: "Email", value: "email" },
  { label: "Push, Email", value: "push_email" },
];

const NOTIFICATION_ROWS = [
  {
    id: "codexTasks",
    title: "Codex Tasks",
    description: "Updates when long-running coding tasks finish or need attention.",
    defaultValue: "off",
  },
  {
    id: "groupChats",
    title: "Group Chats",
    description: "Activity from shared conversations and collaborative spaces.",
    defaultValue: "push",
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Product announcements, offers, and BlueMind news.",
    defaultValue: "push_email",
  },
  {
    id: "personalizedTips",
    title: "Personalized Tips",
    description: "Helpful suggestions based on how you use BlueMind.",
    defaultValue: "push_email",
  },
  {
    id: "projects",
    title: "Projects",
    description: "Project and AI plan reminders, updates, and changes.",
    defaultValue: "email",
  },
  {
    id: "dailyUpdates",
    title: "Daily Updates",
    description: "A short summary of what changed and what needs attention.",
    defaultValue: "push",
  },
  {
    id: "responses",
    title: "Responses",
    description: "Notifications when BlueMind finishes a response or background task.",
    defaultValue: "push",
  },
];

const HELP_TOPICS = [
  {
    title: "How to use BlueMind",
    text: "Use chat for questions, upload images or PDFs with the plus button, create study plans, manage reminders, and use AI tools when you need writing, search, or image help.",
  },
  {
    title: "Frequently Asked Questions",
    text: "Most workflows start in chat. Choose a tool only when you need a specific mode, such as Create Image, Write/Edit, Search, or AI Plans.",
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

const SECTION_ITEMS = [
  { id: "account", title: "Account", icon: UserRound },
  { id: "general", title: "General", icon: SlidersHorizontal },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "personalization", title: "Personalization", icon: Sparkles },
  { id: "ai-preferences", title: "AI Preferences", icon: Brain },
  { id: "data-controls", title: "Data Controls", icon: Database },
  { id: "storage", title: "Storage", icon: HardDrive },
  { id: "safety", title: "Safety", icon: Shield },
  { id: "security-login", title: "Security and Login", icon: LockKeyhole },
  { id: "help-center", title: "Help Center", icon: HelpCircle },
  { id: "about", title: "About", icon: Info },
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

function getOptionLabel(options, value, fallback = "System") {
  return options.find((option) => option.value === value)?.label || fallback;
}

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-transparent bg-[var(--bm-primary)]"
          : "border-[var(--bm-border-strong)] bg-[var(--bm-hover-bg)]",
      )}
    >
      <span className={cn("absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

function TextInput({ className, ...props }) {
  return (
    <input
      {...props}
      className={cn(inputClasses.field, "font-semibold", typeClasses.body, className)}
    />
  );
}

function PrimaryButton({ children, loading, className, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "min-h-11 rounded-2xl bg-[var(--bm-primary)] px-4 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50",
        typeClasses.small,
        interactionClasses.control,
        className,
      )}
    >
      {loading ? "Saving..." : children}
    </button>
  );
}

function SettingsGroup({ children, className }) {
  return (
    <div className={cn("overflow-visible rounded-[22px] border border-[var(--bm-border)] bg-[var(--bm-bg-card)] shadow-sm", className)}>
      {children}
    </div>
  );
}

function SettingsRow({
  title,
  description,
  value,
  options,
  selectedValue,
  onSelect,
  trailing,
  onClick,
  activeDropdown,
  setActiveDropdown,
  dropdownId,
  valueClassName,
}) {
  const isDropdown = Boolean(options?.length && onSelect && dropdownId);
  const open = activeDropdown === dropdownId;
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className={cn("block break-words font-semibold text-[var(--bm-text-primary)]", typeClasses.body)}>{title}</span>
        {description && (
          <span className={cn("mt-1 block max-w-[560px] break-words font-medium leading-5 text-[var(--bm-text-secondary)]", typeClasses.small)}>
            {description}
          </span>
        )}
      </span>
      <span className="flex min-w-0 shrink-0 items-center justify-end gap-2 max-[760px]:w-full max-[760px]:justify-start">
        {value && (
          <span className={cn("max-w-[260px] truncate text-right font-semibold text-[var(--bm-text-secondary)] max-[760px]:max-w-full max-[760px]:text-left", typeClasses.small, valueClassName)}>
            {value}
          </span>
        )}
        {isDropdown && <ChevronDown className="h-4 w-4 shrink-0 text-[var(--bm-text-muted)]" />}
        {trailing}
        {onClick && !trailing && !isDropdown && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--bm-text-muted)]" />}
      </span>
    </>
  );

  return (
    <div data-settings-dropdown-root className="relative border-b border-[var(--bm-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => {
          if (isDropdown) {
            setActiveDropdown(open ? "" : dropdownId);
            return;
          }
          onClick?.();
        }}
        className={cn(
          "flex min-h-[72px] w-full items-center gap-5 px-5 py-4 text-left transition-colors max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-3",
          (onClick || isDropdown) ? "hover:bg-[var(--bm-hover-bg)]" : "cursor-default",
        )}
      >
        {content}
      </button>
      <AnimatePresence>
        {isDropdown && open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-5 top-[58px] z-50 max-h-[280px] w-[min(260px,calc(100%-40px))] overflow-y-auto rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] p-1.5 shadow-2xl max-[760px]:left-5 max-[760px]:right-auto max-[760px]:top-[calc(100%-8px)]"
          >
            {options.map((option) => {
              const selected = selectedValue === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onSelect(option.value, option);
                    setActiveDropdown("");
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors",
                    selected ? "bg-[var(--bm-selected-bg)] text-[var(--bm-selected-text)]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selected && <Check className="h-5 w-5 shrink-0 stroke-[3] text-[var(--bm-check)]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DesktopSettingsPanel({ initialSection = "account", open = true, modal = false, onClose }) {
  const navigate = useNavigate();
  const { prefs, setPrefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const normalizeSection = (sectionId) => (SECTION_ITEMS.some((item) => item.id === sectionId) ? sectionId : "account");
  const [activeSection, setActiveSection] = useState(() => normalizeSection(initialSection));
  const [accountPane, setAccountPane] = useState("");
  const [aboutPane, setAboutPane] = useState("");
  const [activeDropdown, setActiveDropdown] = useState("");
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

  const email = user?.email || "";
  const plan = user?.authProvider === "guest" ? "Guest" : "Free";
  const currentLanguageValue = prefs.appLanguage || prefs.language || "auto";
  const currentTheme = prefs.theme || "system";
  const currentContrast = prefs.contrast || "system";
  const currentAccent = COLOR_OPTIONS.find((item) => item.value.toLowerCase() === String(prefs.appColor || prefs.accentColor || "var(--bm-primary)").toLowerCase()) || COLOR_OPTIONS[0];
  const avatarColor = useMemo(() => avatarColorFor(user), [user]);
  const muted = "text-[var(--bm-text-secondary)]";
  const closeSettings = onClose || (() => navigate("/chat"));
  const notificationDeliveryPreferences = prefs.notificationDeliveryPreferences || {};

  useEffect(() => {
    setActiveSection(normalizeSection(initialSection));
    setAccountPane("");
    setAboutPane("");
    setActiveDropdown("");
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

  useEffect(() => {
    if (!activeDropdown) return undefined;
    const closeDropdown = (event) => {
      if (!event.target?.closest?.("[data-settings-dropdown-root]")) {
        setActiveDropdown("");
      }
    };
    window.addEventListener("pointerdown", closeDropdown);
    return () => window.removeEventListener("pointerdown", closeDropdown);
  }, [activeDropdown]);

  const setSection = (sectionId) => {
    const nextSection = normalizeSection(sectionId);
    setActiveSection(nextSection);
    setAccountPane("");
    setAboutPane("");
    setActiveDropdown("");
    if (!modal) {
      navigate(`/settings/${nextSection}`, { replace: false });
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

  const handleNotificationChannel = async (row, value) => {
    const nextDelivery = {
      ...notificationDeliveryPreferences,
      [row.id]: value,
    };
    const notificationPreferences = {
      ...(prefs.notificationPreferences || {}),
      [row.id]: {
        enabled: value !== "off",
        push: value === "push" || value === "push_email",
        email: value === "email" || value === "push_email",
      },
    };
    const notificationsEnabled = Object.values(nextDelivery).some((channel) => channel && channel !== "off");
    await savePreference({
      notificationsEnabled,
      notificationDeliveryPreferences: nextDelivery,
      notificationPreferences,
    });
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
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-black/5", large ? "h-20 w-20" : "h-11 w-11")}
      style={user?.avatarUrl ? undefined : { backgroundColor: avatarColor }}
    >
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className={cn("font-extrabold text-white", large ? "text-2xl" : "text-sm")}>{initialsFor(user)}</span>}
    </div>
  );

  const dropdownProps = {
    activeDropdown,
    setActiveDropdown,
  };

  const renderAccount = () => {
    if (accountPane === "change-email") {
      return (
        <div className="max-w-2xl space-y-5">
          <button type="button" onClick={() => setAccountPane("")} className="text-sm font-extrabold text-[var(--bm-primary)]">Back to Account</button>
          <form onSubmit={handleRequestEmailChange} className="space-y-4">
            <TextInput type="email" value={email} readOnly />
            <TextInput type="email" value={emailChange.newEmail} onChange={(event) => setEmailChange({ ...emailChange, newEmail: event.target.value })} placeholder="New Email" autoComplete="email" />
            <TextInput type="password" value={emailChange.currentPassword} onChange={(event) => setEmailChange({ ...emailChange, currentPassword: event.target.value })} placeholder="Current Password" autoComplete="current-password" />
            <PrimaryButton type="submit" loading={saving === "email"} disabled={!emailChange.currentPassword || !emailChange.newEmail || saving === "email"}>Continue</PrimaryButton>
          </form>
          {emailChange.pendingEmail && (
            <form onSubmit={handleConfirmEmailChange} className="space-y-4 rounded-[22px] border border-[var(--bm-border)] bg-[var(--bm-bg-card)] p-4">
              <p className={cn("text-sm font-semibold", muted)}>Enter the 6-digit code sent to {emailChange.pendingEmail}.</p>
              <TextInput value={emailChange.code} inputMode="numeric" onChange={(event) => setEmailChange({ ...emailChange, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="000000" />
              <PrimaryButton type="submit" loading={saving === "email-code"} disabled={!/^\d{6}$/.test(emailChange.code) || saving === "email-code"}>Confirm Email</PrimaryButton>
            </form>
          )}
        </div>
      );
    }

    if (accountPane === "change-password") {
      return (
        <div className="max-w-2xl space-y-5">
          <button type="button" onClick={() => setAccountPane("")} className="text-sm font-extrabold text-[var(--bm-primary)]">Back to Account</button>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <TextInput type="password" value={passwordChange.currentPassword} onChange={(event) => setPasswordChange({ ...passwordChange, currentPassword: event.target.value })} placeholder="Current Password" autoComplete="current-password" />
            <TextInput type="password" value={passwordChange.newPassword} onChange={(event) => setPasswordChange({ ...passwordChange, newPassword: event.target.value })} placeholder="New Password" autoComplete="new-password" />
            <TextInput type="password" value={passwordChange.confirmPassword} onChange={(event) => setPasswordChange({ ...passwordChange, confirmPassword: event.target.value })} placeholder="Confirm Password" autoComplete="new-password" />
            <PrimaryButton type="submit" loading={saving === "password"} disabled={!passwordChange.currentPassword || !passwordChange.newPassword || passwordChange.newPassword !== passwordChange.confirmPassword || saving === "password"}>Save</PrimaryButton>
          </form>
          <button type="button" onClick={() => setAccountPane("forgot-password")} className="text-sm font-bold text-[var(--bm-primary)]">Forgot Password?</button>
        </div>
      );
    }

    if (accountPane === "forgot-password") {
      return (
        <div className="max-w-2xl space-y-5">
          <button type="button" onClick={() => setAccountPane("change-password")} className="text-sm font-extrabold text-[var(--bm-primary)]">Back to Change Password</button>
          <form onSubmit={handleRequestPasswordReset} className="space-y-4">
            <TextInput type="email" value={passwordRecovery.email} onChange={(event) => setPasswordRecovery({ email: event.target.value, sent: false })} placeholder={email || "account@email.com"} autoComplete="email" />
            <PrimaryButton type="submit" loading={saving === "forgot-password"} disabled={!passwordRecovery.email.trim() || saving === "forgot-password"}>Send Recovery Email</PrimaryButton>
          </form>
          {passwordRecovery.sent && <p className={cn("text-sm font-semibold", muted)}>If this email belongs to a BlueMind account, a recovery email has been sent.</p>}
        </div>
      );
    }

    return (
      <SettingsGroup>
        <SettingsRow title="Email" description="The email connected to your BlueMind account." value={email || "Unavailable"} valueClassName="max-w-[340px]" />
        <SettingsRow title="Change Email" description="Update your account email with verification." onClick={() => setAccountPane("change-email")} />
        <SettingsRow title="Change Password" description="Change your account password securely." onClick={() => setAccountPane("change-password")} />
        <SettingsRow title="Subscription" description="Current BlueMind plan." value={plan} />
      </SettingsGroup>
    );
  };

  const renderGeneral = () => (
    <SettingsGroup>
      <SettingsRow
        title="Appearance"
        description="Choose how BlueMind looks."
        value={getOptionLabel(APPEARANCE_OPTIONS, currentTheme)}
        options={APPEARANCE_OPTIONS}
        selectedValue={currentTheme}
        dropdownId="general-appearance"
        onSelect={(theme) => savePreference({ theme })}
        {...dropdownProps}
      />
      <SettingsRow
        title="Contrast"
        description="Choose the contrast level for interface elements."
        value={getOptionLabel(CONTRAST_OPTIONS, currentContrast)}
        options={CONTRAST_OPTIONS}
        selectedValue={currentContrast}
        dropdownId="general-contrast"
        onSelect={(contrast) => savePreference({ contrast })}
        {...dropdownProps}
      />
      <SettingsRow
        title="Accent Color"
        description="Choose your BlueMind accent color."
        value={currentAccent.label}
        options={COLOR_OPTIONS.map((color) => ({ label: color.label, value: color.value }))}
        selectedValue={currentAccent.value}
        dropdownId="general-accent"
        onSelect={(value) => savePreference({ appColor: value, accentColor: value })}
        {...dropdownProps}
      />
      <SettingsRow
        title="Language"
        description="Choose your preferred language."
        value={getOptionLabel(LANGUAGE_OPTIONS, currentLanguageValue, "Auto-detect")}
        options={LANGUAGE_OPTIONS}
        selectedValue={currentLanguageValue}
        dropdownId="general-language"
        onSelect={(language) => savePreference({ appLanguage: language, language })}
        {...dropdownProps}
      />
      <SettingsRow title="Higher Intelligence" description="Allow BlueMind to use deeper reasoning when helpful." trailing={<Toggle checked={prefs.higherIntelligence === true} disabled={saving === "preferences"} onChange={(enabled) => savePreference({ higherIntelligence: enabled })} />} />
      <SettingsRow title="Enable Dictation" description="Use microphone dictation where voice input is available." trailing={<Toggle checked={prefs.enableDictation !== false} disabled={saving === "preferences"} onChange={(enabled) => savePreference({ enableDictation: enabled })} />} />
      <SettingsRow title="Separate Voice" description="Keep voice behavior separate from typed chat preferences." trailing={<Toggle checked={prefs.separateVoice === true} disabled={saving === "preferences"} onChange={(enabled) => savePreference({ separateVoice: enabled })} />} />
    </SettingsGroup>
  );

  const renderNotifications = () => (
    <SettingsGroup>
      {NOTIFICATION_ROWS.map((row) => {
        const value = notificationDeliveryPreferences[row.id] || row.defaultValue;
        return (
          <SettingsRow
            key={row.id}
            title={row.title}
            description={row.description}
            value={getOptionLabel(NOTIFICATION_CHANNEL_OPTIONS, value)}
            options={NOTIFICATION_CHANNEL_OPTIONS}
            selectedValue={value}
            dropdownId={`notification-${row.id}`}
            onSelect={(nextValue) => handleNotificationChannel(row, nextValue)}
            {...dropdownProps}
          />
        );
      })}
    </SettingsGroup>
  );

  const renderPersonalization = () => (
    <SettingsGroup>
      <SettingsRow title="Memory" description="Let BlueMind remember useful preferences across chats." trailing={<Toggle checked={prefs.memoryEnabled !== false} disabled={saving === "preferences"} onChange={(enabled) => savePreference({ memoryEnabled: enabled })} />} />
      <SettingsRow title="Response Style" description="Choose how BlueMind usually shapes answers." value={prefs.responseStyle || "Balanced"} options={[{ label: "Balanced", value: "Balanced" }, { label: "Concise", value: "Concise" }, { label: "Detailed", value: "Detailed" }]} selectedValue={prefs.responseStyle || "Balanced"} dropdownId="personalization-style" onSelect={(responseStyle) => savePreference({ responseStyle })} {...dropdownProps} />
      <SettingsRow title="Learning Tone" description="Choose the tone BlueMind uses for study explanations." value={prefs.learningTone || "Supportive"} options={[{ label: "Supportive", value: "Supportive" }, { label: "Simple", value: "Simple" }, { label: "Teacher", value: "Teacher" }]} selectedValue={prefs.learningTone || "Supportive"} dropdownId="personalization-tone" onSelect={(learningTone) => savePreference({ learningTone })} {...dropdownProps} />
    </SettingsGroup>
  );

  const renderAiPreferences = () => (
    <SettingsGroup>
      <SettingsRow title="Default Mode" description="Choose the default BlueMind AI mode." value={prefs.defaultAiMode || "General"} options={[{ label: "General", value: "General" }, { label: "Study", value: "Study" }, { label: "Research", value: "Research" }, { label: "Work", value: "Work" }, { label: "Writing", value: "Writing" }, { label: "Coding", value: "Coding" }]} selectedValue={prefs.defaultAiMode || "General"} dropdownId="ai-default-mode" onSelect={(defaultAiMode) => savePreference({ defaultAiMode })} {...dropdownProps} />
      <SettingsRow title="Study Source Priority" description="Prefer trusted education sources in Study Mode." value={prefs.studySourcePriority || "Trusted sources"} options={[{ label: "Trusted sources", value: "Trusted sources" }, { label: "Balanced", value: "Balanced" }, { label: "Fast answers", value: "Fast answers" }]} selectedValue={prefs.studySourcePriority || "Trusted sources"} dropdownId="ai-study-source" onSelect={(studySourcePriority) => savePreference({ studySourcePriority })} {...dropdownProps} />
      <SettingsRow title="Ask Before Guessing" description="Ask for more information when confidence is low." trailing={<Toggle checked={prefs.askBeforeGuessing !== false} disabled={saving === "preferences"} onChange={(enabled) => savePreference({ askBeforeGuessing: enabled })} />} />
    </SettingsGroup>
  );

  const renderDataControls = () => (
    <SettingsGroup>
      <SettingsRow title="Chat History" description="Control how normal chats are stored." value={prefs.chatHistoryMode || "On"} options={[{ label: "On", value: "On" }, { label: "Off", value: "Off" }]} selectedValue={prefs.chatHistoryMode || "On"} dropdownId="data-chat-history" onSelect={(chatHistoryMode) => savePreference({ chatHistoryMode })} {...dropdownProps} />
      <SettingsRow title="Private Space Indexing" description="Private chats remain hidden from normal search." value="Disabled" />
      <SettingsRow title="Export Data" description="Download your BlueMind account data when available." value="Coming soon" />
    </SettingsGroup>
  );

  const renderStorage = () => (
    <SettingsGroup>
      <SettingsRow title="Images" description="Uploaded and generated images connected to your account." value="Managed by BlueMind" />
      <SettingsRow title="Files" description="Documents and attachments used in chat." value="Managed by BlueMind" />
      <SettingsRow title="Storage Usage" description="Detailed storage reporting is being prepared." value="Coming soon" />
    </SettingsGroup>
  );

  const renderSafety = () => (
    <SettingsGroup>
      <SettingsRow title="Safer Responses" description="Keep BlueMind careful with sensitive or risky requests." trailing={<Toggle checked={prefs.saferResponses !== false} disabled={saving === "preferences"} onChange={(enabled) => savePreference({ saferResponses: enabled })} />} />
      <SettingsRow title="Study Guardrails" description="Encourage explanations over direct homework copying." trailing={<Toggle checked={prefs.studyGuardrails !== false} disabled={saving === "preferences"} onChange={(enabled) => savePreference({ studyGuardrails: enabled })} />} />
      <SettingsRow title="Content Level" description="Choose the default safety level." value={prefs.contentLevel || "Balanced"} options={[{ label: "Strict", value: "Strict" }, { label: "Balanced", value: "Balanced" }, { label: "Flexible", value: "Flexible" }]} selectedValue={prefs.contentLevel || "Balanced"} dropdownId="safety-content-level" onSelect={(contentLevel) => savePreference({ contentLevel })} {...dropdownProps} />
    </SettingsGroup>
  );

  const renderSecurityLogin = () => (
    <SettingsGroup>
      <SettingsRow title="Password" description="Change your password from the Account section." onClick={() => { setActiveSection("account"); setAccountPane("change-password"); }} />
      <SettingsRow title="Login Alerts" description="Receive alerts for important account sign-in activity." value={prefs.loginAlerts || "Push, Email"} options={NOTIFICATION_CHANNEL_OPTIONS} selectedValue={prefs.loginAlerts || "push_email"} dropdownId="security-login-alerts" onSelect={(loginAlerts) => savePreference({ loginAlerts })} {...dropdownProps} />
      <SettingsRow title="Google Sign-In" description="Use Firebase Google authentication where available." value="Enabled" />
    </SettingsGroup>
  );

  const renderReportIssue = () => (
    <form onSubmit={handleSubmitIssueReport} className="max-w-3xl space-y-5">
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--bm-text-secondary)]">Issue Title</span>
        <TextInput value={issueReport.title} onChange={(event) => setIssueReport((current) => ({ ...current, title: event.target.value }))} placeholder="Cannot upload images" maxLength={140} />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--bm-text-secondary)]">Issue Description</span>
        <textarea
          value={issueReport.description}
          onChange={(event) => setIssueReport((current) => ({ ...current, description: event.target.value }))}
          placeholder="Describe what happened and what you expected."
          rows={8}
          className={cn(inputClasses.textarea, "resize-none font-semibold", typeClasses.body)}
        />
      </label>
      <SettingsGroup className="p-4">
        <p className="text-sm font-extrabold text-[var(--bm-text-primary)]">Attach screenshots or files</p>
        <div className="mt-4 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
          {[
            ["Camera", Camera, () => issueCameraInputRef.current?.click()],
            ["Photos", FileUp, () => issuePhotosInputRef.current?.click()],
            ["Files", FileUp, () => issueFilesInputRef.current?.click()],
          ].map(([label, Icon, action]) => (
            <button key={label} type="button" onClick={action} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] text-sm font-extrabold text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-hover-bg)]">
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
        {issueReport.attachments.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {issueReport.attachments.map((attachment, index) => (
              <div key={`${attachment.name}-${index}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]">
                {attachment.type.startsWith("image/") ? <img src={attachment.dataUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-bold">{attachment.name}</div>}
                <button type="button" onClick={() => setIssueReport((current) => ({ ...current, attachments: current.attachments.filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingsGroup>
      <PrimaryButton type="submit" loading={saving === "issue-report"} disabled={!issueReport.title.trim() || issueReport.description.trim().length < 10 || saving === "issue-report"}>Submit report</PrimaryButton>
      <input ref={issueCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleIssueFiles(event.target.files)} />
      <input ref={issuePhotosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleIssueFiles(event.target.files)} />
      <input ref={issueFilesInputRef} type="file" multiple className="hidden" onChange={(event) => handleIssueFiles(event.target.files)} />
    </form>
  );

  const renderHelpCenter = () => (
    <div className="max-w-3xl space-y-3">
      {HELP_TOPICS.map((topic) => {
        const expanded = openHelpTopic === topic.title;
        return (
          <button key={topic.title} type="button" onClick={() => setOpenHelpTopic(expanded ? "" : topic.title)} className="w-full rounded-[22px] border border-[var(--bm-border)] bg-[var(--bm-bg-card)] p-5 text-left transition-colors hover:bg-[var(--bm-hover-bg)]">
            <span className="flex items-center gap-3 text-base font-extrabold text-[var(--bm-text-primary)]">
              <HelpCircle className="h-5 w-5" />
              <span className="min-w-0 flex-1">{topic.title}</span>
              <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-90")} />
            </span>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={cn("overflow-hidden pt-3 text-sm font-semibold leading-6", muted)}>
                  {topic.text}
                </motion.p>
              )}
            </AnimatePresence>
          </button>
        );
      })}
      <button type="button" onClick={() => setActiveSection("report-issue")} className="rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-extrabold text-white">Report App Issue</button>
    </div>
  );

  const renderAbout = () => {
    if (aboutPane === "privacy") {
      return (
        <div className="max-w-3xl space-y-4">
          <button type="button" onClick={() => setAboutPane("")} className="text-sm font-extrabold text-[var(--bm-primary)]">Back to About</button>
          <SettingsGroup className="p-6">
            <h3 className="text-xl font-extrabold text-[var(--bm-text-primary)]">Privacy Policy</h3>
            <p className={cn("mt-3 text-sm font-semibold leading-7", muted)}>BlueMind AI uses your account data, chat content, uploaded files, reminders, profile details, and settings to provide the app experience you request. Profile and preference data stays connected to your authenticated account so desktop and mobile stay in sync.</p>
          </SettingsGroup>
        </div>
      );
    }

    if (aboutPane === "terms") {
      return (
        <div className="max-w-3xl space-y-4">
          <button type="button" onClick={() => setAboutPane("")} className="text-sm font-extrabold text-[var(--bm-primary)]">Back to About</button>
          <SettingsGroup className="p-6">
            <h3 className="text-xl font-extrabold text-[var(--bm-text-primary)]">Terms of Service</h3>
            <p className={cn("mt-3 text-sm font-semibold leading-7", muted)}>Use BlueMind AI for lawful learning, productivity, research, writing, planning, and creative work. Review AI-generated content before relying on it, submitting it, or sharing it.</p>
          </SettingsGroup>
        </div>
      );
    }

    return (
      <div className="max-w-3xl space-y-5">
        <SettingsGroup className="p-7">
          <h3 className="text-2xl font-extrabold text-[var(--bm-text-primary)]">BlueMind AI</h3>
          <p className={cn("mt-3 max-w-2xl text-sm font-semibold leading-7", muted)}>BlueMind AI is an AI-powered learning and productivity platform designed to help students organize knowledge, study smarter, manage plans, upload files, and interact with intelligent assistants.</p>
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow title="Version" value={APP_VERSION} />
          <SettingsRow title="Support Email" value={SUPPORT_EMAIL} onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}`; }} />
          <SettingsRow title="Privacy Policy" onClick={() => setAboutPane("privacy")} />
          <SettingsRow title="Terms of Service" onClick={() => setAboutPane("terms")} />
          <SettingsRow title="Website" value="bluemind-frontend.vercel.app" onClick={() => window.open("https://bluemind-frontend.vercel.app", "_blank", "noopener,noreferrer")} />
        </SettingsGroup>
        <p className={cn("text-center text-xs font-semibold", muted)}>Copyright BlueMind AI</p>
      </div>
    );
  };

  const renderContent = () => {
    if (activeSection === "account") return renderAccount();
    if (activeSection === "general") return renderGeneral();
    if (activeSection === "notifications") return renderNotifications();
    if (activeSection === "personalization") return renderPersonalization();
    if (activeSection === "ai-preferences") return renderAiPreferences();
    if (activeSection === "data-controls") return renderDataControls();
    if (activeSection === "storage") return renderStorage();
    if (activeSection === "safety") return renderSafety();
    if (activeSection === "security-login") return renderSecurityLogin();
    if (activeSection === "report-issue") return renderReportIssue();
    if (activeSection === "help-center") return renderHelpCenter();
    if (activeSection === "about") return renderAbout();
    return renderAccount();
  };

  const activeItem = SECTION_ITEMS.find((item) => item.id === activeSection) || SECTION_ITEMS[0];

  if (!open) return null;

  const panel = (
    <section className="relative grid h-[min(860px,calc(100vh-48px))] w-full max-w-[1180px] grid-cols-[282px_minmax(0,1fr)] overflow-hidden rounded-[30px] border border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)] shadow-2xl max-[900px]:grid-cols-[82px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-r border-[var(--bm-border)] bg-[var(--bm-bg-card)] p-4">
        <button type="button" onClick={() => setSection("account")} className="mb-4 flex min-h-[70px] min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-[var(--bm-hover-bg)] max-[900px]:justify-center max-[900px]:p-2">
          <Avatar />
          <span className="min-w-0 flex-1 max-[900px]:hidden">
            <span className="block truncate text-sm font-extrabold">BlueMind Settings</span>
            <span className={cn("block truncate text-xs font-semibold", muted)}>{email || "Account settings"}</span>
          </span>
        </button>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {SECTION_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                title={item.title}
                className={cn(
                  "flex min-h-[44px] w-full min-w-0 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition-colors max-[900px]:justify-center max-[900px]:px-0",
                  active
                    ? "bg-[var(--bm-selected-bg)] text-[var(--bm-selected-text)]"
                    : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)] hover:text-[var(--bm-text-primary)]",
                )}
              >
                <Icon className={cn("shrink-0", iconClasses.sidebar)} />
                <span className="min-w-0 truncate max-[900px]:hidden">{item.title}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          className="mt-4 flex min-h-[50px] w-full min-w-0 items-center gap-3 rounded-2xl px-3 text-left text-sm font-extrabold text-red-500 transition-colors hover:bg-red-500/10 max-[900px]:justify-center max-[900px]:px-0"
          title="Log out"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="truncate max-[900px]:hidden">Log out</span>
        </button>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-[var(--bm-border)] px-8 max-[760px]:px-5">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight">{activeItem.title}</h1>
            <p className={cn("mt-1 truncate text-sm font-semibold", muted)}>BlueMind desktop settings</p>
          </div>
          <button type="button" onClick={closeSettings} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-hover-bg)]" aria-label="Close settings">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-7 max-[760px]:px-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeSection}-${accountPane}-${aboutPane}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[820px]"
            >
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
            className="absolute inset-0 z-[70] flex items-center justify-center bg-black/55 p-6"
          >
            <motion.div
              initial={{ y: 14, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.98 }}
              className="w-full max-w-md rounded-[28px] border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] p-6 shadow-2xl"
            >
              <p className="text-lg font-extrabold text-[var(--bm-text-primary)]">Log out?</p>
              <p className={cn("mt-2 text-sm font-medium leading-6", muted)}>You will need to sign in again to use BlueMind AI.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setLogoutConfirmOpen(false)} className="min-h-12 rounded-2xl bg-[var(--bm-hover-bg)] text-sm font-bold text-[var(--bm-text-primary)]">
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
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-6 max-[760px]:p-3" data-testid="desktop-settings-modal">
        <motion.button
          type="button"
          aria-label="Close settings"
          className="absolute inset-0 bg-black/45 backdrop-blur-[6px]"
          onClick={closeSettings}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
        <motion.div
          className="relative z-10 w-full max-w-[1180px]"
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
    <main className={cn("flex min-h-screen items-center justify-center p-6", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>
      {panel}
    </main>
  );
}
