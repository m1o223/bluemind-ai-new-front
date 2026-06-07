import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Cloud,
  CreditCard,
  Database,
  Download,
  FileText,
  Globe2,
  HardDrive,
  KeyRound,
  Lock,
  Mail,
  MonitorSmartphone,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import {
  changePassword,
  confirmEmailChange,
  requestEmailChange,
} from "@/services/authService";
import { listConversations } from "@/services/chatService";
import { listImageHistory } from "@/services/imageService";
import { getProfile, updatePreferences } from "@/services/profileService";
import { readStoredRefreshSession, readStoredUser } from "@/services/storageKeys";

function formatDate(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getBrowserDeviceLabel() {
  if (typeof navigator === "undefined") return "Current browser";

  const ua = navigator.userAgent || "";
  const browser = ua.includes("Edg/")
    ? "Microsoft Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Safari/")
        ? "Safari"
        : ua.includes("Firefox/")
          ? "Firefox"
          : "Browser";
  const device = /iPhone|iPad|Android|Mobile/i.test(ua) ? "Mobile" : "Desktop";

  return `${device} ${browser}`;
}

function ComingSoonBadge({ isDark }) {
  return (
    <span className={cn(
      "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
      isDark ? "bg-white/[0.08] text-[#CFCFCF]" : "bg-[#EEF2F7] text-[#64748B]",
    )}>
      Coming Soon
    </span>
  );
}

