import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  Database,
  Download,
  FileUp,
  Flag,
  Gauge,
  Globe2,
  HelpCircle,
  Info,
  KeyRound,
  LogOut,
  Mail,
  MonitorSmartphone,
  Moon,
  Palette,
  PenLine,
  Play,
  ScanFace,
  Shield,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  X,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { BlueMindOverlay } from "@/components/ui/BlueMindOverlay";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, overlayMotion, typeClasses } from "@/lib/interactions";
import { getApiErrorMessage } from "@/services/api";
import {
  changePassword,
  cancelAccountDeletion,
  confirmEmailChange,
  clearLocalSession,
  getAccountDeletionStatus,
  logoutUser,
  requestAccountDeletion,
  requestEmailChange,
  requestPasswordReset,
  restoreExistingSession,
} from "@/services/authService";
import { clearChatHistory, getActiveSessions, getProfile, logoutOtherDevices, updatePreferences, updateProfile } from "@/services/profileService";
import { readStoredUser } from "@/services/storageKeys";
import {
  disableFaceIDLock,
  enableFaceIDLock,
  getFaceIDStatus,
} from "@/services/secureSessionStorage";
import { isNativeIOSApp } from "@/capacitorRuntime";
import {
  addNativeGlassActionListener,
  openNativeIOSAppSettings,
  getNativeIOSNotificationStatus,
  presentNativeIOSConfirmation,
  presentNativeIOSSecurePrompt,
  presentNativeIOSSelection,
  requestNativeIOSNotificationAuthorization,
  setNativeSettingsBackVisible,
  setNativeSettingsPresentation,
} from "@/mobile/nativeGlassBridge";
import { reportIssue } from "@/services/supportService";
import { AVATAR_COLORS, COLOR_OPTIONS } from "@/theme/colors";

const MESSAGE_COLORS = COLOR_OPTIONS;
const APP_ACCENT_COLORS = COLOR_OPTIONS;
const AI_VOICE_OPTIONS = [
  { label: "Nova", value: "nova", description: "Bright, clear and balanced." },
  { label: "Luna", value: "luna", description: "Soft, calm and focused." },
  { label: "Atlas", value: "atlas", description: "Confident, steady and direct." },
  { label: "Echo", value: "echo", description: "Light, natural and conversational." },
  { label: "Mira", value: "mira", description: "Warm, expressive and friendly." },
  { label: "Sage", value: "sage", description: "Measured, thoughtful and precise." },
];
const SPEECH_SPEED_OPTIONS = [
  { label: "Slow", value: "slow" },
  { label: "Normal", value: "normal" },
  { label: "Fast", value: "fast" },
];
const VOICE_LANGUAGE_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "English", value: "en-US" },
  { label: "العربية", value: "ar-SA" },
  { label: "Svenska", value: "sv-SE" },
];
const SETTINGS_GLASS_CLASS = "border border-white/[0.055] bg-[rgba(78,78,78,0.18)]";
const SETTINGS_LIGHT_GLASS_CLASS = "border border-black/[0.06] bg-white/[0.58]";
const SETTINGS_LIGHT_POPUP_GLASS_CLASS = "border border-black/[0.06] bg-white/[0.74]";
const SETTINGS_GLASS_STYLE = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.014), inset 1px 0 0 rgba(255,255,255,0.026), inset -1px 0 0 rgba(255,255,255,0.022), 0 18px 48px rgba(0,0,0,0.24)",
  backdropFilter: "blur(42px) saturate(1.16)",
  WebkitBackdropFilter: "blur(42px) saturate(1.16)",
};
const SETTINGS_LIGHT_GLASS_STYLE = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.76), inset 0 -1px 0 rgba(17,17,17,0.024), 0 18px 48px rgba(15,23,42,0.09)",
  backdropFilter: "blur(34px) saturate(1.14)",
  WebkitBackdropFilter: "blur(34px) saturate(1.14)",
};
const SETTINGS_SHEET_GLASS_STYLE = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 -24px 80px rgba(0,0,0,0.42)",
};
const SETTINGS_LIGHT_SHEET_GLASS_STYLE = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78), 0 -24px 80px rgba(15,23,42,0.16)",
};
const SETTINGS_BLUE_GLASS_STYLE = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.025), 0 16px 40px rgba(37,99,235,0.28)",
  backdropFilter: "blur(32px) saturate(1.16)",
  WebkitBackdropFilter: "blur(32px) saturate(1.16)",
};
const APPEARANCE_OPTIONS = [
  { label: "System", value: "system", icon: MonitorSmartphone },
  { label: "Dark", value: "dark", icon: Moon },
  { label: "Light", value: "light", icon: Sun },
];
const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "العربية", value: "ar" },
  { label: "Svenska", value: "sv" },
];
function languageDisplayName(language) {
  if (language.value === "ar") return "العربية";
  return language.label;
}

