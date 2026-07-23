import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  MoreVertical,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { iconClasses, inputClasses, typeClasses } from "@/lib/interactions";
import { useApp } from "@/context/AppContext";
import {
  createReminder,
  deleteReminder,
  getReminders,
  updateReminder,
} from "@/services/reminderService";
import {
  getNotificationStatus,
  getNotificationDebugSnapshot,
  inspectNotificationSetup,
  sendTestNotification,
  setupReminderNotifications,
} from "@/services/notificationService";
import { getApiErrorMessage } from "@/services/api";

const STATUS_LABELS = {
  upcoming: "Upcoming",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

const mobileBlueGlassSurfaceClass = "border-[#2F7DF6]/[0.20] bg-[rgba(12,45,102,0.42)] text-white shadow-[inset_0_1px_0_rgba(115,170,255,0.16),0_18px_42px_rgba(5,18,45,0.28)] backdrop-blur-[28px]";
const mobileNeutralGlassSurfaceClass = "border-white/[0.075] bg-[rgba(38,38,38,0.34)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-[24px]";
const mobileGlassControlClass = "bm-mobile-glass-control";
const mobileNeutralGlassMenuClass = "border-white/[0.08] bg-[rgba(28,28,28,0.78)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-[28px]";

function reminderId(reminder) {
  return reminder?._id || reminder?.id;
}

function toInputTime(time) {
  if (!time) return "09:00";
  if (typeof time === "string") return time;

  return `${String(time.hour ?? 9).padStart(2, "0")}:${String(time.minute ?? 0).padStart(2, "0")}`;
}

function formatDate(value, language = "en") {
  if (!value) return "";

  return new Date(`${value}T00:00:00`).toLocaleDateString(language || "en", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(value, language = "en") {
  if (!value) return "";
  if (typeof value === "string") return value;

  const date = new Date(2000, 0, 1, value.hour ?? 9, value.minute ?? 0);
  return date.toLocaleTimeString(language || "en", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function notificationLabel(permission) {
  if (permission === "granted") return "Notifications Enabled";
  if (permission === "denied") return "Notifications Disabled";
  if (permission === "unsupported") return "Notifications Unsupported";
  return "Notifications Not Requested";
}

function isUnauthorizedError(error) {
  return error?.response?.status === 401;
}

function ReminderForm({ isOpen, reminder, onClose, onSave, isDark, appColor }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "09:00",
    recurrence: { frequency: "none", interval: 1 },
  });

  useEffect(() => {
    setForm({
      title: reminder?.title || "",
      description: reminder?.description || "",
      date: reminder?.reminderDate || reminder?.date || "",
      time: reminder?.reminderTime || toInputTime(reminder?.time),
      recurrence: reminder?.recurrence || { frequency: "none", interval: 1 },
    });
  }, [reminder, isOpen]);

  const isValid = form.title.trim() && form.date && form.time;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) return;

    const [hour, minute] = form.time.split(":");

    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      time: {
        hour: Number(hour),
        minute: Number(minute),
      },
      recurrence: {
        frequency: form.recurrence?.frequency || "none",
        interval: Number(form.recurrence?.interval || 1),
      },
      status: reminder?.status || "upcoming",
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/55 backdrop-blur-[14px] md:items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        className={cn(
          "relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-[34px] shadow-[0_-28px_90px_rgba(0,0,0,0.18)] md:mx-auto md:h-[86dvh] md:max-w-[560px] md:rounded-[34px]",
          isDark ? "bg-[var(--bm-bg-card)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]",
        )}
        initial={{ y: "100%", opacity: 0.96 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.96 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-5 pt-2">
          <span className="w-10" />
          <h2 className="truncate text-base font-extrabold">
            {reminder ? "Edit reminder" : "New reminder"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="bm-mobile-glass-control"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium opacity-70">Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
              placeholder="What should BlueMind remind you about?"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium opacity-70">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className={cn(inputClasses.textarea, typeClasses.body, "resize-none font-semibold")}
              placeholder="Optional note"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium opacity-70">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium opacity-70">Time</span>
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
              />
            </label>
          </div>

          <div className="grid grid-cols-[1fr_92px] gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium opacity-70">Repeat</span>
              <select
                value={form.recurrence.frequency}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  recurrence: { ...prev.recurrence, frequency: event.target.value },
                }))}
                className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium opacity-70">Every</span>
              <input
                type="number"
                min="1"
                value={form.recurrence.interval}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  recurrence: { ...prev.recurrence, interval: event.target.value },
                }))}
                className={cn(inputClasses.field, typeClasses.body, "font-semibold")}
              />
            </label>
          </div>

          <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "h-12 flex-1 rounded-2xl text-sm font-semibold",
                isDark ? "bg-white/[0.10] text-white" : "bg-black/5 text-[var(--bm-text-primary)]",
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="h-12 flex-1 rounded-2xl text-sm font-semibold text-white disabled:opacity-45"
            style={{ backgroundColor: appColor }}
          >
            Save
          </button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}

