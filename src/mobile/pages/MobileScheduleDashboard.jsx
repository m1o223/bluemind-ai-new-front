import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Clock3,
  Dumbbell,
  Edit3,
  GraduationCap,
  MoreVertical,
  Moon,
  Plus,
  Repeat,
  Sparkles,
  StickyNote,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, typeClasses } from "@/lib/interactions";

const STORAGE_KEY = "bluemind-mobile-schedule-dashboard-v1";

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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
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

function sortEvents(events) {
  return [...events].sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));
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

function createAiDraft(text, selectedDate) {
  const source = String(text || "").trim();
  const timeMatch = source.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  const hourMatch = source.match(/\b([01]?\d|2[0-3])\b/);
  const startTime = timeMatch
    ? `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}`
    : hourMatch
      ? `${String(hourMatch[1]).padStart(2, "0")}:00`
      : "18:00";
  const startHour = Number(startTime.split(":")[0]);
  const endTime = `${String(Math.min(startHour + 1, 23)).padStart(2, "0")}:${startTime.split(":")[1]}`;
  const lower = source.toLowerCase();
  const icon = lower.includes("gym") || lower.includes("workout") ? "gym" : lower.includes("exam") || lower.includes("study") || lower.includes("math") ? "study" : "calendar";
  const repeat = /\bevery|weekly|monday|tuesday|wednesday|thursday|friday|saturday|sunday\b/i.test(source) ? "Weekly" : "Never";
  const title = source
    .replace(/\b(add|create|make|schedule|reminder|for|my|on|at|every|weekly)\b/gi, " ")
    .replace(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: title ? title.slice(0, 54) : "BlueMind Schedule",
    date: toDateKey(selectedDate),
    startTime,
    endTime,
    duration: "",
    color: "blue",
    icon,
    reminder: "10 minutes before",
    repeat,
    notes: source,
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
              isDark ? "border-white/10 bg-[#202020] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]",
            )}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--bm-text-muted)]/35" />
            <div className="space-y-2">
              <button type="button" onClick={onManual} className={cn("flex min-h-[58px] w-full items-center gap-3 rounded-3xl px-4 text-left font-bold", isDark ? "bg-white/[0.07] active:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] active:bg-[var(--bm-active-bg)]")}>
                <Edit3 className={iconClasses.card} />
                <span>Create manually</span>
              </button>
              <button type="button" onClick={onAi} className="flex min-h-[58px] w-full items-center gap-3 rounded-3xl bg-[var(--bm-primary)] px-4 text-left font-bold text-white active:opacity-90">
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