function formatDeletionCountdown(deleteAt, nowMs = Date.now()) {
  if (!deleteAt) return "00:00";

  const remainingSeconds = Math.max(0, Math.ceil((new Date(deleteAt).getTime() - nowMs) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

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
        "relative flex min-h-[72px] w-full items-center px-4 py-2 text-left after:absolute after:bottom-0 after:left-[52px] after:right-4 after:h-px last:after:hidden",
        iconClasses.iconText,
        onClick && interactionClasses.menuItem,
        isDark ? "after:bg-white/[0.045] active:bg-white/[0.055]" : "after:bg-black/[0.055] active:bg-black/[0.035]",
        disabled && "opacity-55",
      )}
    >
      <Icon className={cn("shrink-0", iconClasses.sidebar, danger ? "text-red-500" : accent ? "text-[var(--bm-primary)]" : isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px] font-semibold leading-5", danger ? "text-red-500" : accent ? "text-[#2563EB]" : isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
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

function SettingsCard({ children, isDark = true }) {
  return (
    <div
      className={cn("overflow-hidden rounded-[26px]", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
      style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, isDark = true }) {
  return <h3 className={cn("mb-2 px-1 font-bold uppercase tracking-[0.08em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{children}</h3>;
}

function ComingSoonPanel({ title, isDark = true }) {
  return (
    <div
      className={cn("rounded-[26px] p-5 text-center", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
      style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
    >
      <p className={cn("font-bold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{title}</p>
      <p className={cn("mt-2 font-medium", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Coming Soon</p>
    </div>
  );
}

function resolveSettingsInputIcon(label, type) {
  const text = `${label || ""} ${type || ""}`.toLowerCase();
  if (text.includes("email")) return Mail;
  if (text.includes("password")) return KeyRound;
  if (text.includes("code")) return Shield;
  if (text.includes("issue")) return Flag;
  return Info;
}

function SettingsInput({ label, readOnly, isDark = true, className, style, icon, ...props }) {
  const Icon = icon || resolveSettingsInputIcon(label, props.type);

  return (
    <label className="block">
      <span className={cn("mb-2 block font-bold uppercase tracking-[0.08em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{label}</span>
      <span className="relative block">
        <Icon className={cn("pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2", isDark ? "text-white/78" : "text-[#111111]")} />
        <input
          {...props}
          readOnly={readOnly}
          className={cn(
            inputClasses.field,
            "pl-12 font-semibold",
            typeClasses.body,
            isDark ? "border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white placeholder:text-white/42" : "border-black/[0.06] bg-white/[0.58] text-[#111111] placeholder:text-[#777777]",
            readOnly && "cursor-default text-[var(--bm-text-secondary)]",
            className,
          )}
          style={isDark ? { ...SETTINGS_GLASS_STYLE, ...style } : { ...SETTINGS_LIGHT_GLASS_STYLE, ...style }}
        />
      </span>
    </label>
  );
}

function PrimarySettingsButton({ children, loading, style, ...props }) {
  return (
    <button
      type="submit"
      {...props}
      className={cn(
        "flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/[0.12] bg-[rgba(37,99,235,0.78)] px-4 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-55",
        typeClasses.small,
        interactionClasses.control,
        props.className,
      )}
      style={{ ...SETTINGS_BLUE_GLASS_STYLE, ...style }}
    >
      {loading ? <BlueMindLoadingDots /> : children}
    </button>
  );
}

function SettingsSelectionPopup({ open, title, children, isDark = true, onClose }) {
  return (
    <BlueMindOverlay
      open={open}
      kind="modal"
      portal={false}
      contained
      className="absolute inset-0 z-30 flex items-center justify-center p-5"
      backdropClassName="bg-black/25 backdrop-blur-[10px]"
      contentClassName={cn(
        "bm-settings-popup-surface max-h-[72dvh] w-full max-w-[420px] overflow-hidden rounded-[30px] p-4",
        isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_POPUP_GLASS_CLASS,
      )}
      contentStyle={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
      contentProps={{
        onClick: (event) => event.stopPropagation(),
        role: "dialog",
        "aria-modal": "true",
        "aria-label": title,
      }}
      onClose={onClose}
      closeLabel={`Dismiss ${title}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h3 className={cn("text-[15px] font-bold", isDark ? "text-white" : "text-[#111111]")}>{title}</h3>
        <button type="button" onClick={onClose} className="bm-mobile-glass-control" aria-label={`Close ${title}`}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[58dvh] space-y-2 overflow-y-auto overscroll-contain pr-1">
        {children}
      </div>
    </BlueMindOverlay>
  );
}

function SettingsPopupRow({ children, selected, indicator, isDark = true, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex min-h-[56px] w-full items-center gap-3 rounded-[20px] border px-4 text-left transition duration-200 ease-out active:scale-[0.985]",
        selected
          ? isDark
            ? "border-white/[0.09] bg-white/[0.085]"
            : "border-black/[0.08] bg-black/[0.045]"
          : isDark
            ? "border-white/[0.045] bg-white/[0.045]"
            : "border-black/[0.045] bg-white/[0.44]",
      )}
      style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
    >
      {indicator}
      <span className={cn("min-w-0 flex-1 text-[14px] font-semibold", isDark ? "text-white" : "text-[#111111]")}>{children}</span>
      {selected && <Check className="h-5 w-5 shrink-0 stroke-[3] text-[var(--bm-check)]" />}
    </button>
  );
}

function IOSSettingsSelectionPopover({ open, label, options, value, anchor, isDark = true, onSelect, onClose }) {
  const positionStyle = anchor?.placement === "above"
    ? { bottom: anchor.offset, left: 16, right: 16, maxHeight: anchor.maxHeight }
    : { top: anchor?.offset ?? 16, left: 16, right: 16, maxHeight: anchor?.maxHeight };

  return (
    <BlueMindOverlay
      open={open}
      kind={anchor?.placement === "above" ? "popupUp" : "popup"}
      portal={false}
      contained
      className="absolute inset-0 z-30"
      backdropClassName="bm-settings-selection-popover-backdrop"
      contentClassName={cn(
        "bm-settings-selection-popover absolute mx-auto w-auto max-w-[360px] overflow-hidden rounded-[28px] p-2",
        isDark ? "text-white" : "text-[#111111]",
      )}
      contentStyle={positionStyle}
      contentProps={{
        onClick: (event) => event.stopPropagation(),
        role: "menu",
        "aria-label": label,
      }}
      onClose={onClose}
      closeLabel={`Dismiss ${label}`}
    >
      <div
        className="overflow-y-auto overscroll-contain p-1"
        style={{ maxHeight: Math.max(164, (anchor?.maxHeight ?? 430) - 16) }}
      >
        {options.map((option) => {
          const selected = String(value).toLowerCase() === String(option.value).toLowerCase();
          const Icon = option.icon;

          return (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              key={option.value}
              onClick={() => onSelect(option)}
              data-testid={option.testId}
              className={cn(
                "bm-settings-selection-option flex min-h-[52px] w-full items-center gap-3 rounded-[20px] px-3.5 text-left",
                selected && "bm-settings-selection-option-selected",
              )}
            >
              {Icon ? (
                <Icon className={cn("h-5 w-5 shrink-0", isDark ? "text-white/78" : "text-black/78")} />
              ) : (
                <span
                  className="h-6 w-6 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ backgroundColor: option.color }}
                />
              )}
              <span className="min-w-0 flex-1 text-[14px] font-semibold">{option.label}</span>
              {selected && <Check className="h-5 w-5 shrink-0 stroke-[3] text-[var(--bm-check)]" />}
            </button>
          );
        })}
      </div>
    </BlueMindOverlay>
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
  const { prefs, resolvedTheme, setPrefs, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const settingsMotionDisabled = isNativeIOSApp();
  const fileInputRef = useRef(null);
  const issueCameraInputRef = useRef(null);
  const issuePhotosInputRef = useRef(null);
  const issueFilesInputRef = useRef(null);
  const [pane, setPane] = useState(initialPane === "settings" ? "main" : initialPane);
  const [user, setUser] = useState(() => readStoredUser());
  const [saving, setSaving] = useState("");
  const [selectionPopup, setSelectionPopup] = useState(null);
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
  const [accountDeletion, setAccountDeletion] = useState(() => readStoredUser()?.accountDeletion || null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const [sheetDismissing, setSheetDismissing] = useState(false);
  const [faceIDStatus, setFaceIDStatus] = useState({ available: false, enabled: false });
  const [notificationAuthorization, setNotificationAuthorization] = useState("unknown");
  const [activeSessions, setActiveSessions] = useState([]);
  const sheetDragControls = useDragControls();
  const sheetSurfaceRef = useRef(null);
  const nativeActionPendingRef = useRef(null);
  const paneHistoryRef = useRef([]);
  const settingsPresentationOffsetRef = useRef(typeof window === "undefined" ? 1000 : window.innerHeight);

  const close = useCallback(() => {
    setLogoutConfirmOpen(false);
    setSelectionPopup(null);
    onClose?.();
  }, [onClose]);

  const requestSettingsDismiss = useCallback(() => {
    if (!open || sheetDismissing) return;
    setSheetDismissing(true);
  }, [open, sheetDismissing]);

  const backOneSettingsLevel = useCallback(() => {
    const history = paneHistoryRef.current;
    const previousPane = history.length > 0 ? history[history.length - 1] : "main";
    paneHistoryRef.current = history.slice(0, -1);
    setPane(previousPane);
  }, []);

  useEffect(() => {
    if (open) {
      setSheetDismissing(false);
      setPane(initialPane === "settings" ? "main" : initialPane);
      paneHistoryRef.current = [];
    }
  }, [initialPane, open]);

  useEffect(() => {
    if (!open || !overlay || typeof document === "undefined") return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.classList.add("bm-settings-sheet-open");

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.classList.remove("bm-settings-sheet-open");
    };
  }, [open, overlay]);

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

  useEffect(() => {
    if (!open || !isNativeIOSApp()) return undefined;
    let cancelled = false;
    getNativeIOSNotificationStatus().then((result) => {
      if (!cancelled) setNotificationAuthorization(result?.status || "unknown");
    });
    return () => { cancelled = true; };
  }, [open, pane]);

  useEffect(() => {
    if (!open || pane !== "active-sessions") return undefined;
    let cancelled = false;
    setSaving("sessions-load");
    getActiveSessions()
      .then((sessions) => { if (!cancelled) setActiveSessions(sessions); })
      .catch((error) => { if (!cancelled) toast.error(getApiErrorMessage(error, "Could not load active sessions.")); })
      .finally(() => { if (!cancelled) setSaving(""); });
    return () => { cancelled = true; };
  }, [open, pane]);

  useEffect(() => {
    if (!open || !isNativeIOSApp()) return undefined;
    let cancelled = false;
    getFaceIDStatus()
      .then((status) => { if (!cancelled) setFaceIDStatus(status); })
      .catch(() => { if (!cancelled) setFaceIDStatus({ available: false, enabled: false }); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    getAccountDeletionStatus()
      .then((status) => {
        if (!cancelled) {
          setAccountDeletion(status?.status === "pending" ? status : null);
        }
      })
      .catch((error) => {
        const code = error?.response?.data?.error?.code;

        if (["ACCOUNT_DELETED", "AUTH_USER_NOT_FOUND", "AUTH_SESSION_INVALID"].includes(code)) {
          clearLocalSession();
          close();
          navigate(mobile ? "/mobile" : "/", { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [close, mobile, navigate, open]);

  useEffect(() => {
    if (accountDeletion?.status !== "pending" || !accountDeletion.deleteAt) return undefined;

    setCountdownNow(Date.now());
    const timer = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [accountDeletion?.deleteAt, accountDeletion?.status]);

  useEffect(() => {
    if (accountDeletion?.status !== "pending" || !accountDeletion.deleteAt) return undefined;
    if (new Date(accountDeletion.deleteAt).getTime() > countdownNow) return undefined;

    let cancelled = false;

    getAccountDeletionStatus()
      .then((status) => {
        if (!cancelled) {
          setAccountDeletion(status?.status === "pending" ? status : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearLocalSession();
          close();
          navigate(mobile ? "/mobile" : "/", { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountDeletion?.deleteAt, accountDeletion?.status, close, countdownNow, mobile, navigate]);

  const appearanceText = useMemo(() => {
    const theme = prefs.theme || "system";
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }, [prefs.theme]);
  const currentLanguageCode = (isNativeIOSApp() ? uiLanguage : (prefs.appLanguage || prefs.language || "en")).split("-")[0].toLowerCase();
  const currentLanguage = LANGUAGE_OPTIONS.find((language) => language.value === currentLanguageCode) || LANGUAGE_OPTIONS[0];
  const currentLanguageLabel = languageDisplayName(currentLanguage);
  const activeAppAccentColor = APP_ACCENT_COLORS.find((color) => color.value.toLowerCase() === String(prefs.appColor || prefs.accentColor || "var(--bm-primary)").toLowerCase()) || APP_ACCENT_COLORS[0];
  const activeMessageColor = MESSAGE_COLORS.find((color) => color.value.toLowerCase() === String(prefs.chatColor || "var(--bm-primary)").toLowerCase()) || MESSAGE_COLORS[0];
  const activeAiVoice = AI_VOICE_OPTIONS.find((voice) => voice.value === (prefs.aiVoice || "nova")) || AI_VOICE_OPTIONS[0];
  const activeSpeechSpeed = SPEECH_SPEED_OPTIONS.find((speed) => speed.value === (prefs.speechSpeed || "normal")) || SPEECH_SPEED_OPTIONS[1];
  const activeVoiceLanguage = VOICE_LANGUAGE_OPTIONS.find((language) => language.value === (prefs.voiceLanguage || "auto")) || VOICE_LANGUAGE_OPTIONS[0];
  const plan = user?.subscription?.plan || user?.plan || user?.accountPlan || (user?.authProvider === "guest" ? "Guest" : "Free");

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

  useEffect(() => {
    if (!open || !isNativeIOSApp()) return undefined;
    let handle;
    void addNativeGlassActionListener((event) => {
      if (event?.action === "settingsClose") {
        requestSettingsDismiss();
        return;
      }
      if (event?.action === "settingsBack") {
        backOneSettingsLevel();
        return;
      }
      if (!["settingsSelection", "settingsConfirmation", "settingsSecurePrompt"].includes(event?.action)) return;
      const pending = nativeActionPendingRef.current;
      if (!pending || pending.requestId !== event.requestId) return;
      nativeActionPendingRef.current = null;
      pending.onResult(event);
    }).then((listenerHandle) => { handle = listenerHandle; });
    return () => { handle?.remove?.(); };
  }, [backOneSettingsLevel, open, requestSettingsDismiss]);

  useEffect(() => {
    if (!settingsMotionDisabled) return undefined;
    void setNativeSettingsPresentation({ visible: open, isDark, offsetY: settingsPresentationOffsetRef.current });
    return () => {
      void setNativeSettingsPresentation({ visible: false, isDark, offsetY: settingsPresentationOffsetRef.current });
    };
  }, [isDark, open, settingsMotionDisabled]);

  useEffect(() => {
    if (!settingsMotionDisabled || !open) return undefined;
    void setNativeSettingsBackVisible(pane !== "main", { isDark });
    return () => {
      void setNativeSettingsBackVisible(false, { isDark });
    };
  }, [isDark, open, pane, settingsMotionDisabled]);

  const nativeRequestId = (type) => globalThis.crypto?.randomUUID?.() || `${type}-${Date.now()}`;

  const openNativeSettingsSelection = (type, title, options, selectedValue, onSelect) => {
    const requestId = nativeRequestId(type);
    nativeActionPendingRef.current = { requestId, onResult: (event) => onSelect(event.value) };
    void presentNativeIOSSelection({ title, options, selectedValue, requestId });
  };

  const openNativeConfirmation = (type, details, onConfirm) => {
    const requestId = nativeRequestId(type);
    nativeActionPendingRef.current = { requestId, onResult: (event) => { if (event.confirmed === true) onConfirm(); } };
    void presentNativeIOSConfirmation({ ...details, requestId });
  };

  const openNativeSecurePrompt = (type, details, onConfirm) => {
    const requestId = nativeRequestId(type);
    nativeActionPendingRef.current = { requestId, onResult: (event) => { if (event.confirmed === true && event.value) onConfirm(event.value); } };
    void presentNativeIOSSecurePrompt({ ...details, requestId });
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

  const toggleFaceIDLock = async () => {
    setSaving("face-id");
    try {
      if (!faceIDStatus.enabled) {
        await restoreExistingSession();
      }
      const result = faceIDStatus.enabled
        ? await disableFaceIDLock()
        : await enableFaceIDLock();
      const next = await getFaceIDStatus();
      setFaceIDStatus(next);
      toast.success(result?.enabled ? "Face ID Lock enabled" : "Face ID Lock disabled");
    } catch (error) {
      if (error?.code !== "FACE_ID_CANCELLED") {
        toast.error(error?.message || "Face ID setting could not be changed.");
      }
    } finally {
      setSaving("");
    }
  };

  const requestDeletionWithPassword = async (password) => {
    if (!password) return;

    setSaving("delete-account");
    setDeleteError("");

    try {
      const status = await requestAccountDeletion(password);
      setAccountDeletion(status?.status === "pending" ? status : null);
      setDeletePassword("");
      toast.success("Account deletion scheduled");
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not schedule account deletion.");
      setDeleteError(message);
      toast.error(message);
    } finally {
      setSaving("");
    }
  };

  const handleRequestAccountDeletion = (event) => {
    event.preventDefault();
    void requestDeletionWithPassword(deletePassword);
  };

  const openNativeDeleteAccount = () => {
    if (accountDeletion?.status === "pending") {
      openNativeConfirmation("cancel-account-deletion", {
        title: "Cancel Account Deletion?",
        message: "Your BlueMind account will remain active.",
        confirmTitle: "Keep Account",
      }, () => { void handleCancelAccountDeletion(); });
      return;
    }
    openNativeConfirmation("delete-account-warning", {
      title: "Delete Account?",
      message: "This permanently removes your BlueMind account and data after the cancellation period.",
      confirmTitle: "Continue",
      destructive: true,
    }, () => {
      openNativeSecurePrompt("delete-account-password", {
        title: "Confirm Password",
        message: "Enter your password to authorize account deletion.",
        placeholder: "Password",
        confirmTitle: "Continue",
        destructive: true,
      }, (password) => {
        openNativeConfirmation("delete-account-final", {
          title: "Permanently Delete Account?",
          message: "BlueMind will schedule permanent deletion. This action is destructive.",
          confirmTitle: "Delete Account",
          destructive: true,
        }, () => { void requestDeletionWithPassword(password); });
      });
    });
  };

  const handleCancelAccountDeletion = async () => {
    setSaving("cancel-delete-account");
    setDeleteError("");

    try {
      const status = await cancelAccountDeletion();
      setAccountDeletion(status?.status === "pending" ? status : null);
      setSelectionPopup(null);
      toast.success("Account deletion cancelled");
    } catch (error) {
      const code = error?.response?.data?.error?.code;

      if (code === "ACCOUNT_DELETION_COMPLETED" || code === "ACCOUNT_DELETED") {
        clearLocalSession();
        close();
        navigate(mobile ? "/mobile" : "/", { replace: true });
        return;
      }

      toast.error(getApiErrorMessage(error, "Could not cancel account deletion."));
    } finally {
      setSaving("");
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

  const openChild = (nextPane) => {
    paneHistoryRef.current = [...paneHistoryRef.current, pane];
    setPane(nextPane);
  };
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

  const setNotificationRowEnabled = async (row, enabled) => {
    if (enabled && isNativeIOSApp() && row.id !== "email") {
      let status = notificationAuthorization;
      if (status === "notDetermined" || status === "unknown") {
        const result = await requestNativeIOSNotificationAuthorization();
        status = result?.status || "unknown";
        setNotificationAuthorization(status);
      }
      if (!["authorized", "provisional", "ephemeral"].includes(status)) {
        toast.error("Notifications are disabled in iOS Settings.");
        void openNativeIOSAppSettings();
        return;
      }
    }
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

    await savePreference({ notificationsEnabled, notificationPreferences });
  };

  const clearAllChatHistory = async () => {
    setSaving("clear-chat-history");
    try {
      const result = await clearChatHistory();
      toast.success(result?.cleared ? `${result.cleared} conversations cleared` : "Chat history is already clear");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not clear chat history."));
    } finally {
      setSaving("");
    }
  };

  const revokeOtherSessions = async () => {
    setSaving("logout-other-devices");
    try {
      const result = await logoutOtherDevices();
      toast.success(`${result?.revoked || 0} other sessions logged out`);
      setActiveSessions((sessions) => sessions.filter((session) => session.current));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not log out other devices."));
    } finally {
      setSaving("");
    }
  };

  const openCompactSelection = (type, event) => {
    const rowRect = event.currentTarget.getBoundingClientRect();
    const sheetRect = event.currentTarget.closest(".bm-settings-sheet-surface")?.getBoundingClientRect();
    const surfaceTop = sheetRect?.top ?? 0;
    const surfaceBottom = sheetRect?.bottom ?? window.innerHeight;
    const rowTop = rowRect.top - surfaceTop;
    const rowBottom = rowRect.bottom - surfaceTop;
    const roomBelow = surfaceBottom - rowRect.bottom;
    const roomAbove = rowRect.top - surfaceTop;
    const placement = roomBelow >= 250 || roomBelow >= roomAbove ? "below" : "above";
    const availableRoom = placement === "above" ? roomAbove : roomBelow;

    setSelectionPopup({
      type,
      anchor: {
        placement,
        offset: placement === "above"
          ? Math.max(12, (surfaceBottom - surfaceTop) - rowTop + 8)
          : rowBottom + 8,
        maxHeight: Math.min(446, Math.max(180, availableRoom - 16)),
      },
    });
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
          className="bm-mobile-glass-control absolute bottom-0 right-0"
          aria-label="Edit profile picture"
        >
          {saving === "avatar" ? (
            <BlueMindLoadingDots />
          ) : (
            <PenLine className="h-4 w-4" />
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
            <Row icon={Mail} title="Change Email" onClick={() => openChild("change-email")} />
            <Row icon={CreditCard} title="Subscription" value={plan} onClick={() => navigate(mobile ? "/mobile/subscription" : "/subscription")} />
            <Row
              icon={Trash2}
              title="Delete Account"
              value={accountDeletion?.status === "pending" ? formatDeletionCountdown(accountDeletion.deleteAt, countdownNow) : undefined}
              danger
              onClick={() => isNativeIOSApp() ? openNativeDeleteAccount() : setSelectionPopup({ type: "delete-account" })}
            />
          </Card>
        </section>

        <section>
          <Title>Security &amp; Login</Title>
          <Card>
            <Row
              icon={Shield}
              title="Security & Login"
              value={isNativeIOSApp() ? (faceIDStatus.enabled ? "Face ID On" : "Face ID Off") : undefined}
              onClick={() => openChild("security-login")}
            />
          </Card>
        </section>

        <section>
          <Title>Appearance &amp; Colors</Title>
          <Card>
            <Row icon={(APPEARANCE_OPTIONS.find((option) => option.value === (prefs.theme || "system")) || APPEARANCE_OPTIONS[0]).icon} title="Appearance" value={appearanceText} onClick={(event) => isNativeIOSApp() ? openNativeSettingsSelection("appearance", "Appearance", APPEARANCE_OPTIONS.map(({ label, value }) => ({ label, value })), prefs.theme || "system", (value) => savePreference({ theme: value })) : openCompactSelection("appearance", event)} />
            <Row icon={Palette} title="App Accent Color" value={activeAppAccentColor.label} onClick={(event) => isNativeIOSApp() ? openNativeSettingsSelection("app-accent-color", "App Accent Color", APP_ACCENT_COLORS, activeAppAccentColor.value, (value) => savePreference({ appColor: value, accentColor: value })) : openCompactSelection("app-accent-color", event)} />
            <Row icon={Palette} title="Chat Color" value={activeMessageColor.label} onClick={(event) => isNativeIOSApp() ? openNativeSettingsSelection("message-color", "Chat Color", MESSAGE_COLORS, activeMessageColor.value, (value) => savePreference({ chatColor: value })) : openCompactSelection("message-color", event)} />
          </Card>
        </section>

        <section>
          <Title>App Settings</Title>
          <Card>
            <Row icon={Settings} title="General" onClick={() => openChild("general")} />
            <Row
              icon={Globe2}
              title="Language"
              value={currentLanguageLabel}
              onClick={() => {
                if (isNativeIOSApp()) {
                  void openNativeIOSAppSettings();
                  return;
                }
                setSelectionPopup({ type: "language" });
              }}
            />
            <Row icon={Bell} title="Notifications" onClick={() => openChild("notifications")} />
          </Card>
        </section>

        <section>
          <Title>Voice &amp; Audio</Title>
          <Card>
            <Row icon={Volume2} title="AI Voice" value={activeAiVoice.label} onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("ai-voice", "AI Voice", AI_VOICE_OPTIONS.map(({ label, value }) => ({ label, value, symbol: "waveform" })), activeAiVoice.value, (value) => savePreference({ aiVoice: value })) : setSelectionPopup({ type: "ai-voice" })} />
            <Row icon={Play} title="Voice Preview" value="Unavailable" disabled>
              <span className={descriptionClass}>Preview playback will be enabled when BlueMind voice is connected.</span>
            </Row>
            <Row icon={Gauge} title="Speech Speed" value={activeSpeechSpeed.label} onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("speech-speed", "Speech Speed", SPEECH_SPEED_OPTIONS, activeSpeechSpeed.value, (value) => savePreference({ speechSpeed: value })) : setSelectionPopup({ type: "speech-speed" })} />
            <Row icon={Volume2} title="Auto-play AI Responses" value={prefs.voiceAutoplayEnabled === true ? "On" : "Off"} onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("voice-autoplay", "Auto-play AI Responses", [{ label: "On", value: "true" }, { label: "Off", value: "false" }], String(prefs.voiceAutoplayEnabled === true), (value) => savePreference({ voiceAutoplayEnabled: value === "true" })) : setSelectionPopup({ type: "voice-autoplay" })} />
            <Row icon={Globe2} title="Voice Language" value={activeVoiceLanguage.label} onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("voice-language", "Voice Language", VOICE_LANGUAGE_OPTIONS, activeVoiceLanguage.value, (value) => savePreference({ voiceLanguage: value })) : setSelectionPopup({ type: "voice-language" })} />
          </Card>
        </section>

        <section>
          <Title>Privacy &amp; Data</Title>
          <Card>
            <Row icon={Database} title="Chat History" value={prefs.chatHistoryMode || "On" } onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("chat-history", "Chat History", [{ label: "On", value: "On" }, { label: "Off", value: "Off" }], prefs.chatHistoryMode || "On", (value) => savePreference({ chatHistoryMode: value })) : setSelectionPopup({ type: "chat-history" })} />
            <Row
              icon={Trash2}
              title="Clear Chat History"
              disabled={saving === "clear-chat-history"}
              onClick={() => isNativeIOSApp()
                ? openNativeConfirmation("clear-chat-history", { title: "Clear Chat History?", message: "This removes all conversations from your BlueMind account. This cannot be undone.", confirmTitle: "Clear History", destructive: true }, () => { void clearAllChatHistory(); })
                : (window.confirm("Clear all chat history? This cannot be undone.") && void clearAllChatHistory())}
            />
            <Row icon={Download} title="Export My Data" value="Unavailable" disabled>
              <span className={descriptionClass}>Data export is not yet supported by the BlueMind backend.</span>
            </Row>
            <Row icon={Shield} title="Privacy Controls" onClick={() => openChild("privacy-controls")} />
          </Card>
        </section>

        <section>
          <Title>Help &amp; Support</Title>
          <Card>
            <Row icon={Flag} title="Report App Issue" onClick={() => openChild("report-issue")} />
            <Row icon={HelpCircle} title="Help Center" onClick={() => openChild("help-center")} />
            <Row icon={Mail} title="Contact Support" value={SUPPORT_EMAIL} onClick={() => window.location.href = `mailto:${SUPPORT_EMAIL}`} />
            <Row icon={Info} title="About BlueMind" onClick={() => openChild("about")} />
          </Card>
        </section>

        <button
          type="button"
          onClick={() => isNativeIOSApp() ? openNativeConfirmation("logout", { title: "Log out?", message: "You will need to sign in again to use BlueMind AI.", confirmTitle: "Log Out", destructive: true }, () => { void handleLogout(); }) : setLogoutConfirmOpen(true)}
          className={cn(
            "flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[26px] border text-[15px] font-bold text-red-500 active:scale-[0.985]",
            isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS,
          )}
          style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
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
        <form
          onSubmit={handleConfirmEmailChange}
          className={cn("space-y-4 rounded-[24px] p-4", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
          style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
        >
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
    <div
      className={cn("rounded-[26px] p-5", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
      style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
    >
      <p className={cn("text-base font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Email recovery</p>
      <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        BlueMind does not currently expose an automated backend email-access recovery endpoint. If you are signed in and know your password, use Change Email. Otherwise, use the password recovery flow below to recover account access through your registered email.
      </p>
      <button
        type="button"
        onClick={() => openChild("forgot-password")}
        className="mt-4 min-h-12 w-full rounded-2xl border border-white/[0.12] bg-[rgba(37,99,235,0.78)] px-4 text-sm font-extrabold text-white active:bg-[rgba(37,99,235,0.88)]"
        style={SETTINGS_BLUE_GLASS_STYLE}
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
        <div
          className={cn("rounded-[24px] p-4 text-sm font-semibold leading-6", isDark ? `${SETTINGS_GLASS_CLASS} text-[var(--bm-text-secondary)]` : `${SETTINGS_LIGHT_GLASS_CLASS} text-[var(--bm-text-secondary)]`)}
          style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
        >
          If this email belongs to a BlueMind account, a recovery email has been sent.
        </div>
      )}
    </div>
  );

  const renderSubscription = () => (
    <div
      className={cn("rounded-[26px] p-5", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
      style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
    >
      <p className={cn("text-sm font-bold uppercase tracking-[0.08em]", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Current Plan</p>
      <p className={cn("mt-2 text-2xl font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{plan}</p>
      <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
        Subscription data is read from your authenticated BlueMind account.
      </p>
    </div>
  );

  const renderGeneral = () => (
    <Card>
      <Row icon={SlidersHorizontal} title="Open App Directly to Chat" value={prefs.openAppDirectlyToChat === true ? "On" : "Off"} onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("open-chat-default", "Open App Directly to Chat", [{ label: "On", value: "true" }, { label: "Off", value: "false" }], String(prefs.openAppDirectlyToChat === true), (value) => savePreference({ openAppDirectlyToChat: value === "true" })) : setSelectionPopup({ type: "open-chat-default" })}>
        <span className={descriptionClass}>Choose whether BlueMind opens straight into chat after sign-in.</span>
      </Row>
      <Row icon={Sparkles} title="Animations" value={prefs.animations === false ? "Off" : "On"} onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("animations", "Animations", [{ label: "On", value: "true" }, { label: "Off", value: "false" }], String(prefs.animations !== false), (value) => savePreference({ animations: value === "true" })) : setSelectionPopup({ type: "animations" })}>
        <span className={descriptionClass}>Keep interface motion smooth and consistent.</span>
      </Row>
    </Card>
  );

  const renderSecurityLogin = () => (
    <div className="space-y-5">
      <Card>
        {isNativeIOSApp() && (
          <Row
            icon={ScanFace}
            title="Face ID Lock"
            value={faceIDStatus.enabled ? "On" : "Off"}
            disabled={saving === "face-id"}
            onClick={() => void toggleFaceIDLock()}
          >
            <span className={descriptionClass}>
              {faceIDStatus.available
                ? "Use Face ID to unlock BlueMind on this device."
                : "Face ID is not available or configured on this device."}
              <span className="mt-1 block">Biometric authentication is performed locally by your device. BlueMind does not receive or store your biometric data.</span>
            </span>
          </Row>
        )}
        <Row icon={KeyRound} title="Change Password" onClick={() => openChild("change-password")} />
        <Row icon={Shield} title="Sign-in Methods" onClick={() => openChild("sign-in-methods")} />
        <Row icon={MonitorSmartphone} title="Active Sessions & Devices" onClick={() => openChild("active-sessions")} />
        <Row
          icon={LogOut}
          title="Log out of other devices"
          disabled={saving === "logout-other-devices"}
          onClick={() => isNativeIOSApp()
            ? openNativeConfirmation("logout-other-devices", { title: "Log Out Other Devices?", message: "Your current iPhone session will stay signed in.", confirmTitle: "Log Out", destructive: true }, () => { void revokeOtherSessions(); })
            : (window.confirm("Log out of all other devices?") && void revokeOtherSessions())}
        />
      </Card>
    </div>
  );

  const renderSignInMethods = () => {
    const provider = user?.authProvider || "local";
    const methods = provider === "mixed"
      ? ["Email and password", "Google"]
      : provider === "google"
        ? ["Google"]
        : provider === "guest"
          ? ["Guest session"]
          : ["Email and password"];

    return (
      <Card>
        {methods.map((method) => (
          <Row key={method} icon={Shield} title={method} value="Linked" />
        ))}
      </Card>
    );
  };

  const renderActiveSessions = () => (
    <div className="space-y-4">
      <Card>
        {saving === "sessions-load" && <div className="p-5"><BlueMindLoadingDots /></div>}
        {saving !== "sessions-load" && activeSessions.map((session) => (
          <Row
            key={session.id}
            icon={MonitorSmartphone}
            title={session.device}
            value={session.current ? "This device" : new Date(session.lastUsedAt).toLocaleDateString()}
          >
            <span className={descriptionClass}>Last active {new Date(session.lastUsedAt).toLocaleString()}</span>
          </Row>
        ))}
        {saving !== "sessions-load" && activeSessions.length === 0 && (
          <p className={cn("p-5 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>No active sessions were returned.</p>
        )}
      </Card>
    </div>
  );

  const renderPrivacyControls = () => (
    <Card>
      <Row icon={Database} title="Chat History" value={prefs.chatHistoryMode || "On"} onClick={() => isNativeIOSApp() ? openNativeSettingsSelection("privacy-chat-history", "Chat History", [{ label: "On", value: "On" }, { label: "Off", value: "Off" }], prefs.chatHistoryMode || "On", (value) => savePreference({ chatHistoryMode: value })) : setSelectionPopup({ type: "chat-history" })}>
        <span className={descriptionClass}>Controls whether new chats are retained in your BlueMind account.</span>
      </Row>
      <Row icon={Shield} title="Privacy Policy" onClick={() => openChild("privacy-policy")} />
    </Card>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      {isNativeIOSApp() && (
        <Card>
          <Row
            icon={Bell}
            title="iOS Notification Permission"
            value={["authorized", "provisional", "ephemeral"].includes(notificationAuthorization) ? "Allowed" : notificationAuthorization === "denied" ? "Denied" : "Not Set"}
            onClick={notificationAuthorization === "denied" ? () => void openNativeIOSAppSettings() : undefined}
          >
            <span className={descriptionClass}>BlueMind notification preferences cannot override the permission selected in iOS.</span>
          </Row>
        </Card>
      )}
      <Card>
      {NOTIFICATION_ROWS.map((row) => {
        const systemAllowsPush = row.id === "email" || !isNativeIOSApp() || ["authorized", "provisional", "ephemeral"].includes(notificationAuthorization);
        const enabled = systemAllowsPush && isNotificationEnabled(row);

        return (
          <Row
            key={row.id}
            icon={Bell}
            title={row.title}
            onClick={() => isNativeIOSApp() ? openNativeSettingsSelection(`notification-${row.id}`, row.title, [{ label: "On", value: "true" }, { label: "Off", value: "false" }], String(enabled), (value) => { void setNotificationRowEnabled(row, value === "true"); }) : setSelectionPopup({ type: "notification", row })}
            trailing={<span className={cn("inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold", enabled ? "bg-emerald-500/12 text-emerald-500" : "bg-red-500/12 text-red-500")}>
              <span className={cn("h-2 w-2 rounded-full", enabled ? "bg-emerald-500" : "bg-red-500")} />
              {enabled ? "ON" : "OFF"}
            </span>}
          >
            <span className={descriptionClass}>{row.description}</span>
          </Row>
        );
      })}
      </Card>
    </div>
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
            isDark ? "border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white placeholder:text-white/42" : "border-black/[0.06] bg-white/[0.58] text-[#111111] placeholder:text-[#777777]",
          )}
          style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
          data-testid="issue-description"
        />
      </label>

      <section
        className={cn("rounded-[26px] p-4", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
        style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
      >
        <p className={cn("text-sm font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Attach Screenshot</p>
        <p className={cn("mt-1 text-xs font-medium leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          Add a screenshot, photo, or file that helps explain the issue.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => issueCameraInputRef.current?.click()}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-xs font-bold", isDark ? "border-white/[0.055] bg-white/[0.075] text-white" : "border-black/[0.06] bg-white/[0.44] text-[var(--bm-text-primary)]")}
            style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
          >
            <Camera className="h-5 w-5" />
            Camera
          </button>
          <button
            type="button"
            onClick={() => issuePhotosInputRef.current?.click()}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-xs font-bold", isDark ? "border-white/[0.055] bg-white/[0.075] text-white" : "border-black/[0.06] bg-white/[0.44] text-[var(--bm-text-primary)]")}
            style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
          >
            <FileUp className="h-5 w-5" />
            Photos
          </button>
          <button
            type="button"
            onClick={() => issueFilesInputRef.current?.click()}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-xs font-bold", isDark ? "border-white/[0.055] bg-white/[0.075] text-white" : "border-black/[0.06] bg-white/[0.44] text-[var(--bm-text-primary)]")}
            style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
          >
            <FileUp className="h-5 w-5" />
            Files
          </button>
        </div>

        {issueReport.attachments.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {issueReport.attachments.map((attachment, index) => (
              <div
                key={`${attachment.name}-${index}`}
                className={cn("relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
                style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
              >
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
    <div
      className={cn("rounded-[26px] p-5", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
      style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
    >
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
    <div
      className={cn("rounded-[26px] p-5", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
      style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
    >
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
      <div
        className={cn("rounded-[26px] p-5 text-center", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS)}
        style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
      >
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

  const closeSelectionPopup = () => {
    setSelectionPopup(null);
    setDeletePassword("");
    setDeleteError("");
  };

  const selectPreference = (patch) => {
    closeSelectionPopup();
    savePreference(patch);
  };

  const renderSelectionPopup = () => {
    const notificationRow = selectionPopup?.row;
    const notificationEnabled = notificationRow ? isNotificationEnabled(notificationRow) : false;

    if (selectionPopup?.type === "language") {
      return (
        <SettingsSelectionPopup open title="Language" isDark={isDark} onClose={closeSelectionPopup}>
          {LANGUAGE_OPTIONS.map((language) => (
            <SettingsPopupRow
              key={language.value}
              selected={currentLanguage.value === language.value}
              indicator={<Globe2 className={cn("h-5 w-5 shrink-0", isDark ? "text-white/76" : "text-[#111111]")} />}
              isDark={isDark}
              onClick={() => selectPreference({ appLanguage: language.value, language: language.value })}
            >
              {languageDisplayName(language)}
            </SettingsPopupRow>
          ))}
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "appearance") {
      return (
        <IOSSettingsSelectionPopover
          open
          label="Appearance"
          options={APPEARANCE_OPTIONS}
          value={prefs.theme || "system"}
          anchor={selectionPopup.anchor}
          isDark={isDark}
          onSelect={(option) => selectPreference({ theme: option.value })}
          onClose={closeSelectionPopup}
        />
      );
    }

    if (selectionPopup?.type === "app-accent-color") {
      return (
        <IOSSettingsSelectionPopover
          open
          label="App Accent Color"
          options={APP_ACCENT_COLORS.map((color) => ({ ...color, color: color.value, testId: `app-accent-color-popup-${color.label.toLowerCase()}` }))}
          value={activeAppAccentColor.value}
          anchor={selectionPopup.anchor}
          isDark={isDark}
          onSelect={(option) => selectPreference({ appColor: option.value, accentColor: option.value })}
          onClose={closeSelectionPopup}
        />
      );
    }

    if (selectionPopup?.type === "message-color") {
      return (
        <IOSSettingsSelectionPopover
          open
          label="Chat Color"
          options={MESSAGE_COLORS.map((color) => ({ ...color, color: color.value, testId: `message-color-popup-${color.label.toLowerCase()}` }))}
          value={activeMessageColor.value}
          anchor={selectionPopup.anchor}
          isDark={isDark}
          onSelect={(option) => selectPreference({ chatColor: option.value })}
          onClose={closeSelectionPopup}
        />
      );
    }

    if (selectionPopup?.type === "ai-voice") {
      return (
        <SettingsSelectionPopup open title="AI Voice" isDark={isDark} onClose={closeSelectionPopup}>
          {AI_VOICE_OPTIONS.map((voice) => (
            <SettingsPopupRow
              key={voice.value}
              selected={activeAiVoice.value === voice.value}
              indicator={<Volume2 className={cn("h-5 w-5 shrink-0", isDark ? "text-white/76" : "text-[#111111]")} />}
              isDark={isDark}
              onClick={() => selectPreference({ aiVoice: voice.value })}
            >
              <span className="block">
                <span className="block">{voice.label}</span>
                <span className={cn("mt-0.5 block text-xs font-medium leading-4", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{voice.description}</span>
                <span className={cn("mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]", isDark ? "bg-white/[0.06] text-[var(--bm-text-muted)]" : "bg-black/[0.04] text-[var(--bm-text-secondary)]")}>Preview unavailable</span>
              </span>
            </SettingsPopupRow>
          ))}
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "speech-speed") {
      return (
        <SettingsSelectionPopup open title="Speech Speed" isDark={isDark} onClose={closeSelectionPopup}>
          {SPEECH_SPEED_OPTIONS.map((speed) => (
            <SettingsPopupRow
              key={speed.value}
              selected={activeSpeechSpeed.value === speed.value}
              indicator={<Gauge className={cn("h-5 w-5 shrink-0", isDark ? "text-white/76" : "text-[#111111]")} />}
              isDark={isDark}
              onClick={() => selectPreference({ speechSpeed: speed.value })}
            >
              {speed.label}
            </SettingsPopupRow>
          ))}
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "voice-language") {
      return (
        <SettingsSelectionPopup open title="Voice Language" isDark={isDark} onClose={closeSelectionPopup}>
          {VOICE_LANGUAGE_OPTIONS.map((language) => (
            <SettingsPopupRow
              key={language.value}
              selected={activeVoiceLanguage.value === language.value}
              indicator={<Globe2 className={cn("h-5 w-5 shrink-0", isDark ? "text-white/76" : "text-[#111111]")} />}
              isDark={isDark}
              onClick={() => selectPreference({ voiceLanguage: language.value })}
            >
              {language.label}
            </SettingsPopupRow>
          ))}
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "voice-autoplay") {
      return (
        <SettingsSelectionPopup open title="Auto-play AI Responses" isDark={isDark} onClose={closeSelectionPopup}>
          <SettingsPopupRow
            selected={prefs.voiceAutoplayEnabled === true}
            indicator={<span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />}
            isDark={isDark}
            onClick={() => selectPreference({ voiceAutoplayEnabled: true })}
          >
            ON
          </SettingsPopupRow>
          <SettingsPopupRow
            selected={prefs.voiceAutoplayEnabled !== true}
            indicator={<span className="h-3 w-3 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]" />}
            isDark={isDark}
            onClick={() => selectPreference({ voiceAutoplayEnabled: false })}
          >
            OFF
          </SettingsPopupRow>
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "chat-history") {
      const chatHistoryMode = prefs.chatHistoryMode || "On";

      return (
        <SettingsSelectionPopup open title="Chat History" isDark={isDark} onClose={closeSelectionPopup}>
          {["On", "Off"].map((mode) => (
            <SettingsPopupRow
              key={mode}
              selected={chatHistoryMode === mode}
              indicator={<Database className={cn("h-5 w-5 shrink-0", isDark ? "text-white/76" : "text-[#111111]")} />}
              isDark={isDark}
              onClick={() => selectPreference({ chatHistoryMode: mode })}
            >
              {mode}
            </SettingsPopupRow>
          ))}
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "open-chat-default" || selectionPopup?.type === "animations") {
      const isAnimations = selectionPopup.type === "animations";
      const title = isAnimations ? "Animations" : "Open App Directly to Chat";
      const currentValue = isAnimations ? prefs.animations !== false : prefs.openAppDirectlyToChat === true;
      const prefKey = isAnimations ? "animations" : "openAppDirectlyToChat";

      return (
        <SettingsSelectionPopup open title={title} isDark={isDark} onClose={closeSelectionPopup}>
          <SettingsPopupRow
            selected={currentValue}
            indicator={<span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />}
            isDark={isDark}
            onClick={() => selectPreference({ [prefKey]: true })}
          >
            ON
          </SettingsPopupRow>
          <SettingsPopupRow
            selected={!currentValue}
            indicator={<span className="h-3 w-3 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]" />}
            isDark={isDark}
            onClick={() => selectPreference({ [prefKey]: false })}
          >
            OFF
          </SettingsPopupRow>
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "delete-account") {
      const deletionPending = accountDeletion?.status === "pending" && accountDeletion.deleteAt;

      return (
        <SettingsSelectionPopup open title="Delete Account" isDark={isDark} onClose={closeSelectionPopup}>
          {deletionPending ? (
            <div className="space-y-4">
              <div className={cn("rounded-[22px] px-4 py-4 text-sm font-semibold leading-6", isDark ? "bg-white/[0.055] text-[var(--bm-text-secondary)]" : "bg-black/[0.035] text-[var(--bm-text-secondary)]")}>
                <p className={cn("text-[15px] font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Account deletion scheduled</p>
                <p className="mt-2">Your account will be permanently deleted in:</p>
                <p className="mt-3 text-center text-[34px] font-black tabular-nums text-red-500">
                  {formatDeletionCountdown(accountDeletion.deleteAt, countdownNow)}
                </p>
                <p className="mt-3">This countdown is based on the backend deletion timestamp and will continue if you refresh or reopen BlueMind.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelAccountDeletion}
                disabled={saving === "cancel-delete-account"}
                className={cn("flex min-h-[52px] w-full items-center justify-center rounded-[20px] border px-4 text-sm font-extrabold", isDark ? "border-white/[0.055] bg-white/[0.045] text-white" : "border-black/[0.06] bg-white/[0.58] text-[var(--bm-text-primary)]")}
                style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
              >
                {saving === "cancel-delete-account" ? <BlueMindLoadingDots /> : "Cancel Deletion"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestAccountDeletion} className="space-y-4">
              <div className={cn("rounded-[22px] px-4 py-4 text-sm font-semibold leading-6", isDark ? "bg-red-500/[0.10] text-[var(--bm-text-secondary)]" : "bg-red-500/[0.08] text-[var(--bm-text-secondary)]")}>
                <p className="font-extrabold text-red-500">This action is permanent.</p>
                <p className="mt-2">After password verification, BlueMind will schedule this account for deletion. You will have 5 minutes to cancel before your account and user data are permanently removed.</p>
              </div>
              <SettingsInput
                label="Account Email"
                type="email"
                value={user?.email || ""}
                readOnly
                isDark={isDark}
                icon={Mail}
              />
              <SettingsInput
                label="Password"
                type="password"
                value={deletePassword}
                onChange={(event) => {
                  setDeletePassword(event.target.value);
                  setDeleteError("");
                }}
                placeholder="Confirm your password"
                autoComplete="current-password"
                isDark={isDark}
                icon={KeyRound}
              />
              {deleteError && (
                <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-semibold leading-5 text-red-500">
                  {deleteError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeSelectionPopup}
                  className={cn("min-h-12 rounded-2xl border text-sm font-bold", isDark ? "border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white" : "border-black/[0.06] bg-white/[0.44] text-[var(--bm-text-primary)]")}
                  style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!deletePassword || saving === "delete-account"}
                  className={cn("min-h-12 rounded-2xl border border-red-500/25 px-4 text-sm font-extrabold text-red-500 disabled:cursor-not-allowed disabled:opacity-55", isDark ? "bg-white/[0.045]" : "bg-white/[0.58]")}
                  style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
                >
                  {saving === "delete-account" ? <BlueMindLoadingDots /> : "Delete Account"}
                </button>
              </div>
            </form>
          )}
        </SettingsSelectionPopup>
      );
    }

    if (selectionPopup?.type === "notification" && notificationRow) {
      return (
        <SettingsSelectionPopup open title={notificationRow.title} isDark={isDark} onClose={closeSelectionPopup}>
          <SettingsPopupRow
            selected={notificationEnabled}
            indicator={<span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />}
            isDark={isDark}
            onClick={() => {
              closeSelectionPopup();
              void setNotificationRowEnabled(notificationRow, true);
            }}
          >
            ON
          </SettingsPopupRow>
          <SettingsPopupRow
            selected={!notificationEnabled}
            indicator={<span className="h-3 w-3 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]" />}
            isDark={isDark}
            onClick={() => {
              closeSelectionPopup();
              void setNotificationRowEnabled(notificationRow, false);
            }}
          >
            OFF
          </SettingsPopupRow>
        </SettingsSelectionPopup>
      );
    }

    return null;
  };

  const childTitles = {
    "change-email": "Change Email",
    "email-recovery": "Email Recovery",
    "change-password": "Change Password",
    "forgot-password": "Forgot Password",
    subscription: "Subscription",
    language: "Language",
    appearance: "Appearance",
    "message-color": "Message Color",
    general: "General",
    "security-login": "Security & Login",
    "sign-in-methods": "Sign-in Methods",
    "active-sessions": "Active Sessions & Devices",
    "privacy-controls": "Privacy Controls",
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
    if (pane === "security-login") return renderSecurityLogin();
    if (pane === "sign-in-methods") return renderSignInMethods();
    if (pane === "active-sessions") return renderActiveSessions();
    if (pane === "privacy-controls") return renderPrivacyControls();
    if (pane === "language" || pane === "appearance" || pane === "message-color") return renderGeneral();
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
      ref={sheetSurfaceRef}
      {...(!overlay && !settingsMotionDisabled ? {
        initial: overlayMotion.sheet.initial,
        animate: overlayMotion.sheet.animate,
        exit: overlayMotion.sheet.exit,
        transition: overlayMotion.transition.sheet,
      } : {})}
      {...(settingsMotionDisabled ? {
        initial: { y: typeof window === "undefined" ? 1000 : window.innerHeight },
        animate: { y: sheetDismissing ? (typeof window === "undefined" ? 1000 : window.innerHeight) : 0 },
        transition: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
        onUpdate: (latest) => {
          if (typeof latest.y !== "number") return;
          settingsPresentationOffsetRef.current = latest.y;
          void setNativeSettingsPresentation({ visible: true, isDark, offsetY: latest.y });
        },
        onAnimationComplete: () => {
          if (sheetDismissing) close();
        },
      } : {})}
      drag={mobile && settingsMotionDisabled ? "y" : mobile ? "y" : false}
      dragControls={sheetDragControls}
      dragListener={false}
      dragDirectionLock
      dragConstraints={settingsMotionDisabled ? { top: 0, bottom: typeof window === "undefined" ? 1000 : window.innerHeight } : { top: 0, bottom: 0 }}
      dragElastic={settingsMotionDisabled ? 0 : { top: 0, bottom: 0.22 }}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (!mobile) return;
        if (settingsMotionDisabled) {
          const sheetHeight = sheetSurfaceRef.current?.getBoundingClientRect?.().height || window.innerHeight;
          if (info.offset.y >= sheetHeight * 0.48 || info.velocity.y >= 1100) {
            requestSettingsDismiss();
          }
          return;
        }
        if (info.offset.y > 92 || info.velocity.y > 620) {
          close();
        }
      }}
      className={cn(
        "relative isolate flex w-full flex-col overflow-hidden",
        "bm-settings-sheet-surface",
        settingsMotionDisabled && "bm-settings-zero-motion",
        isDark ? "text-white" : "text-[var(--bm-text-primary)]",
        mobile ? "bm-settings-sheet-mobile rounded-t-[38px]" : "mx-auto h-[86dvh] max-w-[560px] rounded-[34px]",
      )}
      style={isDark ? SETTINGS_SHEET_GLASS_STYLE : SETTINGS_LIGHT_SHEET_GLASS_STYLE}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="relative flex h-14 shrink-0 touch-none items-center justify-between px-5 pt-2"
        onPointerDown={(event) => {
          if (!mobile || !event.target?.closest?.("[data-settings-drag-handle='true']")) return;
          sheetDragControls.start(event);
        }}
      >
        {settingsMotionDisabled && (
          <span
            data-settings-drag-handle="true"
            className="absolute left-1/2 top-2 h-[5px] w-10 -translate-x-1/2 rounded-full bg-white/30"
            aria-hidden="true"
          />
        )}
        {pane === "main" || settingsMotionDisabled ? (
          <span className="w-10" />
        ) : (
          <button type="button" onClick={backOneSettingsLevel} className="bm-mobile-glass-control" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-[15px] font-bold">{pane === "main" ? "Settings" : childTitles[pane] || "Settings"}</h2>
        {settingsMotionDisabled ? (
          <span className="w-10" aria-hidden="true" />
        ) : (
          <button type="button" onClick={requestSettingsDismiss} className="bm-mobile-glass-control" aria-label="Close settings">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-2">
        {pane === "main" ? renderMain() : renderChild()}
      </div>

      {renderSelectionPopup()}

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

      <BlueMindOverlay
        open={logoutConfirmOpen}
        kind="sheet"
        portal={false}
        contained
        className="absolute inset-0 z-20 flex items-end p-4"
        backdropClassName="bg-black/55"
        contentClassName={cn("w-full rounded-[28px] p-5", isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_POPUP_GLASS_CLASS)}
        contentStyle={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
        onClose={() => setLogoutConfirmOpen(false)}
        closeLabel="Dismiss log out confirmation"
      >
              <p className={cn("text-lg font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Log out?</p>
              <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>You will need to sign in again to use BlueMind AI.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className={cn("min-h-12 rounded-2xl border text-sm font-bold", isDark ? "border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white" : "border-black/[0.06] bg-white/[0.44] text-[var(--bm-text-primary)]")}
                  style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    "min-h-12 rounded-2xl border text-sm font-bold text-red-500 active:scale-[0.985]",
                    isDark ? SETTINGS_GLASS_CLASS : SETTINGS_LIGHT_GLASS_CLASS,
                  )}
                  style={isDark ? SETTINGS_GLASS_STYLE : SETTINGS_LIGHT_GLASS_STYLE}
                >
                  Log out
                </button>
              </div>
      </BlueMindOverlay>
    </motion.div>
  );

  if (!open) return null;

  if (!overlay) {
    return <div className={cn("flex min-h-[100dvh] items-end justify-center p-0 md:items-center md:p-6", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")}>{sheetContent}</div>;
  }

  return (
    <BlueMindOverlay
      open={open}
      kind="sheet"
      className="bm-settings-presentation z-[140] flex items-end justify-center md:items-center md:p-6"
      backdropClassName="bm-settings-sheet-backdrop"
      closeOnBackdrop={false}
      instant={settingsMotionDisabled}
      contentClassName="w-full md:flex md:justify-center"
      onClose={close}
      closeLabel="Dismiss settings"
      contentProps={{ onClick: (event) => event.stopPropagation() }}
    >
      {sheetContent}
    </BlueMindOverlay>
  );
}
