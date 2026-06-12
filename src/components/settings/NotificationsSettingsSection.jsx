import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  Image,
  Mail,
  Megaphone,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Target,
  ToggleLeft,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import {
  getNotificationStatus,
  inspectNotificationSetup,
  sendTestNotification,
  setupReminderNotifications,
} from "@/services/notificationService";
import { getProfile, updatePreferences } from "@/services/profileService";
import { readStoredUser } from "@/services/storageKeys";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  ai: {
    taskCompleted: false,
    researchCompleted: false,
    imageGenerationCompleted: false,
    longRunningTaskCompleted: false,
    recommendations: false,
  },
  reminders: {
    alerts: true,
    daily: false,
    weekly: false,
    missed: false,
    overdue: false,
  },
  studyPlan: {
    sessionReminders: false,
    dailyGoals: false,
    weeklyProgress: false,
    missedSessions: false,
    streakAlerts: false,
  },
  calendar: {
    upcomingEvents: false,
    eventStartingSoon: false,
    eventReminders: false,
    calendarChanges: false,
  },
  email: {
    importantAccountEmails: false,
    securityEmails: false,
    notificationSummaries: false,
    marketingEmails: false,
  },
  security: {
    newLoginDetected: false,
    passwordChanged: false,
    emailChanged: false,
    securityAlerts: false,
    accountActivityAlerts: false,
  },
  projects: {
    updates: false,
    sharedActivity: false,
    deadlines: false,
    reminders: false,
  },
  system: {
    newFeatures: false,
    appUpdates: false,
    maintenanceAnnouncements: false,
    serviceAlerts: false,
  },
  channels: {
    push: true,
    email: false,
    inApp: false,
  },
};

