import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Flag,
  HardDrive,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Moon,
  Palette,
  Pencil,
  Settings,
  ShieldCheck,
  Volume2,
  X,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
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

const AVATAR_COLORS = ["#193B68", "#2563EB", "#059669", "#EA580C", "#DC2626", "#7C3AED", "#0891B2", "#BE123C"];
const ACCENT_COLORS = [
  { label: "Blue", value: "#193B68" },
  { label: "Teal", value: "#00C4B8" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Rose", value: "#E11D48" },
];
const MESSAGE_COLORS = [
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

function SettingRow({ icon: Icon, title, value, accent, danger, disabled, onClick, children, isDark = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        "flex min-h-[68px] w-full items-center gap-3 border-b px-4 text-left last:border-b-0",
        isDark ? "border-white/[0.07]" : "border-[#E5E7EB]",
        onClick && (isDark ? "active:bg-white/[0.06]" : "active:bg-[#EEF2F7]"),
        disabled && "opacity-55",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", danger ? "text-red-500" : accent ? "text-[#4C8DFF]" : isDark ? "text-[#D8D8D8]" : "text-[#475569]")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-semibold", danger ? "text-red-500" : accent ? "text-[#2563EB]" : isDark ? "text-white" : "text-[#111827]")}>
          {title}
        </span>
        {children}
      </span>
      {value && <span className={cn("max-w-[42%] truncate text-sm font-medium", isDark ? "text-[#9CA3AF]" : "text-[#64748B]")}>{value}</span>}
      {onClick && !disabled && <ChevronRight className={cn("h-4 w-4 shrink-0", isDark ? "text-[#8C8C8C]" : "text-[#94A3B8]")} />}
    </button>
  );
}

function SettingsCard({ children, isDark = true }) {
  return (
    <div className={cn("overflow-hidden rounded-[26px] shadow-sm ring-1", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      {children}
    </div>
  );
}

function SectionTitle({ children, isDark = true }) {
  return <h3 className={cn("mb-2 px-1 text-[13px] font-bold uppercase tracking-[0.08em]", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>{children}</h3>;
}

function ComingSoonPanel({ title, isDark = true }) {
  return (
    <div className={cn("rounded-[26px] p-5 text-center ring-1", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("text-base font-bold", isDark ? "text-white" : "text-[#111827]")}>{title}</p>
      <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>Coming Soon</p>
    </div>
  );
}

function SettingsInput({ label, readOnly, isDark = true, ...props }) {
  return (
    <label className="block">
      <span className={cn("mb-2 block text-xs font-bold uppercase tracking-[0.08em]", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>{label}</span>
      <input
        {...props}
        readOnly={readOnly}
        className={cn(
          "min-h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none transition-colors focus:border-[#4C8DFF]",
          isDark
            ? "border-white/[0.08] bg-[#151515] text-white placeholder:text-[#6F6F6F]"
            : "border-[#CBD5E1] bg-[#F8FAFC] text-[#111827] placeholder:text-[#94A3B8]",
          readOnly && (isDark ? "cursor-default bg-white/[0.05] text-[#CFCFCF] focus:border-white/[0.08]" : "cursor-default bg-[#EEF2F7] text-[#475569] focus:border-[#CBD5E1]"),
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
        "flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#193B68] px-4 text-sm font-extrabold text-white transition-colors active:bg-[#142f54] disabled:cursor-not-allowed disabled:opacity-55",
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
  const [pane, setPane] = useState(initialPane === "settings" ? "main" : initialPane);
  const [user, setUser] = useState(() => readStoredUser());
  const [saving, setSaving] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
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
  const accent = ACCENT_COLORS.find((color) => color.value.toLowerCase() === String(prefs.appColor || prefs.accentColor || "#193B68").toLowerCase()) || ACCENT_COLORS[0];
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

  const openChild = (nextPane) => setPane(nextPane);
  const backToMain = () => setPane("main");
  const Row = (props) => <SettingRow isDark={isDark} {...props} />;
  const Card = (props) => <SettingsCard isDark={isDark} {...props} />;
  const Title = (props) => <SectionTitle isDark={isDark} {...props} />;
  const Input = (props) => <SettingsInput isDark={isDark} {...props} />;

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
          className={cn("absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#193B68] text-white shadow-lg ring-4", isDark ? "ring-[#1c1c1c]" : "ring-[#FAFBFC]")}
          aria-label="Edit profile picture"
        >
          {saving === "avatar" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className={cn("mt-4 max-w-full truncate text-xl font-extrabold", isDark ? "text-white" : "text-[#111827]")}>{user?.name || "BlueMind User"}</p>
      <p className={cn("mt-1 max-w-full truncate text-sm font-medium", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>{user?.email || ""}</p>
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
          <Title>Theme</Title>
          <Card>
            <Row icon={Moon} title="Appearance" value={appearanceText} onClick={() => openChild("appearance")} />
            <Row icon={Palette} title="Accent color" value={accent.label} onClick={() => openChild("accent-color")}>
              <span className={cn("mt-1 inline-flex items-center gap-2 text-xs font-medium", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent.value }} />
                BlueMind accent
              </span>
            </Row>
            <Row icon={Palette} title="Message Color" value={(MESSAGE_COLORS.find((color) => color.value.toLowerCase() === String(prefs.chatColor || "#193B68").toLowerCase()) || MESSAGE_COLORS[0]).label} onClick={() => openChild("message-color")} />
          </Card>
        </section>

        <section>
          <Title>App settings</Title>
          <Card>
            <Row icon={Settings} title="General" onClick={() => openChild("general")} />
            <Row icon={Bell} title="Notifications" onClick={() => openChild("notifications")} />
            <Row icon={Volume2} title="Voice" onClick={() => openChild("voice")} />
            <Row icon={Lock} title="Safety and security" onClick={() => openChild("safety-security")} />
            <Row icon={ShieldCheck} title="Data controls" onClick={() => openChild("data-controls")} />
            <Row icon={HardDrive} title="Storage" onClick={() => openChild("storage")} />
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
          className={cn("flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[26px] text-[15px] font-bold text-red-500 ring-1 active:bg-red-500/10", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}
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
        <form onSubmit={handleConfirmEmailChange} className={cn("space-y-4 rounded-[24px] p-4 ring-1", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
          <p className={cn("text-sm font-semibold leading-6", isDark ? "text-[#CFCFCF]" : "text-[#475569]")}>
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
        className="text-sm font-bold text-[#7FB2FF]"
        data-testid="settings-email-recovery-link"
      >
        Forgot access to email?
      </button>
    </div>
  );

  const renderEmailRecovery = () => (
    <div className={cn("rounded-[26px] p-5 ring-1", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("text-base font-extrabold", isDark ? "text-white" : "text-[#111827]")}>Email recovery</p>
      <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>
        BlueMind does not currently expose an automated backend email-access recovery endpoint. If you are signed in and know your password, use Change Email. Otherwise, use the password recovery flow below to recover account access through your registered email.
      </p>
      <button
        type="button"
        onClick={() => openChild("forgot-password")}
        className="mt-4 min-h-12 w-full rounded-2xl bg-[#193B68] px-4 text-sm font-extrabold text-white active:bg-[#142f54]"
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
        className="text-sm font-bold text-[#7FB2FF]"
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
        <div className={cn("rounded-[24px] p-4 text-sm font-semibold leading-6 ring-1", isDark ? "bg-[#262626] text-[#CFCFCF] ring-white/[0.06]" : "bg-white text-[#475569] ring-black/[0.06]")}>
          If this email belongs to a BlueMind account, a recovery email has been sent.
        </div>
      )}
    </div>
  );

  const renderSubscription = () => (
    <div className={cn("rounded-[26px] p-5 ring-1", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}>
      <p className={cn("text-sm font-bold uppercase tracking-[0.08em]", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>Current Plan</p>
      <p className={cn("mt-2 text-2xl font-extrabold", isDark ? "text-white" : "text-[#111827]")}>{plan}</p>
      <p className={cn("mt-3 text-sm font-medium leading-6", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>
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
          className={cn("flex min-h-[60px] w-full items-center gap-3 rounded-[22px] px-4 text-left ring-1", isDark ? "bg-[#262626] text-white ring-white/[0.06]" : "bg-white text-[#111827] ring-black/[0.06]")}
        >
          <Moon className={cn("h-5 w-5", isDark ? "text-[#D8D8D8]" : "text-[#475569]")} />
          <span className="flex-1 text-[15px] font-semibold capitalize">{theme}</span>
          {prefs.theme === theme && <Check className="h-5 w-5 text-[#7FB2FF]" />}
        </button>
      ))}
    </div>
  );

  const renderAccentColor = () => (
    <div className="grid grid-cols-2 gap-3">
      {ACCENT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => savePreference({ appColor: color.value, accentColor: color.value })}
          className={cn("flex min-h-[76px] items-center gap-3 rounded-[24px] px-4 text-left ring-1", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}
        >
          <span className="h-7 w-7 rounded-full" style={{ backgroundColor: color.value }} />
          <span className={cn("flex-1 text-sm font-bold", isDark ? "text-white" : "text-[#111827]")}>{color.label}</span>
          {accent.value === color.value && <Check className="h-5 w-5 text-[#7FB2FF]" />}
        </button>
      ))}
    </div>
  );

  const renderMessageColor = () => {
    const activeMessageColor = prefs.chatColor || "#193B68";

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MESSAGE_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => savePreference({ chatColor: color.value })}
            className={cn("flex min-h-[74px] items-center gap-3 rounded-[24px] px-4 text-left ring-1", isDark ? "bg-[#262626] ring-white/[0.06]" : "bg-white ring-black/[0.06]")}
            data-testid={`message-color-${color.label.toLowerCase()}`}
          >
            <span className="h-7 w-7 rounded-full shadow-sm ring-1 ring-black/10" style={{ backgroundColor: color.value }} />
            <span className={cn("min-w-0 flex-1 truncate text-sm font-bold", isDark ? "text-white" : "text-[#111827]")}>{color.label}</span>
            {activeMessageColor.toLowerCase() === color.value.toLowerCase() && <Check className="h-5 w-5 shrink-0 text-[#7FB2FF]" />}
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
    appearance: "Appearance",
    "accent-color": "Accent color",
    "message-color": "Message Color",
    general: "General",
    notifications: "Notifications",
    voice: "Voice",
    "safety-security": "Safety and security",
    "data-controls": "Data controls",
    storage: "Storage",
    "report-issue": "Report app issue",
    "help-center": "Help Center",
    about: "About",
    account: "Account",
    profile: "Profile",
  };

  const renderChild = () => {
    if (pane === "change-email") return renderChangeEmail();
    if (pane === "email-recovery") return renderEmailRecovery();
    if (pane === "change-password") return renderChangePassword();
    if (pane === "forgot-password") return renderForgotPassword();
    if (pane === "subscription") return renderSubscription();
    if (pane === "appearance") return renderAppearance();
    if (pane === "accent-color") return renderAccentColor();
    if (pane === "message-color") return renderMessageColor();
    if (pane === "notifications") {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(mobile ? "/mobile/settings/notifications" : "/settings/notifications")}
            className={cn("flex min-h-[64px] w-full items-center gap-3 rounded-[24px] px-4 text-left ring-1", isDark ? "bg-[#262626] text-white ring-white/[0.06]" : "bg-white text-[#111827] ring-black/[0.06]")}
          >
            <Bell className={cn("h-5 w-5", isDark ? "text-[#D8D8D8]" : "text-[#475569]")} />
            <span className="flex-1">
              <span className="block text-[15px] font-bold">Open notification controls</span>
              <span className={cn("mt-1 block text-xs font-medium", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>Uses the connected notification preferences.</span>
            </span>
            <ChevronRight className={cn("h-4 w-4", isDark ? "text-[#8C8C8C]" : "text-[#94A3B8]")} />
          </button>
        </div>
      );
    }

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
        isDark ? "bg-[#1c1c1c] text-white" : "bg-[#FAFBFC] text-[#111827]",
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
          <button type="button" onClick={backToMain} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "text-white active:bg-white/[0.08]" : "text-[#111827] active:bg-[#EEF2F7]")} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base font-extrabold">{pane === "main" ? "Settings" : childTitles[pane] || "Settings"}</h2>
        <button type="button" onClick={close} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "text-white active:bg-white/[0.08]" : "text-[#111827] active:bg-[#EEF2F7]")} aria-label="Close settings">
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
              className={cn("w-full rounded-[28px] p-5 ring-1", isDark ? "bg-[#262626] ring-white/[0.08]" : "bg-white ring-black/[0.08]")}
            >
              <p className={cn("text-lg font-extrabold", isDark ? "text-white" : "text-[#111827]")}>Log out?</p>
              <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[#A6A6A6]" : "text-[#64748B]")}>You will need to sign in again to use BlueMind AI.</p>
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
    </motion.div>
  );

  if (!open) return null;

  if (!overlay) {
    return <div className={cn("flex min-h-[100dvh] items-end justify-center p-0 md:items-center md:p-6", isDark ? "bg-[#101010]" : "bg-[#FAFBFC]")}>{sheetContent}</div>;
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
