import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Briefcase,
  Camera,
  CalendarDays,
  ChevronDown,
  Clock3,
  Dumbbell,
  FileText,
  GraduationCap,
  Image,
  MoreVertical,
  Moon,
  PenLine,
  Plus,
  Repeat,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useApp } from "@/context/AppContext";
import ChatImageAttachments from "@/components/ChatImageAttachments";
import MessageResponse from "@/components/MessageResponse";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import UnifiedComposer from "@/components/UnifiedComposer";
import MobileNotificationControlCard from "@/mobile/components/MobileNotificationControlCard";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, typeClasses } from "@/lib/interactions";
import { getApiErrorMessage } from "@/services/api";
import { streamChatMessage, transcribeVoiceAudio } from "@/services/chatService";
import { uploadChatImage } from "@/services/imageService";
import useVoiceInput from "@/hooks/useVoiceInput";
import {
  getNotificationDebugSnapshot,
  getNotificationStatus,
  inspectNotificationSetup,
  sendTestNotification,
  setupReminderNotifications,
} from "@/services/notificationService";

const STORAGE_KEY = "bluemind-mobile-schedule-dashboard-v1";
const SCHEDULE_STORAGE_KEY = "bluemind-schedule-state-v2";
const SCHEDULE_LIBRARY_STORAGE_KEY = "bluemind-schedule-library-v1";
const ACTIVE_SCHEDULE_ID_STORAGE_KEY = "bluemind-active-schedule-id-v1";
const LEGACY_MOBILE_SCHEDULE_ID = "mobile-calendar-events";

const mobileBlueGlassSurfaceClass = "border-[#2F7DF6]/[0.20] bg-[rgba(12,45,102,0.42)] text-white shadow-[inset_0_1px_0_rgba(115,170,255,0.16),0_18px_42px_rgba(5,18,45,0.28)] backdrop-blur-[28px]";
const mobileBlueGlassMenuClass = "border-[#2F7DF6]/[0.22] bg-[rgba(10,42,96,0.72)] text-white shadow-[inset_0_1px_0_rgba(125,182,255,0.16),0_18px_42px_rgba(5,18,45,0.28)] backdrop-blur-[28px]";
const mobileNeutralGlassSurfaceClass = "border-white/[0.075] bg-[rgba(38,38,38,0.34)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-[24px]";
const mobileNeutralGlassMenuClass = "border-white/[0.08] bg-[rgba(28,28,28,0.78)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-[28px]";
const mobilePrimaryButtonGlassClass = "border-[#7DB7FF]/[0.18] bg-[rgba(25,59,104,0.94)] !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.20),inset_0_-1px_0_rgba(0,0,0,0.08),0_10px_24px_rgba(15,23,42,0.10)] backdrop-blur-[24px]";
const mobileNeutralButtonGlassClass = "border-black/[0.06] bg-white/[0.72] text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-[24px]";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const COLOR_OPTIONS = [
  { id: "blue", label: "Sky Blue", value: "#2F7DF6" },
  { id: "emerald", label: "Emerald", value: "#16A876" },
  { id: "lavender", label: "Lavender", value: "#8A6FF7" },
  { id: "coral", label: "Coral", value: "#F97373" },
  { id: "orange", label: "Soft Orange", value: "#F59E42" },
  { id: "rose", label: "Rose", value: "#E85D8A" },
  { id: "teal", label: "Teal", value: "#14A3A3" },
  { id: "indigo", label: "Indigo", value: "#4F65D9" },
];

const ICON_OPTIONS = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "study", label: "Study", Icon: GraduationCap },
  { id: "book", label: "Book", Icon: BookOpen },
  { id: "gym", label: "Gym", Icon: Dumbbell },
  { id: "meal", label: "Meal", Icon: Utensils },
  { id: "work", label: "Work", Icon: Briefcase },
  { id: "sleep", label: "Sleep", Icon: Moon },
  { id: "note", label: "Note", Icon: StickyNote },
];

function readEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function readRawScheduleLibrary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCHEDULE_LIBRARY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScheduleLibrary(records) {
  try {
    localStorage.setItem(SCHEDULE_LIBRARY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Schedule library storage is local-only until the shared schedule backend is connected.
  }
}

function setActiveScheduleId(scheduleId) {
  try {
    if (scheduleId) localStorage.setItem(ACTIVE_SCHEDULE_ID_STORAGE_KEY, scheduleId);
    else localStorage.removeItem(ACTIVE_SCHEDULE_ID_STORAGE_KEY);
  } catch {
    // Active schedule tracking is best-effort local state.
  }
}

function getActiveScheduleId() {
  try {
    return localStorage.getItem(ACTIVE_SCHEDULE_ID_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function convertMobileEventToBlock(event, index = 0) {
  return {
    id: event.id || `event-block-${index}`,
    name: event.title || "Schedule event",
    title: event.title || "Schedule event",
    date: event.date || toDateKey(new Date()),
    start: event.startTime || "08:00",
    end: event.endTime || "09:00",
    startTime: event.startTime || "08:00",
    endTime: event.endTime || "09:00",
    color: event.color || "blue",
    icon: event.icon || "calendar",
    notes: event.notes || "",
    category: event.icon || "calendar",
  };
}

function normalizeScheduleBlockDate(value) {
  if (!value) return toDateKey(new Date());
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return toDateKey(parsed);

  return toDateKey(new Date());
}

function convertScheduleBlockToMobileEvent(block = {}, index = 0) {
  return {
    id: block.id || `schedule-event-${index}`,
    title: block.title || block.name || "Schedule event",
    date: normalizeScheduleBlockDate(block.date || block.dateKey || block.sourceCell),
    startTime: block.startTime || block.start || "08:00",
    endTime: block.endTime || block.end || "09:00",
    duration: block.duration || "",
    color: block.color || "blue",
    icon: block.icon || "calendar",
    reminder: block.reminder || "None",
    repeat: block.repeat || "Never",
    notes: block.notes || block.description || "",
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  };
}

function normalizeScheduleRecord(record = {}, index = 0) {
  const now = new Date().toISOString();
  const blocks = Array.isArray(record.blocks) ? record.blocks : [];

  return {
    id: record.id || `schedule-legacy-${index}`,
    name: String(record.name || record.title || "Weekly Schedule").trim() || "Weekly Schedule",
    blocks,
    pinned: Boolean(record.pinned),
    source: record.source || "manual",
    createdAt: record.createdAt || record.updatedAt || now,
    updatedAt: record.updatedAt || record.createdAt || now,
  };
}

function createScheduleRecord({ name = "Weekly Schedule", blocks = [], source = "manual" } = {}) {
  const now = new Date().toISOString();

  return {
    id: `schedule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: String(name || "Weekly Schedule").trim() || "Weekly Schedule",
    blocks,
    pinned: false,
    source,
    createdAt: now,
    updatedAt: now,
  };
}

function createLegacyMobileScheduleRecord(events = []) {
  const firstCreatedAt = events
    .map((event) => event.createdAt || event.updatedAt)
    .filter(Boolean)
    .sort()[0];
  const lastUpdatedAt = events
    .map((event) => event.updatedAt || event.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return normalizeScheduleRecord({
    id: LEGACY_MOBILE_SCHEDULE_ID,
    name: "Mobile Schedule",
    blocks: events.map(convertMobileEventToBlock),
    source: "mobile-calendar",
    createdAt: firstCreatedAt,
    updatedAt: lastUpdatedAt,
  });
}

function readScheduleLibrary() {
  const records = readRawScheduleLibrary().map(normalizeScheduleRecord);
  if (records.length) return records;

  const mobileEvents = readEvents();
  if (mobileEvents.length) return [createLegacyMobileScheduleRecord(mobileEvents)];

  return [];
}

function activateScheduleRecord(record) {
  if (!record) return;

  let nextRecord = normalizeScheduleRecord(record);
  if (nextRecord.id === LEGACY_MOBILE_SCHEDULE_ID) {
    nextRecord = createScheduleRecord({
      name: nextRecord.name,
      blocks: nextRecord.blocks,
      source: "mobile-calendar",
    });
    writeScheduleLibrary([nextRecord]);
  }

  setActiveScheduleId(nextRecord.id);
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify({
      blocks: nextRecord.blocks || [],
      updatedAt: nextRecord.updatedAt || new Date().toISOString(),
      scheduleId: nextRecord.id,
      scheduleName: nextRecord.name,
    }));
  } catch {
    // Local persistence is best-effort until Schedule backend storage is added.
  }
}

function formatScheduleCreatedParts(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return {
      date: "Created recently",
      time: "",
    };
  }

  return {
    date: date.toLocaleDateString("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonthsClamped(date, amount) {
  const year = date.getFullYear();
  const month = date.getMonth() + amount;
  const day = date.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return startOfDay(new Date(year, month, Math.min(day, lastDay)));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function sameDate(a, b) {
  return toDateKey(a) === toDateKey(b);
}

function startOfWeek(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), diff);
}

function getWeekDays(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatDateLabel(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

function getVoiceLanguageTag(...candidates) {
  const raw = candidates.map((candidate) => String(candidate || "").trim()).find(Boolean) || "en-US";
  const normalized = raw.replace("_", "-").toLowerCase();

  if (normalized.startsWith("ar")) return "ar-SA";
  if (normalized.startsWith("sv")) return "sv-SE";
  if (normalized.startsWith("en-gb")) return "en-GB";
  if (normalized.startsWith("en")) return "en-US";

  return raw;
}

function appendVoiceText(baseText, transcript) {
  const base = String(baseText || "").trim();
  const next = String(transcript || "").trim();

  if (!base) return next;
  if (!next) return base;
  if (base.endsWith(next)) return base;

  return `${base} ${next}`.replace(/\s+/g, " ").trim();
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
}

function getIcon(iconId) {
  return ICON_OPTIONS.find((item) => item.id === iconId)?.Icon || CalendarDays;
}

function getColor(colorId) {
  return COLOR_OPTIONS.find((item) => item.id === colorId)?.value || COLOR_OPTIONS[0].value;
}

function createInitialManualEvent(date) {
  return {
    title: "",
    date: toDateKey(date),
    startTime: "08:00",
    endTime: "09:00",
    duration: "",
    color: "blue",
    icon: "calendar",
    reminder: "None",
    repeat: "Never",
    notes: "",
  };
}

function ScheduleActionSheet({ open, isDark, onClose, onManual, onAi }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.button
            type="button"
            aria-label="Close create options"
            className="absolute inset-0 bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute bottom-0 left-0 right-0 rounded-t-[32px] border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl",
              isDark ? "border-white/10 bg-[var(--bm-bg-app)] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]",
            )}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--bm-text-muted)]/35" />
            <div className="space-y-2">
              <button type="button" onClick={onManual} className={cn("flex min-h-[58px] w-full items-center gap-3 rounded-3xl px-4 text-left font-bold", isDark ? "bg-white/[0.07] active:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] active:bg-[var(--bm-active-bg)]")}>
                <PenLine className={iconClasses.card} />
                <span>Create manually</span>
              </button>
              <button type="button" onClick={onAi} className="flex min-h-[58px] w-full items-center gap-3 rounded-3xl bg-[var(--bm-primary)] px-4 text-left font-bold !text-white active:opacity-90">
                <Sparkles className={iconClasses.card} />
                <span>Let BlueMind create it</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MobileModalShell({ open, isDark, title, onClose, children, contentClassName = "" }) {
  useEffect(() => {
    if (!open) return undefined;

    const bodyOverflow = document.body.style.overflow;
    const bodyTouchAction = document.body.style.touchAction;
    const htmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.body.style.touchAction = bodyTouchAction;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex touch-none items-end justify-center overflow-hidden bg-black/55 p-0 backdrop-blur-[14px] md:items-center md:p-6"
          onClick={onClose}
        >
          <div className="box-border w-full max-w-full min-w-0 md:flex md:justify-center" onClick={(event) => event.stopPropagation()}>
            <motion.div
              initial={{ y: "100%", opacity: 0.96 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative box-border flex h-[88dvh] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-t-[34px] shadow-[0_-28px_90px_rgba(0,0,0,0.18)] md:mx-auto md:h-[86dvh] md:max-w-[560px] md:rounded-[34px]",
                isDark ? "bg-[var(--bm-bg-card)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]",
              )}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              <div className="flex h-14 shrink-0 items-center justify-between px-5 pt-2">
                <span className="w-10" />
                <h2 className="truncate text-base font-extrabold">{title}</h2>
                <button type="button" onClick={onClose} className="bm-mobile-glass-control" aria-label={`Close ${title}`}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className={cn("box-border min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-2 sm:px-6", contentClassName)}>
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ManualEventSheet({ open, isDark, form, setForm, onClose, onCreate }) {
  const fieldClassName = "bm-field bm-input-interactive box-border h-12 w-full min-w-0 max-w-full rounded-2xl px-3 font-semibold";

  return (
    <MobileModalShell open={open} isDark={isDark} title="Create event" onClose={onClose}>
      <form
        className="box-border w-full max-w-full min-w-0"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
            <p className={cn("mb-4 font-medium", typeClasses.small, "text-[var(--bm-text-muted)]")}>Add it to your mobile Schedule dashboard.</p>

            <div className="space-y-3">
              <label className="block min-w-0">
                <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Event title</span>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Datakommunikation" className={fieldClassName} />
              </label>
              <div className="grid min-w-0 grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Date</span>
                  <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className={fieldClassName} />
                </label>
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Duration</span>
                  <input value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} placeholder="Optional" className={fieldClassName} />
                </label>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Start time</span>
                  <input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className={fieldClassName} />
                </label>
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>End time</span>
                  <input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className={fieldClassName} />
                </label>
              </div>

              <div>
                <span className={cn("mb-2 block font-bold", typeClasses.small)}>Color</span>
                <div className="grid min-w-0 grid-cols-4 gap-2 max-[390px]:grid-cols-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button key={color.id} type="button" onClick={() => setForm((current) => ({ ...current, color: color.id }))} className={cn("box-border flex h-11 min-w-0 items-center justify-center rounded-2xl border", form.color === color.id ? "border-[var(--bm-primary)]" : "border-transparent")} aria-label={color.label}>
                      <span className="h-6 w-6 rounded-full" style={{ backgroundColor: color.value }} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={cn("mb-2 block font-bold", typeClasses.small)}>Icon</span>
                <div className="grid min-w-0 grid-cols-4 gap-2 max-[390px]:grid-cols-3">
                  {ICON_OPTIONS.map(({ id, label, Icon }) => (
                    <button key={id} type="button" onClick={() => setForm((current) => ({ ...current, icon: id }))} className={cn("box-border flex h-12 min-w-0 items-center justify-center rounded-2xl border", form.icon === id ? "border-[var(--bm-primary)] bg-[var(--bm-active-bg)] text-[var(--bm-primary)]" : isDark ? "border-white/10 bg-white/[0.05]" : "border-[var(--bm-border)] bg-white")} aria-label={label}>
                      <Icon className={iconClasses.button} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><Bell className="h-3.5 w-3.5" /> Reminder</span>
                  <select value={form.reminder} onChange={(event) => setForm((current) => ({ ...current, reminder: event.target.value }))} className={fieldClassName}>
                    <option>None</option>
                    <option>10 minutes before</option>
                    <option>30 minutes before</option>
                    <option>1 hour before</option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><Repeat className="h-3.5 w-3.5" /> Repeat</span>
                  <select value={form.repeat} onChange={(event) => setForm((current) => ({ ...current, repeat: event.target.value }))} className={fieldClassName}>
                    <option>Never</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                  <option>Monthly</option>
                  </select>
                </label>
              </div>
              <label className="block min-w-0">
                <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><StickyNote className="h-3.5 w-3.5" /> Notes</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes" className="bm-field bm-input-interactive box-border min-h-[86px] w-full min-w-0 max-w-full resize-none rounded-2xl px-4 py-3 font-semibold" />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={onClose} className={cn("h-12 rounded-2xl font-bold", isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>Cancel</button>
              <button type="submit" className="h-12 rounded-2xl bg-[var(--bm-primary)] font-bold !text-white">Create</button>
            </div>
      </form>
    </MobileModalShell>
  );
}

function AiCreateSheet({ open, isDark, selectedDate, events, onClose }) {
  const { prefs, uiLanguage } = useApp();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voicePreview, setVoicePreview] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const scrollRef = useRef(null);
  const photosInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const filesInputRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const conversationIdRef = useRef("");
  const objectUrlsRef = useRef([]);
  const voiceBaseTextRef = useRef("");
  const voicePreviewRef = useRef("");
  const voiceSendLockRef = useRef(false);
  const composerBlurTimerRef = useRef(0);

  const voiceLanguage = useMemo(() => getVoiceLanguageTag(
    prefs?.voiceLanguage,
    prefs?.language,
    uiLanguage,
    typeof navigator !== "undefined" ? navigator.language : "en-US",
  ), [prefs?.language, prefs?.voiceLanguage, uiLanguage]);

  const {
    isListening,
    status: voiceCaptureStatus,
    audioLevels: voiceAudioLevels,
    liveTranscript: voiceLiveTranscript,
    start: startVoiceCapture,
    stop: stopVoiceInput,
    cancel: cancelVoiceInput,
  } = useVoiceInput({
    onError: (messageText) => {
      setVoiceStatus("error");
      toast.error(messageText);
    },
  });

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, open]);

  useEffect(() => {
    if (voiceCaptureStatus === "requesting" || voiceCaptureStatus === "listening") {
      setVoiceStatus(voiceCaptureStatus);
    }
  }, [voiceCaptureStatus]);

  useEffect(() => {
    if (voiceCaptureStatus === "listening") {
      voicePreviewRef.current = voiceLiveTranscript;
      setVoicePreview(voiceLiveTranscript);
    }
  }, [voiceCaptureStatus, voiceLiveTranscript]);

  useEffect(() => () => {
    if (composerBlurTimerRef.current) {
      window.clearTimeout(composerBlurTimerRef.current);
    }
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    if (open) return undefined;

    if (isListening || ["requesting", "listening", "transcribing"].includes(voiceStatus)) {
      void cancelVoiceInput();
    }

    setComposerFocused(false);
    setAttachmentMenuOpen(false);
    setVoiceStatus("idle");
    setVoicePreview("");
    voicePreviewRef.current = "";
    voiceSendLockRef.current = false;

    return undefined;
  }, [cancelVoiceInput, isListening, open, voiceStatus]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (isListening || ["requesting", "listening", "transcribing"].includes(voiceStatus))) {
        void cancelVoiceInput();
        setMessage(voiceBaseTextRef.current);
        setVoiceStatus("idle");
        setVoicePreview("");
        voicePreviewRef.current = "";
        voiceSendLockRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [cancelVoiceInput, isListening, voiceStatus]);

  useEffect(() => {
    if (!attachmentMenuOpen) return undefined;

    const handleOutsidePointer = (event) => {
      const menu = attachmentMenuRef.current;
      if (menu && menu.contains(event.target)) return;
      setAttachmentMenuOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer, true);
  }, [attachmentMenuOpen]);

  const removeAttachment = (attachmentId) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === attachmentId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== target.previewUrl);
      }
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const handleAttachmentFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setAttachmentMenuOpen(false);
    if (!files.length) return;

    setIsUploading(true);
    const accepted = [];

    try {
      for (const file of files.slice(0, 6)) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        const isImage = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
        const isText = file.type === "text/plain" || ["txt", "md", "csv"].includes(extension);
        const isPdf = file.type === "application/pdf" || extension === "pdf";

        if (!isImage && !isText && !isPdf) {
          toast.error(`${file.name} is not supported here yet.`);
          continue;
        }

        if (isImage && file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is too large.`);
          continue;
        }

        let uploadedImage = null;
        let content = "";
        let previewUrl = "";

        if (isImage) {
          previewUrl = URL.createObjectURL(file);
          objectUrlsRef.current.push(previewUrl);
          uploadedImage = await uploadChatImage(file, conversationIdRef.current || undefined);
        } else if (isText) {
          content = await file.text().catch(() => "");
        }

        accepted.push({
          id: uploadedImage?.id || `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          imageId: uploadedImage?.id || "",
          name: file.name,
          type: isImage ? "image" : isPdf ? "pdf" : "text",
          size: file.size,
          content,
          previewUrl,
        });
      }

      if (accepted.length) {
        setAttachments((current) => [...current, ...accepted].slice(0, 8));
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Attachment upload failed"));
    } finally {
      setIsUploading(false);
    }
  };

  const sendScheduleChatMessage = useCallback(async (event, textOverride = undefined) => {
    event?.preventDefault?.();
    const text = String(textOverride ?? message).trim();
    if ((!text && !attachments.length) || isSending || isUploading) return;

    const currentAttachments = attachments;
    const imageIds = currentAttachments.map((attachment) => attachment.imageId || attachment.id).filter(Boolean);
    const fileContext = currentAttachments
      .filter((attachment) => attachment.type !== "image")
      .map((attachment) => attachment.content
        ? `\n\nAttached file: ${attachment.name}\n${attachment.content.slice(0, 8000)}`
        : `\n\nAttached file: ${attachment.name} (${attachment.type}).`)
      .join("");
    const outgoingText = `${text || "Please analyze the attached schedule context."}${fileContext}`;
    const userMessage = {
      id: `schedule-user-${Date.now()}`,
      role: "user",
      content: text,
      attachments: currentAttachments,
    };
    const aiMessageId = `schedule-ai-${Date.now()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      { id: aiMessageId, role: "ai", content: "", isStreaming: true },
    ]);
    setMessage("");
    setComposerFocused(false);
    setAttachments([]);
    setIsSending(true);

    try {
      await streamChatMessage({
        message: outgoingText,
        imageIds,
        conversationId: conversationIdRef.current || undefined,
        mode: "general",
        metadata: {
          source: "mobile_schedule_dashboard",
          scheduleContext: {
            selectedDate: toDateKey(selectedDate),
            events: sortEvents(events).slice(0, 40),
          },
        },
        onReady: (payload) => {
          if (payload?.conversation?.conversationId) {
            conversationIdRef.current = payload.conversation.conversationId;
          }
        },
        onDelta: (payload) => {
          const token = payload?.token || "";
          if (!token) return;
          setMessages((current) => current.map((item) => (
            item.id === aiMessageId ? { ...item, content: `${item.content || ""}${token}` } : item
          )));
        },
        onComplete: (payload) => {
          if (payload?.conversation?.conversationId) {
            conversationIdRef.current = payload.conversation.conversationId;
          }
          setMessages((current) => current.map((item) => (
            item.id === aiMessageId
              ? { ...item, content: item.content || payload?.message?.content || "", isStreaming: false }
              : item
          )));
        },
      });
    } catch (error) {
      setMessages((current) => current.map((item) => (
        item.id === aiMessageId
          ? { ...item, content: getApiErrorMessage(error, "BlueMind could not respond."), isStreaming: false }
          : item
      )));
    } finally {
      setIsSending(false);
    }
  }, [attachments, events, isSending, isUploading, message, selectedDate]);

  const finalizeVoiceInput = useCallback(async ({ send = false, previewOverride = "" } = {}) => {
    if (voiceSendLockRef.current) return;
    voiceSendLockRef.current = true;
    setVoiceStatus("transcribing");

    const liveFallback = String(previewOverride || voicePreviewRef.current || voicePreview || voiceLiveTranscript || "").trim();

    try {
      if (liveFallback) {
        void stopVoiceInput().catch(() => {
          // The live transcript is already captured; stopping is best-effort cleanup.
        });

        const finalText = appendVoiceText(voiceBaseTextRef.current, liveFallback);
        setMessage(finalText);
        voicePreviewRef.current = "";
        setVoicePreview("");

        if (send) {
          setVoiceStatus("sending");
          await sendScheduleChatMessage(null, finalText);
        }

        setVoiceStatus("idle");
        return;
      }

      const audioBlob = await stopVoiceInput();
      let transcript = "";

      if (audioBlob?.size >= 512) {
        try {
          const result = await transcribeVoiceAudio(audioBlob);
          transcript = String(result?.text || "").trim();
        } catch (error) {
          if (!liveFallback) throw error;
          transcript = liveFallback;
          toast.info("Using the live transcript because final transcription was unavailable.");
        }
      } else {
        transcript = liveFallback;
      }

      if (!transcript) {
        throw new Error("No speech detected. Please try again.");
      }

      const finalText = appendVoiceText(voiceBaseTextRef.current, transcript);
      setMessage(finalText);
      voicePreviewRef.current = "";
      setVoicePreview("");

      if (send) {
        setVoiceStatus("sending");
        await sendScheduleChatMessage(null, finalText);
      }

      setVoiceStatus("idle");
    } catch (error) {
      setVoiceStatus("error");
      toast.error(error?.message || "Transcription failed. Please try again.");
    } finally {
      voiceSendLockRef.current = false;
    }
  }, [sendScheduleChatMessage, stopVoiceInput, voiceLiveTranscript, voicePreview]);

  const startVoiceInput = useCallback(async () => {
    if (isListening || ["requesting", "listening", "transcribing"].includes(voiceStatus)) {
      await finalizeVoiceInput({ send: false });
      return;
    }

    setAttachmentMenuOpen(false);
    voiceBaseTextRef.current = message;
    voicePreviewRef.current = "";
    setVoicePreview("");
    setVoiceStatus("requesting");
    setComposerFocused(true);
    const started = await startVoiceCapture({ language: voiceLanguage });

    if (!started) {
      setVoiceStatus("error");
    }
  }, [finalizeVoiceInput, isListening, message, startVoiceCapture, voiceLanguage, voiceStatus]);

  const handleCancelVoiceInput = useCallback(async () => {
    await cancelVoiceInput();
    setMessage(voiceBaseTextRef.current);
    voicePreviewRef.current = "";
    setVoicePreview("");
    setVoiceStatus("idle");
    voiceSendLockRef.current = false;
  }, [cancelVoiceInput]);

  const handleStopVoiceInput = useCallback((previewOverride = "") => {
    void finalizeVoiceInput({ send: false, previewOverride });
  }, [finalizeVoiceInput]);

  const handleSendVoiceInput = useCallback((previewOverride = "") => {
    void finalizeVoiceInput({ send: true, previewOverride });
  }, [finalizeVoiceInput]);

  const mobileGlassControlStyle = isDark ? {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.082), inset 0 -1px 0 rgba(255,255,255,0.01), inset 1px 0 0 rgba(255,255,255,0.018), inset -1px 0 0 rgba(255,255,255,0.016), 0 10px 24px rgba(0,0,0,0.24)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
  } : {
    boxShadow: "inset 0 1px 0 rgba(17,17,17,0.06), inset 0 -1px 0 rgba(17,17,17,0.008), inset 1px 0 0 rgba(17,17,17,0.014), inset -1px 0 0 rgba(17,17,17,0.012), 0 7px 16px rgba(15,23,42,0.028)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
  };
  const mobileGlassPanelStyle = isDark ? {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(255,255,255,0.012), inset 1px 0 0 rgba(255,255,255,0.02), inset -1px 0 0 rgba(255,255,255,0.018), 0 18px 44px rgba(0,0,0,0.28)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
  } : {
    boxShadow: "inset 0 1px 0 rgba(17,17,17,0.06), inset 0 -1px 0 rgba(17,17,17,0.008), inset 1px 0 0 rgba(17,17,17,0.014), inset -1px 0 0 rgba(17,17,17,0.012), 0 10px 24px rgba(15,23,42,0.036)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
  };

  const attachmentActions = [
    { label: "Camera", icon: Camera, onClick: () => cameraInputRef.current?.click() },
    { label: "Photos", icon: Image, onClick: () => photosInputRef.current?.click() },
    { label: "Files", icon: FileText, onClick: () => filesInputRef.current?.click() },
  ];

  const attachmentMenu = typeof document !== "undefined" ? createPortal((
    <AnimatePresence>
      {attachmentMenuOpen && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+118px)]">
          <button
            type="button"
            className="absolute inset-0 z-0 bg-transparent"
            onMouseDown={() => setAttachmentMenuOpen(false)}
            onPointerDown={() => setAttachmentMenuOpen(false)}
            onTouchStart={() => setAttachmentMenuOpen(false)}
            onClick={() => setAttachmentMenuOpen(false)}
            aria-label="Close attachment menu"
          />
          <motion.section
            ref={attachmentMenuRef}
            className={cn(
              "relative z-10 w-full max-w-[356px] rounded-[32px] border p-4 backdrop-blur-[42px]",
              isDark
                ? "border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.016),inset_1px_0_0_rgba(255,255,255,0.032),inset_-1px_0_0_rgba(255,255,255,0.026),0_24px_68px_rgba(0,0,0,0.34)]"
                : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)]",
            )}
            style={isDark ? undefined : mobileGlassPanelStyle}
            initial={{ opacity: 0, y: 18, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            data-testid="mobile-schedule-ai-plus-menu"
          >
            <div className="grid grid-cols-3 gap-3">
              {attachmentActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "flex h-[88px] min-w-0 flex-col items-center justify-center rounded-[24px] border px-2 text-center font-extrabold transition-colors",
                      isDark
                        ? "border-white/[0.05] bg-[rgba(255,255,255,0.032)] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] active:bg-[rgba(255,255,255,0.065)]"
                        : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)] active:bg-[var(--bm-active-bg)]",
                    )}
                    style={isDark ? undefined : mobileGlassControlStyle}
                  >
                    <ActionIcon className={cn("mb-2 h-7 w-7 stroke-[2.25]", isDark ? "text-white/78" : "text-[var(--bm-icon-primary)]")} />
                    <span className="text-[13px] leading-tight tracking-tight">{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  ), document.body) : null;

  return (
    <MobileModalShell open={open} isDark={isDark} title="BlueMind AI" onClose={onClose} contentClassName="flex flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-3 text-center">
            <AnimatePresence initial={false}>
              {!composerFocused && !message.trim() && !isListening && !["requesting", "listening", "transcribing", "sending"].includes(voiceStatus) && (
                <motion.div
                  key="schedule-ai-welcome"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center"
                >
                  <img
                    src="/bluemind-schedule-ai-create.png"
                    alt=""
                    className="h-auto w-[min(82vw,330px)] max-w-full select-none object-contain"
                    draggable="false"
                  />
                  <h3 className={cn("mt-3 font-black", typeClasses.cardTitle)}>How should BlueMind help?</h3>
                  <p className={cn("mt-2 max-w-[290px] font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                    Ask BlueMind to create, edit, or improve your schedule. You can include images for analysis.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((item, index) => {
              const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;
              const hasText = Boolean(String(item.content || "").trim());

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={item.role === "user" ? "flex justify-end" : "w-full"}
                >
                  <div className={cn("max-w-[86%] break-words text-sm font-medium leading-6", item.role === "user" ? "rounded-[22px] bg-[var(--bm-primary)] px-4 py-3 text-white" : isDark ? "w-full text-white" : "w-full text-[var(--bm-text-primary)]")}>
                    {item.role === "user" ? (
                      <>
                        {hasAttachments && (
                          <ChatImageAttachments
                            attachments={item.attachments}
                            hasText={hasText}
                            isDark={isDark}
                            className="mb-2 gap-2"
                            imageClassName="max-h-[180px]"
                          />
                        )}
                        {hasText ? <MessageResponse message={item} previousUserContent={messages[index - 1]?.content || ""} /> : null}
                      </>
                    ) : item.isStreaming && !item.content ? (
                      <ThinkingIndicator className="mb-0" />
                    ) : (
                      <MessageResponse message={item} previousUserContent={messages[index - 1]?.content || ""} className="text-[15px] leading-[1.75]" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {attachmentMenu}

      <div
        onPointerDownCapture={() => {
          if (composerBlurTimerRef.current) {
            window.clearTimeout(composerBlurTimerRef.current);
          }
          setComposerFocused(true);
        }}
      >
        <UnifiedComposer
          value={message}
          onFocus={() => {
            if (composerBlurTimerRef.current) {
              window.clearTimeout(composerBlurTimerRef.current);
            }
            setComposerFocused(true);
          }}
          onBlur={() => {
            composerBlurTimerRef.current = window.setTimeout(() => {
              setComposerFocused(false);
            }, 140);
          }}
          onChange={(event) => setMessage(event.target.value)}
          onSubmit={sendScheduleChatMessage}
          placeholder="Ask BlueMind..."
          attachments={attachments}
          onRemoveAttachment={removeAttachment}
          onClearAttachments={() => {
            attachments.forEach((attachment) => {
              if (attachment.previewUrl) {
                URL.revokeObjectURL(attachment.previewUrl);
                objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== attachment.previewUrl);
              }
            });
            setAttachments([]);
          }}
          isUploading={isUploading}
          onAdd={() => setAttachmentMenuOpen(true)}
          onVoice={startVoiceInput}
          isListening={isListening}
          voiceAudioLevels={voiceAudioLevels}
          voiceStatus={voiceStatus}
          voiceTranscript={voicePreview}
          onCancelVoice={handleCancelVoiceInput}
          onStopVoice={handleStopVoiceInput}
          onSendVoice={handleSendVoiceInput}
          canSendVoice={Boolean(voicePreview.trim()) || isListening}
          isBusy={isSending || voiceStatus === "transcribing" || voiceStatus === "sending"}
          canSend={Boolean(message.trim()) || attachments.length > 0}
          isDark={isDark}
          variant="mobile"
          glassTone="chat-light"
          maxTextHeight={120}
          testId="mobile-schedule-ai-input"
        />
      </div>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAttachmentFiles} />
      <input ref={photosInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleAttachmentFiles} />
      <input ref={filesInputRef} type="file" accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/csv" multiple className="hidden" onChange={handleAttachmentFiles} />
    </MobileModalShell>
  );
}

function ScheduleContextMenuPortal({ open, rect, isDark, onClose, onEdit, onDelete }) {
  if (!open || !rect || typeof document === "undefined") return null;

  const menuWidth = 144;
  const menuHeight = 88;
  const margin = 10;
  const viewportWidth = window.innerWidth || 390;
  const viewportHeight = window.innerHeight || 760;
  const hasSpaceAbove = rect.top >= menuHeight + margin + 8;
  const desiredTop = hasSpaceAbove ? rect.top - menuHeight - 8 : rect.bottom + 8;
  const top = Math.min(Math.max(desiredTop, margin), viewportHeight - menuHeight - margin);
  const desiredLeft = rect.right - menuWidth;
  const left = Math.min(Math.max(desiredLeft, margin), viewportWidth - menuWidth - margin);

  return createPortal(
    <AnimatePresence>
      <button type="button" className="fixed inset-0 z-[190] cursor-default bg-transparent" onClick={onClose} aria-label="Close schedule actions" />
      <motion.div
        initial={{ opacity: 0, y: hasSpaceAbove ? 4 : -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: hasSpaceAbove ? 4 : -4, scale: 0.98 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className={cn("fixed z-[191] w-36 overflow-hidden rounded-2xl border p-1 shadow-2xl", isDark ? mobileBlueGlassMenuClass : "border-[#2F7DF6]/[0.16] bg-white/85 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_16px_36px_rgba(15,85,170,0.12)] backdrop-blur-[22px]")}
        style={{ top, left }}
      >
        <button
          type="button"
          onClick={onEdit}
          className={cn("flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold transition-colors", isDark ? "text-white hover:bg-white/[0.08] active:bg-white/[0.08]" : "hover:bg-[#2F7DF6]/[0.08] active:bg-[#2F7DF6]/[0.08]")}
        >
          <PenLine className="h-4 w-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={cn("flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-red-500 transition-colors", isDark ? "hover:bg-white/[0.08] active:bg-white/[0.08]" : "hover:bg-red-50 active:bg-red-50")}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function AllSchedulesModal({ open, isDark, events, onClose, onOpenMenu }) {
  return (
    <MobileModalShell open={open} isDark={isDark} title="All schedules" onClose={onClose} contentClassName="flex flex-col">
            <p className={cn("mb-4 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
              Sorted by date and time automatically.
            </p>
              {events.length ? (
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
                  {events.map((event) => {
                    const Icon = getIcon(event.icon);
                    const color = getColor(event.color);

                    return (
                      <div
                        key={event.id}
                        className={cn("relative flex items-center gap-3 rounded-[24px] border p-3", isDark ? mobileBlueGlassSurfaceClass : "border-[#2F7DF6]/[0.10] bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(15,85,170,0.08)] backdrop-blur-[18px]")}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: color }}>
                          <Icon className={iconClasses.button} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-black", typeClasses.body)}>{event.title}</span>
                          <span className={cn("mt-1 flex items-center gap-1.5 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateLabel(fromDateKey(event.date))}, {event.startTime}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={(clickEvent) => onOpenMenu(event.id, clickEvent)}
                          className="bm-mobile-glass-control"
                          aria-label={`Open actions for ${event.title}`}
                        >
                          <MoreVertical className={iconClasses.button} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={cn("rounded-[24px] border p-5 text-center", isDark ? "border-white/10 bg-white/[0.05]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                  <CalendarDays className="mx-auto h-8 w-8 text-[var(--bm-primary)]" />
                  <p className={cn("mt-3 font-black", typeClasses.body)}>No schedules yet</p>
                  <p className={cn("mx-auto mt-1 max-w-[240px] font-semibold leading-5", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                    Use the plus button to add your first schedule.
                  </p>
                </div>
              )}
    </MobileModalShell>
  );
}

function ScheduleHomeInfoPanel({ debug, busy, isDark, appColor, onEnable, onRefresh, onTest }) {
  return (
    <MobileNotificationControlCard
      title="Schedule Notifications"
      description="Manage schedule notification delivery for this section."
      debug={debug}
      busy={busy}
      isDark={isDark}
      appColor={appColor}
      onEnable={onEnable}
      onRefresh={onRefresh}
      onTest={onTest}
      testId="mobile-schedule-info-panel"
    />
  );
}

function ScheduleHomeCard({ schedule, index, isDark, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const created = formatScheduleCreatedParts(schedule.createdAt || schedule.updatedAt);
  const eventCount = Array.isArray(schedule.blocks) ? schedule.blocks.length : 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1], delay: index * 0.035 }}
      onClick={() => onOpen(schedule)}
      className={cn(
        "relative cursor-pointer rounded-[24px] border p-4 shadow-sm transition",
        isDark ? mobileNeutralGlassSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-[22px]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-1">
          <h2 className="truncate text-[15px] font-semibold">{schedule.name}</h2>
          <p className={cn("mt-2 text-sm font-semibold leading-5", isDark ? "text-white/[0.70]" : "text-[var(--bm-text-secondary)]")}>
            {eventCount} Event{eventCount === 1 ? "" : "s"}
          </p>
          <div className={cn("mt-3 text-sm leading-5", isDark ? "text-white/[0.58]" : "text-[var(--bm-text-secondary)]")}>
            <p className="font-semibold">Created:</p>
            <p>{created.date}</p>
            {created.time ? <p>{created.time}</p> : null}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((value) => !value);
            }}
            className="bm-mobile-glass-control"
            aria-label={`Schedule actions for ${schedule.name}`}
          >
            <MoreVertical className={iconClasses.button} />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close schedule menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div
                className={cn(
                  "absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-2xl border py-1 shadow-xl",
                  isDark ? mobileNeutralGlassMenuClass : "border-black/[0.08] bg-white/85 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_16px_36px_rgba(15,23,42,0.10)] backdrop-blur-[22px]",
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onOpen(schedule);
                    setMenuOpen(false);
                  }}
                  className={cn("w-full px-4 py-3 text-left text-sm", isDark ? "text-white hover:bg-white/[0.08]" : "hover:bg-[#2F7DF6]/[0.08]")}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(schedule.id);
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
    </motion.article>
  );
}

export default function MobileScheduleDashboard() {
  const navigate = useNavigate();
  const { resolvedTheme, prefs } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs?.appColor || prefs?.chatColor || "var(--bm-primary)";
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [viewMode, setViewMode] = useState("home");
  const [isExpanded, setIsExpanded] = useState(false);
  const [calendarSwipeDirection, setCalendarSwipeDirection] = useState(0);
  const [events, setEvents] = useState(readEvents);
  const [schedules, setSchedules] = useState(readScheduleLibrary);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(() => createInitialManualEvent(new Date()));
  const [editingEventId, setEditingEventId] = useState("");
  const [eventMenuId, setEventMenuId] = useState("");
  const [eventMenuAnchorEl, setEventMenuAnchorEl] = useState(null);
  const [eventMenuRect, setEventMenuRect] = useState(null);
  const [scheduleListOpen, setScheduleListOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [notificationDebug, setNotificationDebug] = useState(() => getNotificationDebugSnapshot());
  const [notificationBusy, setNotificationBusy] = useState({
    enabling: false,
    refreshing: false,
    sendingTest: false,
  });

  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);
  const sortedEvents = useMemo(() => sortEvents(events), [events]);
  const selectedEvents = useMemo(() => sortEvents(events.filter((event) => event.date === toDateKey(selectedDate))), [events, selectedDate]);
  const selectedMenuEvent = useMemo(() => events.find((event) => event.id === eventMenuId) || null, [eventMenuId, events]);
  const filteredSchedules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const ordered = [...schedules].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    if (!query) return ordered;
    return ordered.filter((schedule) => String(schedule.name || "").toLowerCase().includes(query));
  }, [schedules, searchQuery]);
  const monthDates = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const selectedWeekRow = Math.max(0, Math.floor(monthDates.findIndex((date) => sameDate(date, selectedDate)) / 7));
  const calendarRowHeight = 50;
  const calendarRowGap = 6;
  const calendarCollapsedHeight = calendarRowHeight;
  const calendarExpandedHeight = (calendarRowHeight * 6) + (calendarRowGap * 5);
  const calendarOffset = isExpanded ? 0 : -(selectedWeekRow * (calendarRowHeight + calendarRowGap));
  const selectedMonth = MONTH_NAMES[selectedDate.getMonth()];
  const selectedYear = selectedDate.getFullYear();

  useEffect(() => {
    if (!eventMenuAnchorEl || !eventMenuId) return undefined;

    const updateRect = () => {
      if (!document.body.contains(eventMenuAnchorEl)) {
        setEventMenuId("");
        setEventMenuAnchorEl(null);
        setEventMenuRect(null);
        return;
      }
      setEventMenuRect(eventMenuAnchorEl.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [eventMenuAnchorEl, eventMenuId]);

  const refreshNotificationStatus = async () => {
    setNotificationBusy((prev) => ({ ...prev, refreshing: true }));

    try {
      const debug = await inspectNotificationSetup();
      let backendStatus = null;

      try {
        backendStatus = await getNotificationStatus();
      } catch (error) {
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
  };

  useEffect(() => {
    refreshNotificationStatus();
  }, []);

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
        toast.success("Schedule notifications enabled");
      } else {
        toast.error(result?.reason || "Notifications are not enabled");
      }
    } catch (error) {
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
        title: "BlueMind - Schedule",
        body: "Your Schedule notifications are connected.",
        url: "/mobile/schedule",
      });
      toast.success("Test notification sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send test notification"));
    } finally {
      setNotificationBusy((prev) => ({ ...prev, sendingTest: false }));
    }
  };

  const closeEventMenu = () => {
    setEventMenuId("");
    setEventMenuAnchorEl(null);
    setEventMenuRect(null);
  };

  const syncActiveScheduleRecordFromEvents = (nextEvents) => {
    const activeId = getActiveScheduleId();
    if (!activeId) return;

    const now = new Date().toISOString();
    const nextBlocks = nextEvents.map(convertMobileEventToBlock);
    const records = readRawScheduleLibrary().map(normalizeScheduleRecord);
    const nextRecords = records.map((record) => (
      record.id === activeId
        ? { ...record, blocks: nextBlocks, updatedAt: now }
        : record
    ));
    const activeRecord = nextRecords.find((record) => record.id === activeId);

    writeScheduleLibrary(nextRecords);
    setSchedules(nextRecords);
    if (activeRecord) activateScheduleRecord(activeRecord);
  };

  const openEventMenu = (eventId, clickEvent) => {
    clickEvent.stopPropagation();
    const anchor = clickEvent.currentTarget;
    setEventMenuId((current) => {
      if (current === eventId) {
        setEventMenuAnchorEl(null);
        setEventMenuRect(null);
        return "";
      }
      setEventMenuAnchorEl(anchor);
      setEventMenuRect(anchor.getBoundingClientRect());
      return eventId;
    });
  };

  const saveEvent = (eventData) => {
    if (!eventData.title.trim()) {
      toast.error("Add an event title first.");
      return;
    }

    if (editingEventId) {
      const nextEvents = events.map((event) => (
        event.id === editingEventId
          ? { ...event, ...eventData, title: eventData.title.trim(), updatedAt: new Date().toISOString() }
          : event
      ));
      setEvents(nextEvents);
      persistEvents(nextEvents);
      syncActiveScheduleRecordFromEvents(nextEvents);
      setSelectedDate(fromDateKey(eventData.date));
      setEditingEventId("");
      toast.success("Schedule event updated.");
      return;
    }

    const nextEvent = {
      ...eventData,
      id: `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: eventData.title.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextEvents = [...events, nextEvent];
    setEvents(nextEvents);
    persistEvents(nextEvents);
    syncActiveScheduleRecordFromEvents(nextEvents);
    setSelectedDate(fromDateKey(nextEvent.date));
    toast.success("Schedule event created.");
  };

  const openManualCreate = () => {
    setActionSheetOpen(false);
    setEditingEventId("");
    setManualForm(createInitialManualEvent(selectedDate));
    setManualOpen(true);
  };

  const openEditEvent = (event) => {
    closeEventMenu();
    setScheduleListOpen(false);
    setEditingEventId(event.id);
    setManualForm({
      title: event.title || "",
      date: event.date || toDateKey(selectedDate),
      startTime: event.startTime || "08:00",
      endTime: event.endTime || "09:00",
      duration: event.duration || "",
      color: event.color || "blue",
      icon: event.icon || "calendar",
      reminder: event.reminder || "None",
      repeat: event.repeat || "Never",
      notes: event.notes || "",
    });
    setManualOpen(true);
  };

  const deleteEvent = (eventId) => {
    const nextEvents = events.filter((event) => event.id !== eventId);
    setEvents(nextEvents);
    persistEvents(nextEvents);
    syncActiveScheduleRecordFromEvents(nextEvents);
    closeEventMenu();
    toast.success("Schedule event deleted.");
  };

  const openAiCreate = () => {
    setActionSheetOpen(false);
    setAiOpen(true);
  };

  const moveCalendarMonth = (direction) => {
    setCalendarSwipeDirection(direction);
    setSelectedDate((current) => addMonthsClamped(current, direction));
  };

  const handleCalendarDragEnd = (_event, info) => {
    const swipeDistance = info.offset.x;
    const swipeVelocity = info.velocity.x;
    const distanceThreshold = 56;
    const velocityThreshold = 420;

    if (swipeDistance <= -distanceThreshold || swipeVelocity <= -velocityThreshold) {
      moveCalendarMonth(1);
      return;
    }

    if (swipeDistance >= distanceThreshold || swipeVelocity >= velocityThreshold) {
      moveCalendarMonth(-1);
    }
  };

  const createManualEvent = () => {
    saveEvent(manualForm);
    setManualOpen(false);
  };

  const refreshSchedules = () => {
    setSchedules(readScheduleLibrary());
  };

  const showCalendarForSchedule = (schedule) => {
    const record = normalizeScheduleRecord(schedule);
    const nextEvents = (record.blocks || []).map(convertScheduleBlockToMobileEvent);

    activateScheduleRecord(record);
    setEvents(nextEvents);
    persistEvents(nextEvents);
    setSelectedDate(nextEvents[0]?.date ? fromDateKey(nextEvents[0].date) : startOfDay(new Date()));
    refreshSchedules();
    setScheduleListOpen(false);
    setViewMode("calendar");
  };

  const openSchedule = (schedule) => {
    showCalendarForSchedule(schedule);
  };

  const createSchedule = () => {
    const nextRecord = createScheduleRecord({ name: "Weekly Schedule", blocks: [] });
    const records = [nextRecord, ...readRawScheduleLibrary().map(normalizeScheduleRecord)];
    writeScheduleLibrary(records);
    setSchedules(records);
    showCalendarForSchedule(nextRecord);
  };

  const deleteSchedule = (scheduleId) => {
    if (scheduleId === LEGACY_MOBILE_SCHEDULE_ID) {
      persistEvents([]);
      setEvents([]);
      setSchedules([]);
      toast.success("Schedule deleted.");
      return;
    }

    const nextRecords = readRawScheduleLibrary()
      .map(normalizeScheduleRecord)
      .filter((record) => record.id !== scheduleId);
    writeScheduleLibrary(nextRecords);
    setSchedules(nextRecords);

    if (getActiveScheduleId() === scheduleId) {
      const fallback = nextRecords[0];
      if (fallback) {
        activateScheduleRecord(fallback);
      } else {
        setActiveScheduleId("");
        try {
          localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify({ blocks: [], updatedAt: new Date().toISOString() }));
        } catch {
          // Local persistence is best-effort until Schedule backend storage is added.
        }
      }
    }

    toast.success("Schedule deleted.");
  };

  const renderCalendarDay = (date) => {
    const key = toDateKey(date);
    const selected = sameDate(date, selectedDate);
    const inMonth = date.getMonth() === selectedDate.getMonth();
    const hasEvents = eventDates.has(key);

    return (
      <button
        key={key}
        type="button"
        onClick={() => setSelectedDate(date)}
        className={cn(
          "relative flex min-h-[50px] flex-col items-center justify-center rounded-[20px] transition-colors duration-150 ease-out",
          selected
            ? "rounded-full border border-[#7DB7FF]/[0.18] bg-[rgba(25,59,104,0.94)] !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.20),inset_0_-1px_0_rgba(0,0,0,0.08)] backdrop-blur-[24px]"
            : isDark
              ? "text-white active:bg-white/[0.08]"
              : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]",
          !inMonth && isExpanded && !selected && "opacity-35",
        )}
      >
        <span className="text-[15px] font-extrabold leading-none">{date.getDate()}</span>
        <span className="absolute bottom-2 flex h-1.5 items-center gap-1">
          {hasEvents && <span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-white" : "bg-[var(--bm-primary)]")} />}
        </span>
      </button>
    );
  };

  if (viewMode === "home") {
    return (
    <div
      className={cn(
        "min-h-[100dvh] pb-[max(24px,env(safe-area-inset-bottom))]",
        isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]",
      )}
      data-testid="mobile-schedule-home-page"
    >
      <header
        className={cn(
          "sticky top-0 z-20 border-b px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl",
          isDark ? "border-white/10 bg-[var(--bm-bg-app)]/92" : "border-black/[0.08] bg-[var(--bm-bg-app)]/92",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => navigate(-1)} className="bm-mobile-glass-control" aria-label="Back to chat">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className={cn("text-xs font-medium", isDark ? "text-white/[0.48]" : "text-[var(--bm-text-secondary)]")}>
                BlueMind AI
              </p>
              <h1 className="truncate text-xl font-semibold">Schedule</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={createSchedule}
            className="bm-mobile-glass-control"
            style={{ color: appColor }}
            aria-label="Create schedule"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <ScheduleHomeInfoPanel
          debug={notificationDebug}
          busy={notificationBusy}
          isDark={isDark}
          appColor={appColor}
          onEnable={handleEnableNotifications}
          onRefresh={refreshNotificationStatus}
          onTest={handleSendTestNotification}
        />

        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search schedules"
            className={cn(
              inputClasses.search,
              typeClasses.body,
              "pl-14 pr-4 font-semibold backdrop-blur-[24px]",
              isDark
                ? `${mobileNeutralGlassSurfaceClass} placeholder:text-white/42`
                : "border-black/[0.06] bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_12px_28px_rgba(15,23,42,0.08)]",
            )}
            data-testid="mobile-schedule-search"
          />
        </div>

        <section className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredSchedules.map((schedule, index) => (
              <ScheduleHomeCard
                key={schedule.id}
                schedule={schedule}
                index={index}
                isDark={isDark}
                onOpen={openSchedule}
                onDelete={deleteSchedule}
              />
            ))}
          </AnimatePresence>

          {filteredSchedules.length === 0 && (
            <div className={cn("rounded-[24px] border p-5 text-sm", isDark ? "border-white/10 bg-white/[0.055] text-white/60" : "border-black/[0.08] bg-white text-[var(--bm-text-secondary)]")}>
              {schedules.length ? "No matching schedules." : "No schedules yet."}
            </div>
          )}
        </section>
      </main>
    </div>
    );
  }

  return (
    <main className={cn("min-h-screen overflow-x-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.875rem,env(safe-area-inset-top))]", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")}>
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => setViewMode("home")} className="bm-mobile-glass-control" aria-label="Back to schedules">
          <ArrowLeft className={iconClasses.button} />
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setScheduleListOpen(true)} className="bm-mobile-glass-control" aria-label="View all schedules">
            <CalendarDays className={iconClasses.button} />
          </button>
          <button type="button" onClick={() => setActionSheetOpen(true)} className="bm-mobile-glass-control" aria-label="Create schedule">
            <Plus className={iconClasses.button} />
          </button>
        </div>
      </header>

      <section className="mt-5">
        <button type="button" onClick={() => setIsExpanded((value) => !value)} className="flex w-full items-end justify-between text-left">
          <div>
            <p className={cn("text-[19px] font-extrabold leading-none", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{selectedYear}</p>
            <p className="mt-1 flex items-center gap-1 text-[26px] font-extrabold leading-none">
              {selectedMonth}
              <ChevronDown className={cn("h-5 w-5 transition-transform duration-200 ease-out", isExpanded && "rotate-180")} />
            </p>
          </div>
          <span className={cn("mb-1 rounded-full px-3 py-1.5 font-bold", typeClasses.small, isDark ? "bg-white/[0.08] text-white" : "bg-white text-[var(--bm-primary)] shadow-sm")}>
            {isExpanded ? "Month" : "Week"}
          </span>
        </button>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="text-center text-[10.5px] font-medium tracking-wide text-[var(--bm-text-muted)]/75">{day}</div>
          ))}
        </div>
        <motion.div
          initial={false}
          animate={{ height: isExpanded ? calendarExpandedHeight : calendarCollapsedHeight }}
          transition={{ duration: 0.34, ease: [0.25, 1, 0.5, 1] }}
          className="relative mt-1.5 overflow-hidden"
          style={{ willChange: "height" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          onDragEnd={handleCalendarDragEnd}
        >
          <AnimatePresence initial={false} custom={calendarSwipeDirection}>
            <motion.div
              key={`${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
              custom={calendarSwipeDirection}
              initial={(direction) => ({ x: direction > 0 ? "100%" : direction < 0 ? "-100%" : 0, y: calendarOffset })}
              animate={{ x: 0, y: calendarOffset, opacity: 1 }}
              exit={(direction) => ({ x: direction > 0 ? "-100%" : direction < 0 ? "100%" : 0, y: calendarOffset })}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-0 grid grid-cols-7 gap-1.5"
              style={{ willChange: "transform" }}
            >
              {monthDates.map(renderCalendarDay)}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </section>

      <section className="mt-6">
        <div className="mb-3">
          <div>
            <h1 className={cn("text-[22px] font-black", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{formatDateLabel(selectedDate)}</h1>
            <p className={cn("mt-1 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{selectedEvents.length ? `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}` : "No events yet"}</p>
          </div>
        </div>

        {selectedEvents.length ? (
          <>
            <div className="space-y-3">
              {selectedEvents.map((event) => {
                const Icon = getIcon(event.icon);
                const color = getColor(event.color);
                return (
                  <motion.div
                    key={event.id}
                    layout
                    whileTap={{ scale: 0.99 }}
                    className={cn("relative flex w-full items-center gap-3 rounded-[26px] border p-3 text-left shadow-sm transition-colors duration-150 ease-out", isDark ? mobileBlueGlassSurfaceClass : "border-[#2F7DF6]/[0.10] bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(15,85,170,0.08)] backdrop-blur-[18px]")}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: color }}>
                      <Icon className={iconClasses.button} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-black", typeClasses.body)}>{event.title}</span>
                      <span className={cn("mt-1 flex items-center gap-1.5 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDateLabel(fromDateKey(event.date))}, {event.startTime}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(clickEvent) => openEventMenu(event.id, clickEvent)}
                      className="bm-mobile-glass-control"
                      aria-label={`Open actions for ${event.title}`}
                    >
                      <MoreVertical className={iconClasses.button} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-2 py-4 text-center">
            <img
              src="/bluemind-schedule-empty-character.jpg"
              alt="BlueMind relaxing on a beach chair"
              className="mx-auto h-[168px] max-w-[238px] object-contain mix-blend-multiply brightness-[1.035] contrast-[1.06]"
              draggable={false}
            />
            <h2 className="mt-3 text-lg font-black">No events today!</h2>
            <p className={cn("mx-auto mt-2 max-w-[260px] font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-muted)]")}>
              Looks like a good day to relax and recharge.
            </p>
            <div className="mt-4 grid gap-2.5">
              <button type="button" onClick={openManualCreate} className={cn("h-11 rounded-2xl border font-bold transition-transform duration-150 ease-out active:scale-[0.99]", mobilePrimaryButtonGlassClass)}>
                {events.length ? "Add Schedule" : "Create Schedule"}
              </button>
              <button type="button" onClick={openAiCreate} className={cn("h-11 rounded-2xl border font-bold transition-transform duration-150 ease-out active:scale-[0.99]", isDark ? mobileNeutralGlassSurfaceClass : mobileNeutralButtonGlassClass)}>
                {events.length ? "Improve with BlueMind" : "Let BlueMind create it"}
              </button>
            </div>
          </div>
        )}
      </section>

      <ScheduleActionSheet open={actionSheetOpen} isDark={isDark} onClose={() => setActionSheetOpen(false)} onManual={openManualCreate} onAi={openAiCreate} />
      <ManualEventSheet open={manualOpen} isDark={isDark} form={manualForm} setForm={setManualForm} onClose={() => setManualOpen(false)} onCreate={createManualEvent} />
      <AiCreateSheet open={aiOpen} isDark={isDark} selectedDate={selectedDate} events={events} onClose={() => setAiOpen(false)} />
      <AllSchedulesModal
        open={scheduleListOpen}
        isDark={isDark}
        events={sortedEvents}
        onClose={() => {
          closeEventMenu();
          setScheduleListOpen(false);
        }}
        onOpenMenu={openEventMenu}
      />
      <ScheduleContextMenuPortal
        open={Boolean(eventMenuId && selectedMenuEvent)}
        rect={eventMenuRect}
        isDark={isDark}
        onClose={closeEventMenu}
        onEdit={() => {
          if (selectedMenuEvent) openEditEvent(selectedMenuEvent);
        }}
        onDelete={() => {
          if (selectedMenuEvent) deleteEvent(selectedMenuEvent.id);
        }}
      />
    </main>
  );
}