const NOTIFICATION_CATEGORIES = [
  {
    id: "ai",
    title: "AI Notifications",
    icon: Sparkles,
    description: "Updates for AI work and recommendations.",
    items: [
      ["taskCompleted", "AI task completed", "Notify when a background AI task completes."],
      ["researchCompleted", "Research completed", "Notify when research jobs finish."],
      ["imageGenerationCompleted", "Image generation completed", "Notify when generated images are ready."],
      ["longRunningTaskCompleted", "Long-running AI task completed", "Notify for longer AI workflows."],
      ["recommendations", "AI recommendations", "Notify about useful AI suggestions."],
    ],
  },
  {
    id: "reminders",
    title: "Reminder Notifications",
    icon: Bell,
    description: "Real reminders and scheduled alerts.",
    items: [
      ["alerts", "Reminder alerts", "Deliver scheduled reminder push notifications.", true],
      ["daily", "Daily reminders", "Daily summary reminders."],
      ["weekly", "Weekly reminders", "Weekly reminder digest."],
      ["missed", "Missed reminders", "Notify when a reminder is missed."],
      ["overdue", "Overdue reminders", "Notify about overdue reminders."],
    ],
  },
  {
    id: "studyPlan",
    title: "Study Plan Notifications",
    icon: Target,
    description: "Learning goals and study progress alerts.",
    items: [
      ["sessionReminders", "Study session reminders", "Notify before planned study sessions."],
      ["dailyGoals", "Daily learning goals", "Notify about daily learning targets."],
      ["weeklyProgress", "Weekly learning progress", "Notify with weekly progress."],
      ["missedSessions", "Missed study sessions", "Notify when sessions are missed."],
      ["streakAlerts", "Learning streak alerts", "Notify about learning streaks."],
    ],
  },
  {
    id: "calendar",
    title: "Calendar Notifications",
    icon: CalendarDays,
    description: "Calendar events and schedule changes.",
    items: [
      ["upcomingEvents", "Upcoming events", "Notify about upcoming events."],
      ["eventStartingSoon", "Event starting soon", "Notify before an event starts."],
      ["eventReminders", "Event reminders", "Scheduled event reminders."],
      ["calendarChanges", "Calendar changes", "Notify when calendar items change."],
    ],
  },
  {
    id: "email",
    title: "Email Notifications",
    icon: Mail,
    description: "Email delivery preferences.",
    items: [
      ["importantAccountEmails", "Important account emails", "Critical account email notifications."],
      ["securityEmails", "Security emails", "Email security alerts."],
      ["notificationSummaries", "Notification summaries", "Email notification summaries."],
      ["marketingEmails", "Marketing emails", "Optional marketing emails."],
    ],
  },
  {
    id: "security",
    title: "Account & Security Notifications",
    icon: ShieldCheck,
    description: "Account activity and security alerts.",
    items: [
      ["newLoginDetected", "New login detected", "Notify when a new login happens."],
      ["passwordChanged", "Password changed", "Notify after password changes."],
      ["emailChanged", "Email changed", "Notify after email changes."],
      ["securityAlerts", "Security alerts", "High-priority security notifications."],
      ["accountActivityAlerts", "Account activity alerts", "Important account activity notifications."],
    ],
  },
  {
    id: "projects",
    title: "Project Notifications",
    icon: Image,
    description: "Project updates and shared activity.",
    items: [
      ["updates", "Project updates", "Notify about project changes."],
      ["sharedActivity", "Shared project activity", "Notify about shared activity."],
      ["deadlines", "Deadlines", "Notify before project deadlines."],
      ["reminders", "Project reminders", "Project-specific reminder alerts."],
    ],
  },
  {
    id: "system",
    title: "System Notifications",
    icon: Megaphone,
    description: "App updates, service alerts, and announcements.",
    items: [
      ["newFeatures", "New features", "Notify about new BlueMind features."],
      ["appUpdates", "App updates", "Notify about app releases."],
      ["maintenanceAnnouncements", "Maintenance announcements", "Notify about maintenance windows."],
      ["serviceAlerts", "Service alerts", "Notify about service issues."],
    ],
  },
  {
    id: "channels",
    title: "Notification Channels",
    icon: MonitorSmartphone,
    description: "Control where notifications are delivered.",
    items: [
      ["push", "Push Notifications", "Browser and PWA push notifications.", true],
      ["email", "Email Notifications", "Email delivery channel."],
      ["inApp", "In-App Notifications", "In-app notification center."],
    ],
  },
];

function mergeNotificationPreferences(preferences = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([section, defaults]) => ([
    section,
    {
      ...defaults,
      ...((preferences && typeof preferences[section] === "object") ? preferences[section] : {}),
    },
  ])));
}

function CategoryBadge({ supported, isDark }) {
  if (supported) {
    return <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-extrabold text-emerald-500">Connected</span>;
  }

  return (
    <span className={cn(
      "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
      isDark ? "bg-white/[0.08] text-[var(--bm-text-secondary)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]",
    )}>
      Coming Soon
    </span>
  );
}