function Section({ title, icon: Icon, children, danger = false, isDark }) {
  return (
    <section className={cn(
      "rounded-[22px] border p-4 shadow-sm",
      danger
        ? isDark ? "border-red-500/30 bg-red-500/10" : "border-red-200 bg-red-50/70"
        : isDark ? "border-white/[0.08] bg-[#252525]" : "border-[#E5E7EB] bg-white",
    )}>
      <div className="mb-4 flex items-center gap-3">
        <span className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
          danger
            ? "bg-red-500/12 text-red-500"
            : isDark ? "bg-white/[0.07] text-white" : "bg-[#EEF2FF] text-[#193B68]",
        )}>
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-base font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value, icon: Icon, isDark, action, children }) {
  return (
    <div className={cn("flex items-center gap-3 border-t py-3 first:border-t-0", isDark ? "border-white/[0.08]" : "border-[#E5E7EB]")}>
      {Icon && <Icon className={cn("h-4 w-4 shrink-0", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")} />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{label}</p>
        {value && <p className={cn("mt-1 truncate text-sm font-semibold", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{value}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

function TextInput({ isDark, ...props }) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none transition-colors",
        isDark
          ? "border-white/[0.10] bg-[#1a1a1a] text-white placeholder:text-[#777] focus:border-white/30"
          : "border-[#CBD5E1] bg-[#F8FAFC] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#193B68]",
        props.className,
      )}
    />
  );
}

function ActionButton({ children, isDark, danger = false, primary = false, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "min-h-11 rounded-2xl px-4 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        primary
          ? "bg-[#193B68] text-white hover:bg-[#142f54]"
          : danger
            ? "bg-red-600 text-white hover:bg-red-700"
            : isDark ? "border border-white/[0.10] bg-white/[0.06] text-white hover:bg-white/[0.10]" : "border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC]",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

function CollapsiblePanel({ title, icon: Icon, open, onToggle, children, isDark, badge }) {
  return (
    <div className={cn("overflow-hidden rounded-[20px] border", isDark ? "border-white/[0.08]" : "border-[#E5E7EB]")}>
      <button
        type="button"
        onClick={onToggle}
        className={cn("flex min-h-14 w-full items-center gap-3 px-4 text-left transition-colors", isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#F8FAFC]")}
      >
        <Icon className={cn("h-5 w-5 shrink-0", isDark ? "text-[#CFCFCF]" : "text-[#193B68]")} />
        <span className="flex-1 text-sm font-extrabold">{title}</span>
        {badge}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className={cn("border-t p-4", isDark ? "border-white/[0.08]" : "border-[#E5E7EB]")}>{children}</div>}
    </div>
  );
}

export default function AccountSettingsSection({ mobile = false, isDark = false }) {
  const { prefs, setPrefs } = useApp();
  const [user, setUser] = useState(() => readStoredUser());
  const [openPanel, setOpenPanel] = useState("email");
  const [loading, setLoading] = useState("");
  const [stats, setStats] = useState({
    conversations: null,
    images: null,
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
  const [aiPatch, setAiPatch] = useState({
    appLanguage: prefs.appLanguage || prefs.language || "en",
    aiLanguageMode: prefs.aiLanguageMode || "auto",
  });
  const refreshSession = readStoredRefreshSession();

  const currentPlan = user?.authProvider === "guest" ? "Guest" : "Free";
  const appVersion = process.env.REACT_APP_VERSION || "0.1.0";
  const buildInfo = process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA || "Production build";
  const accountRegion = Intl.DateTimeFormat().resolvedOptions().timeZone || "Default";

  const connectedAccounts = useMemo(() => ([
    {
      label: "Google",
      state: ["google", "mixed"].includes(user?.authProvider) ? "Connected" : "Not connected",
      available: ["google", "mixed"].includes(user?.authProvider),
    },
    { label: "Microsoft", state: "Coming Soon", available: false },
  ]), [user?.authProvider]);

  const loadAccountData = useCallback(async () => {
    try {
      const profile = await getProfile();
      if (profile) setUser(profile);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load account."));
    }

    const [conversationResult, imageResult] = await Promise.allSettled([
      listConversations(),
      listImageHistory({ limit: 100 }),
    ]);

    setStats({
      conversations: conversationResult.status === "fulfilled"
        ? (conversationResult.value?.conversations || []).length
        : null,
      images: imageResult.status === "fulfilled" ? imageResult.value.length : null,
    });
  }, []);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  useEffect(() => {
    setAiPatch({
      appLanguage: prefs.appLanguage || prefs.language || "en",
      aiLanguageMode: prefs.aiLanguageMode || "auto",
    });
  }, [prefs.aiLanguageMode, prefs.appLanguage, prefs.language]);

  const togglePanel = (panel) => {
    setOpenPanel((current) => current === panel ? "" : panel);
  };

  const handleRequestEmailChange = async (event) => {
    event.preventDefault();
    setLoading("email");

    try {
      const result = await requestEmailChange(emailChange.currentPassword, emailChange.newEmail);
      setEmailChange((prev) => ({
        ...prev,
        code: "",
        pendingEmail: result.pendingEmail || prev.newEmail,
      }));
      toast.success("Verification code sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not start email change."));
    } finally {
      setLoading("");
    }
  };

  const handleConfirmEmailChange = async (event) => {
    event.preventDefault();
    setLoading("email-code");

    try {
      const result = await confirmEmailChange(emailChange.code);
      if (result?.user) setUser(result.user);
      setEmailChange({ currentPassword: "", newEmail: "", code: "", pendingEmail: "" });
      toast.success("Email updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not confirm email change."));
    } finally {
      setLoading("");
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setLoading("password");

    try {
      await changePassword(
        passwordChange.currentPassword,
        passwordChange.newPassword,
        passwordChange.confirmPassword,
      );
      setPasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated. Other sessions were revoked.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change password."));
    } finally {
      setLoading("");
    }
  };

  const handleSaveAiPreferences = async () => {
    setLoading("ai");

    try {
      const result = await updatePreferences({
        appLanguage: aiPatch.appLanguage,
        language: aiPatch.appLanguage,
        aiLanguageMode: aiPatch.aiLanguageMode,
      });

      if (result?.preferences) {
        setPrefs(result.preferences);
      }

      if (result?.user) {
        setUser(result.user);
      }

      toast.success("AI preferences saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save AI preferences."));
    } finally {
      setLoading("");
    }
  };

  const muted = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const subtlePanel = isDark ? "border-white/[0.08] bg-white/[0.04]" : "border-[#E5E7EB] bg-[#F8FAFC]";

  return (
    <section className={cn("mx-auto w-full space-y-4", mobile ? "max-w-[430px]" : "max-w-2xl")} data-testid="account-settings-section">
      <Section title="Email" icon={Mail} isDark={isDark}>
        <InfoRow
          label="Current Email"
          value={user?.email || "Unavailable"}
          icon={Mail}
          isDark={isDark}
          action={user?.emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-extrabold text-emerald-500">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-extrabold text-amber-500">Unverified</span>
          )}
        />

        <CollapsiblePanel
          title="Update Email"
          icon={Mail}
          open={openPanel === "email"}
          onToggle={() => togglePanel("email")}
          isDark={isDark}
        >
          <form onSubmit={handleRequestEmailChange} className="space-y-3">
            <TextInput
              isDark={isDark}
              type="password"
              value={emailChange.currentPassword}
              onChange={(event) => setEmailChange({ ...emailChange, currentPassword: event.target.value })}
              placeholder="Current password"
              autoComplete="current-password"
              data-testid="account-email-current-password"
            />
            <TextInput
              isDark={isDark}
              type="email"
              value={emailChange.newEmail}
              onChange={(event) => setEmailChange({ ...emailChange, newEmail: event.target.value })}
              placeholder="New email"
              autoComplete="email"
              data-testid="account-email-new"
            />
            <ActionButton
              type="submit"
              primary
              disabled={!emailChange.currentPassword || !emailChange.newEmail || loading === "email"}
              data-testid="account-email-request"
            >
              {loading === "email" ? "Sending..." : "Send Verification Code"}
            </ActionButton>
          </form>

          {emailChange.pendingEmail && (
            <form onSubmit={handleConfirmEmailChange} className={cn("mt-4 space-y-3 rounded-2xl border p-3", subtlePanel)}>
              <p className={cn("text-sm font-semibold", muted)}>Code sent to {emailChange.pendingEmail}</p>
              <TextInput
                isDark={isDark}
                value={emailChange.code}
                onChange={(event) => setEmailChange({ ...emailChange, code: event.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="Verification code"
                inputMode="numeric"
                data-testid="account-email-code"
              />
              <ActionButton
                type="submit"
                isDark={isDark}
                primary
                disabled={!/^\d{6}$/.test(emailChange.code) || loading === "email-code"}
                data-testid="account-email-confirm"
              >
                {loading === "email-code" ? "Confirming..." : "Confirm New Email"}
              </ActionButton>
            </form>
          )}
        </CollapsiblePanel>
      </Section>

      <Section title="Password" icon={KeyRound} isDark={isDark}>
        <CollapsiblePanel
          title="Change Password"
          icon={KeyRound}
          open={openPanel === "password"}
          onToggle={() => togglePanel("password")}
          isDark={isDark}
        >
          <form onSubmit={handleChangePassword} className="space-y-3">
            <TextInput
              isDark={isDark}
              type="password"
              value={passwordChange.currentPassword}
              onChange={(event) => setPasswordChange({ ...passwordChange, currentPassword: event.target.value })}
              placeholder="Current password"
              autoComplete="current-password"
              data-testid="account-password-current"
            />
            <TextInput
              isDark={isDark}
              type="password"
              value={passwordChange.newPassword}
              onChange={(event) => setPasswordChange({ ...passwordChange, newPassword: event.target.value })}
              placeholder="New password"
              autoComplete="new-password"
              data-testid="account-password-new"
            />
            <TextInput
              isDark={isDark}
              type="password"
              value={passwordChange.confirmPassword}
              onChange={(event) => setPasswordChange({ ...passwordChange, confirmPassword: event.target.value })}
              placeholder="Confirm new password"
              autoComplete="new-password"
              data-testid="account-password-confirm"
            />
            <ActionButton
              type="submit"
              primary
              disabled={!passwordChange.currentPassword || !passwordChange.newPassword || passwordChange.newPassword !== passwordChange.confirmPassword || loading === "password"}
              data-testid="account-password-save"
            >
              {loading === "password" ? "Updating..." : "Save Password"}
            </ActionButton>
          </form>
        </CollapsiblePanel>
      </Section>

      <Section title="Connected Accounts" icon={UserCheck} isDark={isDark}>
        {connectedAccounts.map((account) => (
          <InfoRow
            key={account.label}
            label={account.label}
            value={account.state}
            icon={UserCheck}
            isDark={isDark}
            action={account.available ? (
              <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-extrabold text-emerald-500">Connected</span>
            ) : (
              <ComingSoonBadge isDark={isDark} />
            )}
          />
        ))}
      </Section>

      <Section title="Security" icon={ShieldCheck} isDark={isDark}>
        {["Two Factor Authentication", "Login Alerts", "Trusted Devices", "Security Logs"].map((item) => (
          <InfoRow key={item} label={item} value="Backend support is not available yet." icon={ShieldCheck} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
        ))}
      </Section>

      <Section title="Active Sessions" icon={MonitorSmartphone} isDark={isDark}>
        <InfoRow label="Current Device" value={getBrowserDeviceLabel()} icon={MonitorSmartphone} isDark={isDark} />
        <InfoRow label="Session Marker" value={refreshSession?.expiresAt ? `Refresh expires ${formatDateTime(refreshSession.expiresAt)}` : "Stored session marker unavailable"} icon={Lock} isDark={isDark} />
        <InfoRow label="Other Devices" value="Session listing endpoint is not available yet." icon={MonitorSmartphone} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
        <InfoRow label="Sign Out Other Devices" value="Dedicated revoke endpoint is not available yet." icon={RefreshCcw} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
      </Section>

      <Section title="Subscription" icon={Sparkles} isDark={isDark}>
        <InfoRow label="Current Plan" value={currentPlan} icon={Sparkles} isDark={isDark} />
        <InfoRow label="Premium" value="Payments are not connected yet." icon={Sparkles} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
      </Section>

      <Section title="Billing" icon={CreditCard} isDark={isDark}>
        {["Payment Methods", "Invoices", "Purchase History"].map((item) => (
          <InfoRow key={item} label={item} value="Billing backend is not connected yet." icon={CreditCard} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
        ))}
      </Section>

      <Section title="Storage" icon={HardDrive} isDark={isDark}>
        <InfoRow label="Images Used" value={stats.images === null ? "Loading or unavailable" : `${stats.images} images`} icon={HardDrive} isDark={isDark} />
        <InfoRow label="Files Uploaded" value="File storage backend is not available yet." icon={FileText} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
        <InfoRow label="Storage Usage" value={stats.images === null ? "Unavailable" : `${stats.images} image assets tracked`} icon={Cloud} isDark={isDark} />
      </Section>

      <Section title="Data Management" icon={Database} isDark={isDark}>
        <InfoRow label="Conversations" value={stats.conversations === null ? "Loading or unavailable" : `${stats.conversations} conversations`} icon={Database} isDark={isDark} />
        {["Export My Data", "Download Conversations", "Download Files", "Delete All Conversations"].map((item) => (
          <InfoRow key={item} label={item} value="This bulk action endpoint is not available yet." icon={item.startsWith("Delete") ? Trash2 : Download} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
        ))}
      </Section>

      <Section title="AI Preferences" icon={Globe2} isDark={isDark}>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold">Preferred Language</span>
            <TextInput
              isDark={isDark}
              value={aiPatch.appLanguage}
              onChange={(event) => setAiPatch({ ...aiPatch, appLanguage: event.target.value.trim().toLowerCase() })}
              placeholder="en"
              data-testid="account-ai-language"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold">AI Language Mode</span>
            <select
              value={aiPatch.aiLanguageMode}
              onChange={(event) => setAiPatch({ ...aiPatch, aiLanguageMode: event.target.value })}
              className={cn(
                "min-h-12 w-full rounded-2xl border px-4 text-sm font-bold outline-none",
                isDark ? "border-white/[0.10] bg-[#1a1a1a] text-white" : "border-[#CBD5E1] bg-[#F8FAFC] text-[#111827]",
              )}
              data-testid="account-ai-language-mode"
            >
              <option value="auto">Auto</option>
              <option value="match_app">Match app language</option>
            </select>
          </label>
          <ActionButton isDark={isDark} primary onClick={handleSaveAiPreferences} disabled={loading === "ai"} data-testid="account-ai-save">
            {loading === "ai" ? "Saving..." : "Save AI Preferences"}
          </ActionButton>
        </div>
        {["Response Style", "Learning Mode", "Default AI Model"].map((item) => (
          <InfoRow key={item} label={item} value="Preference backend field is not available yet." icon={Sparkles} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
        ))}
      </Section>

      <Section title="Contact & Support" icon={CircleHelp} isDark={isDark}>
        {["Contact Support", "Report Bug", "Request Feature", "Feedback"].map((item) => (
          <InfoRow key={item} label={item} value="Support workflow will be connected in a later phase." icon={CircleHelp} isDark={isDark} action={<ComingSoonBadge isDark={isDark} />} />
        ))}
      </Section>

      <Section title="About Account" icon={CalendarDays} isDark={isDark}>
        <InfoRow label="Account ID" value={user?.id || "Unavailable"} icon={BadgeCheck} isDark={isDark} />
        <InfoRow label="Created Date" value={formatDate(user?.createdAt)} icon={CalendarDays} isDark={isDark} />
        <InfoRow label="App Version" value={appVersion} icon={FileText} isDark={isDark} />
        <InfoRow label="Region" value={accountRegion} icon={Globe2} isDark={isDark} />
        <InfoRow label="Build Information" value={buildInfo} icon={FileText} isDark={isDark} />
      </Section>

      <Section title="Danger Zone" icon={AlertTriangle} danger isDark={isDark}>
        {["Delete Account", "Delete All Conversations", "Reset BlueMind Data"].map((item) => (
          <InfoRow
            key={item}
            label={item}
            value="Requires confirmation. Backend endpoint is not available yet."
            icon={AlertTriangle}
            isDark={isDark}
            action={<ComingSoonBadge isDark={isDark} />}
          />
        ))}
      </Section>
    </section>
  );
}