function ManualEventSheet({ open, isDark, form, setForm, onClose, onCreate }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75]">
          <motion.button type="button" aria-label="Close manual event" className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              onCreate();
            }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn("absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[32px] border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]", isDark ? "border-white/10 bg-[#202020] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]")}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className={cn("font-black", typeClasses.cardTitle)}>Create event</h2>
                <p className={cn("mt-1 font-medium", typeClasses.small, "text-[var(--bm-text-muted)]")}>Add it to your mobile Schedule dashboard.</p>
              </div>
              <button type="button" onClick={onClose} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "bg-white/[0.08]" : "bg-[var(--bm-hover-bg)]")} aria-label="Close">
                <X className={iconClasses.button} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Event title</span>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Datakommunikation" className="bm-field bm-input-interactive h-12 w-full rounded-2xl px-4 font-semibold" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Date</span>
                  <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="bm-field bm-input-interactive h-12 w-full rounded-2xl px-3 font-semibold" />
                </label>
                <label className="block">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Duration</span>
                  <input value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} placeholder="Optional" className="bm-field bm-input-interactive h-12 w-full rounded-2xl px-3 font-semibold" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Start time</span>
                  <input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="bm-field bm-input-interactive h-12 w-full rounded-2xl px-3 font-semibold" />
                </label>
                <label className="block">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>End time</span>
                  <input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="bm-field bm-input-interactive h-12 w-full rounded-2xl px-3 font-semibold" />
                </label>
              </div>

              <div>
                <span className={cn("mb-2 block font-bold", typeClasses.small)}>Color</span>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button key={color.id} type="button" onClick={() => setForm((current) => ({ ...current, color: color.id }))} className={cn("flex h-11 items-center justify-center rounded-2xl border", form.color === color.id ? "border-[var(--bm-primary)]" : "border-transparent")} aria-label={color.label}>
                      <span className="h-6 w-6 rounded-full" style={{ backgroundColor: color.value }} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={cn("mb-2 block font-bold", typeClasses.small)}>Icon</span>
                <div className="grid grid-cols-4 gap-2">
                  {ICON_OPTIONS.map(({ id, label, Icon }) => (
                    <button key={id} type="button" onClick={() => setForm((current) => ({ ...current, icon: id }))} className={cn("flex h-12 items-center justify-center rounded-2xl border", form.icon === id ? "border-[var(--bm-primary)] bg-[var(--bm-active-bg)] text-[var(--bm-primary)]" : isDark ? "border-white/10 bg-white/[0.05]" : "border-[var(--bm-border)] bg-white")} aria-label={label}>
                      <Icon className={iconClasses.button} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><Bell className="h-3.5 w-3.5" /> Reminder</span>
                  <select value={form.reminder} onChange={(event) => setForm((current) => ({ ...current, reminder: event.target.value }))} className="bm-field bm-input-interactive h-12 w-full rounded-2xl px-3 font-semibold">
                    <option>None</option>
                    <option>10 minutes before</option>
                    <option>30 minutes before</option>
                    <option>1 hour before</option>
                  </select>
                </label>
                <label className="block">
                  <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><Repeat className="h-3.5 w-3.5" /> Repeat</span>
                  <select value={form.repeat} onChange={(event) => setForm((current) => ({ ...current, repeat: event.target.value }))} className="bm-field bm-input-interactive h-12 w-full rounded-2xl px-3 font-semibold">
                    <option>Never</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><StickyNote className="h-3.5 w-3.5" /> Notes</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes" className="bm-field bm-input-interactive min-h-[86px] w-full resize-none rounded-2xl px-4 py-3 font-semibold" />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={onClose} className={cn("h-12 rounded-2xl font-bold", isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>Cancel</button>
              <button type="submit" className="h-12 rounded-2xl bg-[var(--bm-primary)] font-bold text-white">Create</button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

function AiCreateSheet({ open, isDark, request, setRequest, draft, onClose, onSuggest, onCreate }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[76]">
          <motion.button type="button" aria-label="Close BlueMind create" className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={cn("absolute bottom-0 left-0 right-0 rounded-t-[32px] border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]", isDark ? "border-white/10 bg-[#202020] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]")}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bm-primary)] text-white">
                  <Sparkles className={iconClasses.card} />
                </span>
                <div>
                  <h2 className={cn("font-black", typeClasses.cardTitle)}>BlueMind create</h2>
                  <p className={cn("mt-1 font-medium", typeClasses.small, "text-[var(--bm-text-muted)]")}>Describe the schedule item naturally.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "bg-white/[0.08]" : "bg-[var(--bm-hover-bg)]")} aria-label="Close">
                <X className={iconClasses.button} />
              </button>
            </div>

            <textarea
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              placeholder="Add math study every Monday at 18:00"
              className="bm-field bm-input-interactive min-h-[104px] w-full resize-none rounded-3xl px-4 py-3 font-semibold"
            />
            <button type="button" onClick={onSuggest} className="mt-3 h-12 w-full rounded-2xl bg-[var(--bm-primary)] font-bold text-white">Suggest schedule</button>

            {draft && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 rounded-3xl border p-4", isDark ? "border-white/10 bg-white/[0.05]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                <p className={cn("mb-3 font-black", typeClasses.body)}>Confirm before saving</p>
                {[
                  ["Title", draft.title],
                  ["Date", draft.date],
                  ["Time", `${draft.startTime} - ${draft.endTime}`],
                  ["Repeat", draft.repeat],
                  ["Reminder", draft.reminder],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-1.5">
                    <span className={cn("font-bold text-[var(--bm-text-muted)]", typeClasses.small)}>{label}</span>
                    <span className={cn("text-right font-semibold", typeClasses.small)}>{value}</span>
                  </div>
                ))}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={onClose} className={cn("h-11 rounded-2xl font-bold", isDark ? "bg-white/[0.08]" : "bg-white")}>Cancel</button>
                  <button type="button" onClick={onCreate} className="h-11 rounded-2xl bg-[var(--bm-primary)] font-bold text-white">Create</button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function MobileScheduleDashboard() {
  const navigate = useNavigate();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState(readEvents);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(() => createInitialManualEvent(new Date()));
  const [editingEventId, setEditingEventId] = useState("");
  const [eventMenuId, setEventMenuId] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState("");
  const [aiDraft, setAiDraft] = useState(null);

  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);
  const selectedEvents = useMemo(() => sortEvents(events.filter((event) => event.date === toDateKey(selectedDate))), [events, selectedDate]);
  const monthDates = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const selectedWeekRow = Math.max(0, Math.floor(monthDates.findIndex((date) => sameDate(date, selectedDate)) / 7));
  const calendarRowHeight = 50;
  const calendarRowGap = 6;
  const calendarCollapsedHeight = calendarRowHeight;
  const calendarExpandedHeight = (calendarRowHeight * 6) + (calendarRowGap * 5);
  const calendarOffset = isExpanded ? 0 : -(selectedWeekRow * (calendarRowHeight + calendarRowGap));
  const selectedMonth = MONTH_NAMES[selectedDate.getMonth()];
  const selectedYear = selectedDate.getFullYear();

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
    setEventMenuId("");
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
    setEventMenuId("");
    toast.success("Schedule event deleted.");
  };

  const openAiCreate = () => {
    setActionSheetOpen(false);
    setAiRequest("");
    setAiDraft(null);
    setAiOpen(true);
  };

  const createManualEvent = () => {
    saveEvent(manualForm);
    setManualOpen(false);
  };

  const suggestAiEvent = () => {
    if (!aiRequest.trim()) {
      toast.error("Tell BlueMind what to create first.");
      return;
    }
    setAiDraft(createAiDraft(aiRequest, selectedDate));
  };

  const createAiEvent = () => {
    if (!aiDraft) return;
    saveEvent(aiDraft);
    setAiOpen(false);
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
          "relative flex min-h-[50px] flex-col items-center justify-center rounded-[18px] transition-colors duration-150 ease-out",
          selected
            ? "bg-[var(--bm-primary)] text-white shadow-[0_10px_22px_rgba(47,125,246,0.2)]"
            : isDark
              ? "text-white active:bg-white/[0.08]"
              : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]",
          !inMonth && isExpanded && !selected && "opacity-35",
        )}
      >
        <span className="text-[15px] font-extrabold leading-none">{date.getDate()}</span>
        <span className="mt-1 flex h-1.5 items-center gap-1">
          {hasEvents && <span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-white" : "bg-[var(--bm-primary)]")} />}
        </span>
      </button>
    );
  };

  return (
    <main className={cn("min-h-screen overflow-x-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.875rem,env(safe-area-inset-top))]", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[#F7FAFF] text-[var(--bm-text-primary)]")}>
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => navigate(-1)} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 ease-out", isDark ? "bg-white/[0.08] text-white active:bg-white/[0.13]" : "bg-white text-[var(--bm-text-primary)] shadow-sm active:bg-[var(--bm-hover-bg)]")} aria-label="Back">
          <ArrowLeft className={iconClasses.button} />
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsExpanded((value) => !value)} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 ease-out", isDark ? "bg-white/[0.08] text-white active:bg-white/[0.13]" : "bg-white text-[var(--bm-text-primary)] shadow-sm active:bg-[var(--bm-hover-bg)]")} aria-label="Toggle month calendar">
            <CalendarDays className={iconClasses.button} />
          </button>
          <button type="button" onClick={() => setActionSheetOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bm-primary)] text-white shadow-[0_10px_22px_rgba(47,125,246,0.22)] transition-transform duration-150 ease-out active:scale-[0.98]" aria-label="Create schedule">
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
          className="mt-1.5 overflow-hidden"
          style={{ willChange: "height" }}
        >
          <motion.div
            initial={false}
            animate={{ y: calendarOffset }}
            transition={{ duration: 0.34, ease: [0.25, 1, 0.5, 1] }}
            className="grid grid-cols-7 gap-1.5"
            style={{ willChange: "transform" }}
          >
            {monthDates.map(renderCalendarDay)}
          </motion.div>
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
          <div className="space-y-3">
            {selectedEvents.map((event) => {
              const Icon = getIcon(event.icon);
              const color = getColor(event.color);
              return (
                <motion.div
                  key={event.id}
                  layout
                  whileTap={{ scale: 0.99 }}
                  className={cn("relative flex w-full items-center gap-3 rounded-[26px] border p-3 text-left shadow-sm transition-colors duration-150 ease-out", isDark ? "border-white/10 bg-white/[0.06]" : "border-white bg-white")}
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
                    onClick={() => setEventMenuId((current) => current === event.id ? "" : event.id)}
                    className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out", isDark ? "text-white active:bg-white/[0.1]" : "text-[var(--bm-text-secondary)] active:bg-[var(--bm-hover-bg)]")}
                    aria-label={`Open actions for ${event.title}`}
                  >
                    <MoreVertical className={iconClasses.button} />
                  </button>

                  <AnimatePresence>
                    {eventMenuId === event.id && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-[60]"
                          onClick={() => setEventMenuId("")}
                          aria-label="Close event actions"
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                          className={cn("absolute right-3 top-14 z-[61] w-36 overflow-hidden rounded-2xl border p-1 shadow-xl", isDark ? "border-white/10 bg-[#202020] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]")}
                        >
                          <button
                            type="button"
                            onClick={() => openEditEvent(event)}
                            className={cn("flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold transition-colors", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[var(--bm-hover-bg)]")}
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEvent(event.id)}
                            className={cn("flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-red-500 transition-colors", isDark ? "hover:bg-white/[0.08]" : "hover:bg-red-50")}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className={cn("rounded-[30px] border p-4 text-center", isDark ? "border-white/10 bg-white/[0.05]" : "border-white bg-white shadow-sm")}>
            <div className="mx-auto flex h-[148px] max-w-[210px] items-end justify-center overflow-hidden">
              <img
                src="/bluemind-schedule-empty-character.jpg"
                alt="BlueMind relaxing on a beach chair"
                className="h-full w-full object-contain mix-blend-multiply"
                draggable={false}
              />
            </div>
            <h2 className="mt-3 text-lg font-black">No events today!</h2>
            <p className={cn("mx-auto mt-2 max-w-[260px] font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-muted)]")}>
              Looks like a good day to relax and recharge.
            </p>
            <div className="mt-4 grid gap-2.5">
              <button type="button" onClick={openManualCreate} className="h-11 rounded-2xl bg-[var(--bm-primary)] font-bold text-white transition-transform duration-150 ease-out active:scale-[0.99]">Create Schedule</button>
              <button type="button" onClick={openAiCreate} className={cn("h-11 rounded-2xl font-bold transition-transform duration-150 ease-out active:scale-[0.99]", isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-primary)]")}>
                Let BlueMind create it
              </button>
            </div>
          </div>
        )}
      </section>

      <ScheduleActionSheet open={actionSheetOpen} isDark={isDark} onClose={() => setActionSheetOpen(false)} onManual={openManualCreate} onAi={openAiCreate} />
      <ManualEventSheet open={manualOpen} isDark={isDark} form={manualForm} setForm={setManualForm} onClose={() => setManualOpen(false)} onCreate={createManualEvent} />
      <AiCreateSheet open={aiOpen} isDark={isDark} request={aiRequest} setRequest={setAiRequest} draft={aiDraft} onClose={() => setAiOpen(false)} onSuggest={suggestAiEvent} onCreate={createAiEvent} />
    </main>
  );
}
