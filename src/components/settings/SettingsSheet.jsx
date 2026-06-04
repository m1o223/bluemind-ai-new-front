import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Check,
  ChevronRight,
  CreditCard,
  Flag,
  HardDrive,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mail,
  Moon,
  Palette,
  Pencil,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import { logoutUser } from "@/services/authService";
import { getProfile, updatePreferences, updateProfile } from "@/services/profileService";
import { readStoredUser } from "@/services/storageKeys";

const AVATAR_COLORS = ["#193B68", "#2563EB", "#059669", "#EA580C", "#DC2626", "#7C3AED", "#0891B2", "#BE123C"];
const ACCENT_COLORS = [
  { label: "Blue", value: "#193B68" },
  { label: "Teal", value: "#00C4B8" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Rose", value: "#E11D48" },
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

function SettingRow({ icon: Icon, title, value, accent, danger, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        "flex min-h-[68px] w-full items-center gap-3 border-b border-white/[0.07] px-4 text-left last:border-b-0",
        onClick && "active:bg-white/[0.06]",
        disabled && "opacity-55",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", danger ? "text-red-400" : accent ? "text-[#4C8DFF]" : "text-[#D8D8D8]")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-semibold", danger ? "text-red-400" : accent ? "text-[#7FB2FF]" : "text-white")}>
          {title}
        </span>
        {children}
      </span>
      {value && <span className="max-w-[42%] truncate text-sm font-medium text-[#9CA3AF]">{value}</span>}
      {onClick && !disabled && <ChevronRight className="h-4 w-4 shrink-0 text-[#8C8C8C]" />}
    </button>
  );
}

function SettingsCard({ children }) {
  return (
    <div className="overflow-hidden rounded-[26px] bg-[#262626] shadow-sm ring-1 ring-white/[0.06]">
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-[#A6A6A6]">{children}</h3>;
}

function ComingSoonPanel({ title }) {
  return (
    <div className="rounded-[26px] bg-[#262626] p-5 text-center ring-1 ring-white/[0.06]">
      <p className="text-base font-bold text-white">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#A6A6A6]">Coming Soon</p>
    </div>
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
  const { prefs, setPrefs } = useApp();
  const fileInputRef = useRef(null);
  const [pane, setPane] = useState(initialPane === "settings" ? "main" : initialPane);
  const [user, setUser] = useState(() => readStoredUser());
  const [saving, setSaving] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

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
  const plan = user?.authProvider === "guest" ? "Guest" : "Free";

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

  const openChild = (nextPane) => setPane(nextPane);
  const backToMain = () => setPane("main");

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
          className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#193B68] text-white shadow-lg ring-4 ring-[#1c1c1c]"
          aria-label="Edit profile picture"
        >
          {saving === "avatar" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="mt-4 max-w-full truncate text-xl font-extrabold text-white">{user?.name || "BlueMind User"}</p>
      <p className="mt-1 max-w-full truncate text-sm font-medium text-[#A6A6A6]">{user?.email || ""}</p>
    </div>
  );

  const renderMain = () => (
    <>
      {renderProfileHeader()}

      <div className="space-y-6">
        <section>
          <SectionTitle>Account</SectionTitle>
          <SettingsCard>
            <SettingRow icon={Mail} title="Email" value={user?.email || "Unavailable"} />
            <SettingRow icon={Briefcase} title="Workspace" value="Personal account" onClick={() => openChild("workspace")} />
            <SettingRow icon={CreditCard} title="Subscription" value={plan} onClick={() => openChild("subscription")} />
            <SettingRow icon={RefreshCcw} title="Restore purchases" onClick={() => openChild("restore-purchases")} />
            <SettingRow icon={Sparkles} title="Upgrade" accent onClick={() => openChild("upgrade")} />
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Theme</SectionTitle>
          <SettingsCard>
            <SettingRow icon={Moon} title="Appearance" value={appearanceText} onClick={() => openChild("appearance")} />
            <SettingRow icon={Palette} title="Accent color" value={accent.label} onClick={() => openChild("accent-color")}>
              <span className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-[#A6A6A6]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent.value }} />
                BlueMind accent
              </span>
            </SettingRow>
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>App settings</SectionTitle>
          <SettingsCard>
            <SettingRow icon={Settings} title="General" onClick={() => openChild("general")} />
            <SettingRow icon={Bell} title="Notifications" onClick={() => openChild("notifications")} />
            <SettingRow icon={Volume2} title="Voice" onClick={() => openChild("voice")} />
            <SettingRow icon={Lock} title="Safety and security" onClick={() => openChild("safety-security")} />
            <SettingRow icon={ShieldCheck} title="Data controls" onClick={() => openChild("data-controls")} />
            <SettingRow icon={HardDrive} title="Storage" onClick={() => openChild("storage")} />
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Get help</SectionTitle>
          <SettingsCard>
            <SettingRow icon={Flag} title="Report app issue" onClick={() => openChild("report-issue")} />
            <SettingRow icon={HelpCircle} title="Help Center" onClick={() => openChild("help-center")} />
            <SettingRow icon={Info} title="About" onClick={() => openChild("about")} />
          </SettingsCard>
        </section>

        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[26px] bg-[#262626] text-[15px] font-bold text-red-400 ring-1 ring-white/[0.06] active:bg-red-500/10"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </>
  );

  const renderAppearance = () => (
    <div className="space-y-3">
      {["system", "dark", "light"].map((theme) => (
        <button
          key={theme}
          type="button"
          onClick={() => savePreference({ theme })}
          className="flex min-h-[60px] w-full items-center gap-3 rounded-[22px] bg-[#262626] px-4 text-left text-white ring-1 ring-white/[0.06]"
        >
          <Moon className="h-5 w-5 text-[#D8D8D8]" />
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
          className="flex min-h-[76px] items-center gap-3 rounded-[24px] bg-[#262626] px-4 text-left ring-1 ring-white/[0.06]"
        >
          <span className="h-7 w-7 rounded-full" style={{ backgroundColor: color.value }} />
          <span className="flex-1 text-sm font-bold text-white">{color.label}</span>
          {accent.value === color.value && <Check className="h-5 w-5 text-[#7FB2FF]" />}
        </button>
      ))}
    </div>
  );

  const childTitles = {
    workspace: "Workspace",
    subscription: "Subscription",
    "restore-purchases": "Restore purchases",
    upgrade: "Upgrade",
    appearance: "Appearance",
    "accent-color": "Accent color",
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
    if (pane === "appearance") return renderAppearance();
    if (pane === "accent-color") return renderAccentColor();
    if (pane === "notifications") {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(mobile ? "/mobile/settings/notifications" : "/settings/notifications")}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-[24px] bg-[#262626] px-4 text-left text-white ring-1 ring-white/[0.06]"
          >
            <Bell className="h-5 w-5 text-[#D8D8D8]" />
            <span className="flex-1">
              <span className="block text-[15px] font-bold">Open notification controls</span>
              <span className="mt-1 block text-xs font-medium text-[#A6A6A6]">Uses the connected notification preferences.</span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#8C8C8C]" />
          </button>
        </div>
      );
    }

    return <ComingSoonPanel title={childTitles[pane] || "Settings"} />;
  };

  const sheetContent = (
    <motion.div
      initial={{ y: "100%", opacity: 0.96 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex w-full flex-col overflow-hidden bg-[#1c1c1c] text-white shadow-[0_-28px_90px_rgba(0,0,0,0.45)]",
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
          <button type="button" onClick={backToMain} className="flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base font-extrabold">{pane === "main" ? "Settings" : childTitles[pane] || "Settings"}</h2>
        <button type="button" onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" aria-label="Close settings">
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
              className="w-full rounded-[28px] bg-[#262626] p-5 ring-1 ring-white/[0.08]"
            >
              <p className="text-lg font-extrabold text-white">Log out?</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#A6A6A6]">You will need to sign in again to use BlueMind AI.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setLogoutConfirmOpen(false)} className="min-h-12 rounded-2xl bg-white/[0.08] text-sm font-bold text-white">
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
    return <div className="flex min-h-[100dvh] items-end justify-center bg-[#101010] p-0 md:items-center md:p-6">{sheetContent}</div>;
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