function SwitchControl({ checked, disabled, onChange, isDark }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-transparent bg-[var(--bm-primary)]" : isDark ? "border-white/[0.10] bg-white/[0.08]" : "border-[var(--bm-border-strong)] bg-[var(--bm-active-bg)]",
      )}
    >
      <span className={cn(
        "absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
        checked ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

export default function NotificationsSettingsSection({ mobile = false, isDark = false, categoryId }) {
  const navigate = useNavigate();
  const { prefs, setPrefs } = useApp();
  const basePath = mobile ? "/mobile/settings" : "/settings";
  const [user, setUser] = useState(() => readStoredUser());
  const [preferences, setPreferences] = useState(() => mergeNotificationPreferences(
    readStoredUser()?.preferences?.notificationPreferences || prefs.notificationPreferences,
  ));
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => prefs.notificationsEnabled !== false);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState("");

  const selectedCategory = useMemo(
    () => NOTIFICATION_CATEGORIES.find((category) => category.id === categoryId),
    [categoryId],
  );

  const loadState = useCallback(async () => {
    try {
      const [profile, status, setup] = await Promise.all([
        getProfile(),
        getNotificationStatus().catch(() => null),
        inspectNotificationSetup().catch(() => null),
      ]);

      if (profile) {
        setUser(profile);
        setNotificationsEnabled(profile.preferences?.notificationsEnabled !== false);
        setPreferences(mergeNotificationPreferences(profile.preferences?.notificationPreferences));
      }

      setRuntimeStatus(status);
      setDiagnostics(setup);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load notification settings."));
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const saveNotificationPreferences = async (nextPreferences, nextEnabled = notificationsEnabled) => {
    const previousPreferences = preferences;
    const previousEnabled = notificationsEnabled;
    setPreferences(nextPreferences);
    setNotificationsEnabled(nextEnabled);
    setLoading("save");

    try {
      const result = await updatePreferences({
        notificationsEnabled: nextEnabled,
        notificationPreferences: nextPreferences,
      });

      if (result?.preferences) {
        setPrefs(result.preferences);
      }

      if (result?.user) {
        setUser(result.user);
      }

      toast.success("Notification settings saved");
    } catch (error) {
      setPreferences(previousPreferences);
      setNotificationsEnabled(previousEnabled);
      toast.error(getApiErrorMessage(error, "Could not save notification settings."));
    } finally {
      setLoading("");
    }
  };

  const handleToggle = async (section, key, checked) => {
    const nextPreferences = {
      ...preferences,
      [section]: {
        ...preferences[section],
        [key]: checked,
      },
    };
    const nextEnabled = section === "channels" && key === "push" ? checked : notificationsEnabled;

    await saveNotificationPreferences(nextPreferences, nextEnabled);
  };

  const handleEnablePush = async () => {
    setLoading("push");

    try {
      const result = await setupReminderNotifications();
      setDiagnostics(result?.diagnostics ? { ...result.diagnostics, permission: result.permission, subscriptionExists: Boolean(result.device) } : result);

      if (result?.ready && (result.webPush || result.fcm || result.device)) {
        const nextPreferences = {
          ...preferences,
          channels: {
            ...preferences.channels,
            push: true,
          },
        };
        await saveNotificationPreferences(nextPreferences, true);
        toast.success("Push notifications enabled");
      } else {
        toast.error(result?.reason || "Push notifications are not ready.");
      }
    } catch (error) {
      toast.error(error.message || "Could not enable push notifications.");
    } finally {
      setLoading("");
      loadState();
    }
  };

  const handleSendTest = async () => {
    setLoading("test");

    try {
      const result = await sendTestNotification({
        title: "BlueMind AI",
        body: "Your notification settings are connected.",
        url: mobile ? "/mobile/settings/notifications/channels" : "/settings/notifications/channels",
      });

      if (result?.delivered) {
        toast.success("Test notification sent");
      } else {
        toast.error(result?.error || "No active notification device found.");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send test notification."));
    } finally {
      setLoading("");
    }
  };

  const pageWidth = mobile ? "max-w-[430px]" : "max-w-2xl";
  const panelClass = isDark ? "border-white/[0.08] bg-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)] bg-white";
  const muted = isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]";

  if (selectedCategory) {
    const Icon = selectedCategory.icon;

    return (
      <section className={cn("mx-auto w-full space-y-4", pageWidth)} data-testid={`notification-category-${selectedCategory.id}`}>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/notifications`)}
          className={cn("mb-1 inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}
        >
          <ArrowLeft className="h-4 w-4" />
          Notifications
        </button>

        <div className={cn("rounded-[22px] border p-4 shadow-sm", panelClass)}>
          <div className="mb-4 flex items-center gap-3">
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.07]" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]")}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold">{selectedCategory.title}</h2>
              <p className={cn("mt-1 text-sm font-semibold leading-5", muted)}>{selectedCategory.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            {selectedCategory.items.map(([key, label, description, supported]) => {
              const checked = Boolean(preferences[selectedCategory.id]?.[key]);
              const disabled = !supported || loading === "save";

              return (
                <div key={key} className={cn("flex items-center gap-3 rounded-[18px] border p-3", isDark ? "border-white/[0.08] bg-white/[0.04]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold">{label}</p>
                      <CategoryBadge supported={Boolean(supported)} isDark={isDark} />
                    </div>
                    <p className={cn("mt-1 text-xs font-semibold leading-5", muted)}>{description}</p>
                  </div>
                  <SwitchControl
                    checked={checked && notificationsEnabled}
                    disabled={disabled}
                    isDark={isDark}
                    onChange={(next) => handleToggle(selectedCategory.id, key, next)}
                  />
                </div>
              );
            })}
          </div>

          {selectedCategory.id === "channels" && (
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={loading === "push"}
                className="min-h-12 rounded-2xl bg-[var(--bm-primary)] px-4 text-sm font-extrabold text-white disabled:opacity-50"
                data-testid="enable-push-notifications"
              >
                {loading === "push" ? "Checking..." : "Enable Push Notifications"}
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={loading === "test" || !preferences.channels.push || !notificationsEnabled}
                className={cn("min-h-12 rounded-2xl border px-4 text-sm font-extrabold disabled:opacity-50", isDark ? "border-white/[0.10] text-white" : "border-[var(--bm-border)] text-[var(--bm-text-primary)]")}
                data-testid="send-test-notification"
              >
                {loading === "test" ? "Sending..." : "Send Test Notification"}
              </button>
            </div>
          )}
        </div>

        {selectedCategory.id === "channels" && (
          <div className={cn("rounded-[22px] border p-4 text-sm font-semibold shadow-sm", panelClass)}>
            <p className="font-extrabold">Diagnostics</p>
            <pre className={cn("mt-3 max-h-72 overflow-auto rounded-2xl p-3 text-xs leading-5", isDark ? "bg-black/25 text-[var(--bm-border)]" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]")}>
              {JSON.stringify({
                permission: diagnostics?.permission,
                serviceWorkerRegistered: diagnostics?.serviceWorkerRegistered,
                pushSupported: diagnostics?.pushSupported,
                subscriptionExists: diagnostics?.subscriptionExists,
                webPushConfigured: runtimeStatus?.webPush?.configured,
                schedulerEnabled: runtimeStatus?.scheduler?.enabled,
              }, null, 2)}
            </pre>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={cn("mx-auto w-full space-y-4", pageWidth)} data-testid="notifications-settings-section">
      <div className={cn("rounded-[22px] border p-4 shadow-sm", panelClass)}>
        <div className="flex items-center gap-3">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.07]" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]")}>
            <ToggleLeft className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold">All Notifications</p>
            <p className={cn("mt-1 text-sm font-semibold leading-5", muted)}>Master switch for real connected notifications.</p>
          </div>
          <SwitchControl
            checked={notificationsEnabled}
            disabled={loading === "save"}
            isDark={isDark}
            onChange={(next) => saveNotificationPreferences(preferences, next)}
          />
        </div>
      </div>

      <div className="space-y-2">
        {NOTIFICATION_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const connectedCount = category.items.filter((item) => item[3]).length;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => navigate(`${basePath}/notifications/${category.id}`)}
              className={cn("flex w-full items-center gap-3 rounded-[22px] border p-3 text-left shadow-sm transition-colors", panelClass, isDark ? "hover:bg-[#292929]" : "hover:bg-[var(--bm-bg-elevated)]")}
              data-testid={`notification-category-link-${category.id}`}
            >
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.07] text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold">{category.title}</span>
                <span className={cn("mt-0.5 block text-xs font-semibold leading-5", muted)}>{category.description}</span>
              </span>
              {connectedCount > 0 && <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[11px] font-extrabold text-emerald-500">{connectedCount} live</span>}
              <ChevronRight className={cn("h-5 w-5 shrink-0", muted)} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