function ReminderCard({ reminder, language, isDark, appColor, highlighted, onEdit, onDelete, onToggleStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const id = reminderId(reminder);
  const isCompleted = reminder.status === "completed";
  const status = reminder.status || "upcoming";

  return (
    <motion.article
      id={`mobile-reminder-${id}`}
      data-testid={`mobile-reminder-${id}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "relative rounded-[24px] border p-4 shadow-sm transition",
        isDark ? mobileNeutralGlassSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-[22px]",
        highlighted && "ring-2",
      )}
      style={highlighted ? { "--tw-ring-color": appColor } : undefined}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleStatus(reminder)}
          className={cn(
            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border transition",
            isCompleted
              ? "border-transparent text-white"
              : isDark ? "border-white/15 text-white/70" : "border-black/10 text-[var(--bm-text-secondary)]",
          )}
          style={isCompleted ? { backgroundColor: appColor } : undefined}
          aria-label={isCompleted ? "Reopen reminder" : "Complete reminder"}
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={cn("truncate text-[15px] font-semibold", isCompleted && "line-through opacity-60")}>
                {reminder.title}
              </h3>
              {reminder.description && (
                <p className={cn("mt-1 line-clamp-2 text-sm leading-5", isDark ? "text-white/[0.58]" : "text-[var(--bm-text-secondary)]")}>
                  {reminder.description}
                </p>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className={cn(
                  mobileGlassControlClass,
                )}
                aria-label="Reminder actions"
              >
                <MoreVertical className={iconClasses.button} />
              </button>

              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close reminder menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className={cn(
                      "absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-2xl border py-1 shadow-xl",
                      isDark ? mobileNeutralGlassMenuClass : "border-black/[0.08] bg-white/85 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_16px_36px_rgba(15,23,42,0.10)] backdrop-blur-[22px]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(reminder);
                        setMenuOpen(false);
                      }}
                      className={cn("w-full px-4 py-3 text-left text-sm", isDark ? "text-white hover:bg-white/[0.08]" : "hover:bg-[#2F7DF6]/[0.08]")}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(id);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", isDark ? "bg-white/[0.08] text-white/[0.72]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(reminder.reminderDate || reminder.date, language)}
            </span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", isDark ? "bg-white/[0.08] text-white/[0.72]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(reminder.time, language)}
            </span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", isDark ? "bg-white/[0.08] text-white/[0.72]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>
              {STATUS_LABELS[status] || status}
            </span>
            {(reminder.recurrence?.frequency || "none") !== "none" && (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", isDark ? "bg-white/[0.08] text-white/[0.72]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>
                <Repeat2 className="h-3.5 w-3.5" />
                {reminder.recurrence.frequency}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function NotificationPanel({ debug, busy, isDark, appColor, onEnable, onRefresh, onTest }) {
  const permission = debug?.permission || "default";
  const isEnabled = permission === "granted" && (debug?.subscriptionExists || debug?.backendDeviceSaved);

  return (
    <section
      className={cn(
        "rounded-[24px] border p-4",
        mobileBlueGlassSurfaceClass,
      )}
      data-testid="mobile-notification-panel"
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
          style={{ backgroundColor: appColor }}
        >
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold">{notificationLabel(permission)}</h2>
          <p className={cn("mt-1 text-xs leading-5", isDark ? "text-white/[0.55]" : "text-[var(--bm-text-secondary)]")}>
            Mobile reminders use the same push subscription and scheduler as desktop.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onEnable}
          disabled={busy.enabling || isEnabled}
          className={cn(
            "h-10 rounded-2xl text-xs font-semibold disabled:opacity-45",
              isDark ? "bg-white/[0.10] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]",
          )}
        >
          {busy.enabling ? "Enabling" : "Enable"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy.refreshing}
          className={cn(
            "grid h-10 place-items-center rounded-2xl disabled:opacity-45",
              isDark ? "bg-white/[0.10] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]",
          )}
          aria-label="Refresh notification status"
        >
          {busy.refreshing ? <BlueMindLoadingDots className="text-[var(--bm-primary)]" /> : <RefreshCw className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={busy.sendingTest}
          className="grid h-10 place-items-center rounded-2xl text-white disabled:opacity-45"
          style={{ backgroundColor: appColor }}
          aria-label="Send test notification"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export default function MobileReminders() {
  const navigate = useNavigate();
  const { reminderId: routeReminderId } = useParams();
  const { resolvedTheme, prefs, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs?.appColor || prefs?.chatColor || "var(--bm-primary)";
  const language = uiLanguage || prefs?.language || "en";

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [notificationDebug, setNotificationDebug] = useState(() => getNotificationDebugSnapshot());
  const [notificationBusy, setNotificationBusy] = useState({
    enabling: false,
    refreshing: false,
    sendingTest: false,
  });

  const loadReminders = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getReminders();
      setReminders(result.items || result.reminders || []);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        navigate("/mobile", { replace: true });
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not load reminders"));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshNotificationStatus = useCallback(async () => {
    setNotificationBusy((prev) => ({ ...prev, refreshing: true }));

    try {
      const debug = await inspectNotificationSetup();
      let backendStatus = null;

      try {
        backendStatus = await getNotificationStatus();
      } catch (error) {
        if (isUnauthorizedError(error)) {
          navigate("/mobile", { replace: true });
          return;
        }
        backendStatus = { statusError: getApiErrorMessage(error, "Notification status unavailable") };
      }

      setNotificationDebug({
        ...debug,
        backendStatus,
        backendDeviceSaved: Boolean(backendStatus?.devices?.length || backendStatus?.deviceCount),
      });
    } catch (error) {
      setNotificationDebug((prev) => ({ ...prev, setupError: error.message }));
    } finally {
      setNotificationBusy((prev) => ({ ...prev, refreshing: false }));
    }
  }, [navigate]);

  useEffect(() => {
    loadReminders();
    refreshNotificationStatus();
  }, [loadReminders, refreshNotificationStatus]);

  useEffect(() => {
    if (!routeReminderId || loading) return;

    const match = reminders.find((reminder) => String(reminderId(reminder)) === String(routeReminderId));

    if (!match) {
      toast.error("Reminder not found");
      navigate("/mobile/reminders", { replace: true });
      return;
    }

    setHighlightedId(routeReminderId);
    setEditingReminder(match);
    setModalOpen(true);

    requestAnimationFrame(() => {
      document.getElementById(`mobile-reminder-${routeReminderId}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
  }, [loading, navigate, reminders, routeReminderId]);

  const filteredReminders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return reminders;

    return reminders.filter((reminder) => (
      reminder.title?.toLowerCase().includes(query)
      || reminder.description?.toLowerCase().includes(query)
    ));
  }, [reminders, searchQuery]);

  const handleSave = async (data) => {
    try {
      if (editingReminder) {
        const id = reminderId(editingReminder);
        const updated = await updateReminder(id, data);

        setReminders((prev) => prev.map((item) => (
          String(reminderId(item)) === String(id) ? updated : item
        )));
        toast.success("Reminder updated");
      } else {
        const created = await createReminder(data);

        setReminders((prev) => [created, ...prev]);
        setupReminderNotifications()
          .then((result) => {
            setNotificationDebug((prev) => ({
              ...prev,
              ...getNotificationDebugSnapshot(),
              serviceWorkerRegistered: Boolean(result?.registration || prev.serviceWorkerRegistered),
              subscriptionExists: Boolean(result?.device || prev.subscriptionExists),
              backendDeviceSaved: Boolean(result?.device),
              setupError: result?.reason,
            }));
          })
          .catch((error) => {
            console.error(error);
            setNotificationDebug((prev) => ({ ...prev, setupError: error.message }));
          });
        toast.success("Reminder created");
      }

      setModalOpen(false);
      setEditingReminder(null);
      if (routeReminderId) navigate("/mobile/reminders", { replace: true });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        navigate("/mobile", { replace: true });
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not save reminder"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((reminder) => String(reminderId(reminder)) !== String(id)));
      toast.success("Reminder deleted");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        navigate("/mobile", { replace: true });
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not delete reminder"));
    }
  };

  const handleToggleStatus = async (reminder) => {
    const nextStatus = reminder.status === "completed" ? "upcoming" : "completed";

    try {
      const updated = await updateReminder(reminderId(reminder), {
        ...reminder,
        status: nextStatus,
      });

      setReminders((prev) => prev.map((item) => (
        String(reminderId(item)) === String(reminderId(reminder)) ? updated : item
      )));
    } catch (error) {
      if (isUnauthorizedError(error)) {
        navigate("/mobile", { replace: true });
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not update reminder"));
    }
  };

  const handleEnableNotifications = async () => {
    setNotificationBusy((prev) => ({ ...prev, enabling: true }));

    try {
      const result = await setupReminderNotifications();
      const debug = await inspectNotificationSetup();

      setNotificationDebug({
        ...debug,
        backendDeviceSaved: Boolean(result?.device),
        setupError: result?.reason,
      });

      if (debug.permission === "granted" && (result?.device || debug.subscriptionExists)) {
        toast.success("Notifications enabled");
      } else {
        toast.error(result?.reason || "Notifications are not enabled");
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        navigate("/mobile", { replace: true });
        return;
      }
      setNotificationDebug((prev) => ({ ...prev, setupError: error.message }));
      toast.error(error.message || "Notifications are not enabled");
    } finally {
      setNotificationBusy((prev) => ({ ...prev, enabling: false }));
    }
  };

  const handleSendTestNotification = async () => {
    setNotificationBusy((prev) => ({ ...prev, sendingTest: true }));

    try {
      await sendTestNotification({
        title: "BlueMind AI",
        body: "Your mobile reminder notifications are connected.",
        url: "/mobile/reminders",
      });
      toast.success("Test notification sent");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        navigate("/mobile", { replace: true });
        return;
      }
      toast.error(getApiErrorMessage(error, "Could not send test notification"));
    } finally {
      setNotificationBusy((prev) => ({ ...prev, sendingTest: false }));
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingReminder(null);
    if (routeReminderId) navigate("/mobile/reminders", { replace: true });
  };

  return (
    <div
      className={cn(
        "min-h-[100dvh] pb-[max(24px,env(safe-area-inset-bottom))]",
        isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]",
      )}
      data-testid="mobile-reminders-page"
    >
      <header
        className={cn(
          "sticky top-0 z-20 border-b px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl",
          isDark ? "border-white/10 bg-[var(--bm-bg-app)]/92" : "border-black/[0.08] bg-[var(--bm-bg-app)]/92",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/mobile/chat")}
              className={cn(
                mobileGlassControlClass,
              )}
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className={cn("text-xs font-medium", isDark ? "text-white/[0.48]" : "text-[var(--bm-text-secondary)]")}>
                BlueMind AI
              </p>
              <h1 className="truncate text-xl font-semibold">Reminders</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingReminder(null);
              setModalOpen(true);
            }}
            className={cn(
              mobileGlassControlClass,
            )}
            style={{ color: appColor }}
            aria-label="Create reminder"
            data-testid="mobile-create-reminder"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <NotificationPanel
          debug={notificationDebug}
          busy={notificationBusy}
          isDark={isDark}
          appColor={appColor}
          onEnable={handleEnableNotifications}
          onRefresh={refreshNotificationStatus}
          onTest={handleSendTestNotification}
        />

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white"
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reminders"
            className={cn(
              inputClasses.search,
              typeClasses.body,
              "pl-14 pr-4 font-semibold backdrop-blur-[24px]",
              isDark
                ? `${mobileNeutralGlassSurfaceClass} placeholder:text-white/42`
                : "border-black/[0.06] bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_12px_28px_rgba(15,23,42,0.08)]",
            )}
            data-testid="mobile-reminder-search"
          />
        </div>

        <section className="space-y-3">
          {loading ? (
            <div className={cn("rounded-[24px] border p-5 text-sm", isDark ? "border-white/10 bg-white/[0.055] text-white/60" : "border-black/[0.08] bg-white text-[var(--bm-text-secondary)]")}>
              Loading reminders...
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredReminders.map((reminder) => (
                <ReminderCard
                  key={reminderId(reminder)}
                  reminder={reminder}
                  language={language}
                  isDark={isDark}
                  appColor={appColor}
                  highlighted={String(reminderId(reminder)) === String(highlightedId)}
                  onEdit={(item) => {
                    setEditingReminder(item);
                    setModalOpen(true);
                  }}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </AnimatePresence>
          )}
        </section>

        {!loading && filteredReminders.length === 0 && (
          <section className="py-14 text-center">
            <div
              className={cn(
                "mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[22px]",
                isDark ? "bg-white/[0.08]" : "bg-white shadow-sm",
              )}
            >
              <Clock className={cn("h-6 w-6", isDark ? "text-white/70" : "text-[var(--bm-text-secondary)]")} />
            </div>
            <h2 className="text-base font-semibold">
              {searchQuery ? "No matching reminders" : "No reminders yet"}
            </h2>
            <p className={cn("mx-auto mt-2 max-w-[260px] text-sm leading-6", isDark ? "text-white/[0.55]" : "text-[var(--bm-text-secondary)]")}>
              {searchQuery
                ? "Try a different title or note."
                : "Create a reminder here and it will appear on desktop too."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setEditingReminder(null);
                  setModalOpen(true);
                }}
                className="mt-5 rounded-full px-5 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: appColor }}
              >
                Create reminder
              </button>
            )}
          </section>
        )}
      </main>

      <AnimatePresence>
        {modalOpen && (
          <ReminderForm
            isOpen={modalOpen}
            reminder={editingReminder}
            onClose={closeModal}
            onSave={handleSave}
            isDark={isDark}
            appColor={appColor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
