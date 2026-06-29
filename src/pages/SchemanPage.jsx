import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Apple,
  BatteryCharging,
  Bed,
  BookOpen,
  BriefcaseBusiness,
  Brush,
  Bus,
  Calendar,
  Camera,
  Car,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Coffee,
  Copy,
  Droplets,
  Dumbbell,
  FileText,
  Footprints,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Leaf,
  MessageSquare,
  Mic,
  Moon,
  Music,
  Paperclip,
  PenLine,
  Plane,
  Plus,
  RefreshCcw,
  School,
  ShoppingBag,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
  Utensils,
  WashingMachine,
  X,
} from "lucide-react";
import { toast } from "sonner";

import BrandLogo from "@/components/BrandLogo";
import BlueMindSendButton from "@/components/BlueMindSendButton";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, typeClasses } from "@/lib/interactions";
import { streamChatMessage } from "@/services/chatService";
import { analyzeImage, getImageUrl, uploadChatImage } from "@/services/imageService";

const SCHEDULE_STORAGE_KEY = "bluemind-schedule-state-v2";
const SCHEDULE_TUTORIAL_KEY = "bluemind-schedule-tutorial-complete-v1";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 25 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
const ROW_HEIGHT = 48;
const ICON_OPTIONS = [
  "Book",
  "Study",
  "School",
  "University",
  "Pen",
  "Laptop",
  "Code",
  "Dumbbell",
  "Running",
  "Yoga",
  "Bed",
  "Moon",
  "Coffee",
  "Apple",
  "Meal",
  "Water",
  "Briefcase",
  "Meeting",
  "Calendar",
  "Clock",
  "Car",
  "Bus",
  "Shopping",
  "Cleaning",
  "Laundry",
  "Music",
  "Camera",
  "Family",
  "Health",
  "Rest",
  "Travel",
];
const SCHEDULE_COLORS = [
  { name: "Sky Blue", value: "#3BA7F5" },
  { name: "Emerald Green", value: "#34C88A" },
  { name: "Lavender Purple", value: "#9B7CF6" },
  { name: "Coral", value: "#FF7A66" },
  { name: "Soft Orange", value: "#F6A24D" },
  { name: "Rose", value: "#F472B6" },
  { name: "Mint", value: "#5ED7B7" },
  { name: "Indigo", value: "#6675F6" },
  { name: "Cyan", value: "#22C7D9" },
  { name: "Warm Yellow", value: "#F2C94C" },
  { name: "Teal", value: "#2FB7A3" },
  { name: "Deep Blue", value: "#2F6DEB" },
];
const COLOR_OPTIONS = SCHEDULE_COLORS.map((color) => color.value);
const SCHEDULE_ICON_OPTIONS = [
  { id: "Book", label: "Book", Icon: BookOpen },
  { id: "Study", label: "Study", Icon: GraduationCap },
  { id: "School", label: "School", Icon: School },
  { id: "University", label: "University", Icon: Landmark },
  { id: "Pen", label: "Pen", Icon: PenLine },
  { id: "Laptop", label: "Laptop", Icon: Laptop },
  { id: "Code", label: "Code", Icon: Code2 },
  { id: "Dumbbell", label: "Dumbbell", Icon: Dumbbell },
  { id: "Running", label: "Running", Icon: Footprints },
  { id: "Yoga", label: "Yoga", Icon: Leaf },
  { id: "Bed", label: "Bed", Icon: Bed },
  { id: "Moon", label: "Moon", Icon: Moon },
  { id: "Coffee", label: "Coffee", Icon: Coffee },
  { id: "Apple", label: "Apple", Icon: Apple },
  { id: "Meal", label: "Meal", Icon: Utensils },
  { id: "Water", label: "Water", Icon: Droplets },
  { id: "Briefcase", label: "Briefcase", Icon: BriefcaseBusiness },
  { id: "Meeting", label: "Meeting", Icon: Users },
  { id: "Calendar", label: "Calendar", Icon: Calendar },
  { id: "Clock", label: "Clock", Icon: Clock },
  { id: "Car", label: "Car", Icon: Car },
  { id: "Bus", label: "Bus", Icon: Bus },
  { id: "Shopping", label: "Shopping", Icon: ShoppingBag },
  { id: "Cleaning", label: "Cleaning", Icon: Brush },
  { id: "Laundry", label: "Laundry", Icon: WashingMachine },
  { id: "Music", label: "Music", Icon: Music },
  { id: "Camera", label: "Camera", Icon: Camera },
  { id: "Family", label: "Family", Icon: Home },
  { id: "Health", label: "Health", Icon: HeartPulse },
  { id: "Rest", label: "Rest", Icon: BatteryCharging },
  { id: "Travel", label: "Travel", Icon: Plane },
];
const SCHEDULE_TYPES = [
  {
    id: "study",
    title: "Study Schedule",
    description: "Create an intelligent study schedule.",
    icon: BookOpen,
    assistantPrompt: "The user selected Study Schedule. Start a study-schedule workflow. Ask about study days, start time, finish time, subjects, exams, and priority subjects. Keep it conversational.",
  },
  {
    id: "gym",
    title: "Gym Schedule",
    description: "Create a personalized workout schedule.",
    icon: Dumbbell,
    assistantPrompt: "The user selected Gym Schedule. Start a fitness schedule workflow. Ask about training days, training time, goals, current program, recovery, and experience level. Keep it conversational.",
  },
  {
    id: "nutrition",
    title: "Nutrition Schedule",
    description: "Create a healthy meal schedule.",
    icon: Apple,
    assistantPrompt: "The user selected Nutrition Schedule. Start a nutrition schedule workflow. Ask about current meal plan, goal, dietary restrictions, meal timing, and preferences. Keep it conversational.",
  },
  {
    id: "business",
    title: "Business Schedule",
    description: "Create work and employee schedules.",
    icon: BriefcaseBusiness,
    assistantPrompt: "The user selected Business Schedule. Start a business scheduling workflow. Ask about employees, working days, working hours, breaks, shift preferences, and coverage needs. Keep it conversational.",
  },
];
const TUTORIAL_STEPS = [
  {
    title: "This is your weekly planner.",
    body: "The grid starts empty so you can build a clean schedule from scratch.",
  },
  {
    title: "Design manually.",
    body: "Use manual mode to add schedule blocks directly into the weekly grid.",
  },
  {
    title: "Use BlueMind AI.",
    body: "BlueMind can help you think through the schedule before activities are generated.",
  },
  {
    title: "You're ready.",
    body: "Start with an empty weekly schedule and build from here.",
  },
];

function readScheduleState() {
  try {
    const value = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) || "null");
    return value && typeof value === "object" ? { blocks: Array.isArray(value.blocks) ? value.blocks : [] } : { blocks: [] };
  } catch {
    return { blocks: [] };
  }
}

function writeScheduleState(state) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local persistence is best-effort until Schedule backend storage is added.
  }
}

function getTextOnColor(value) {
  if (!value || !String(value).startsWith("#")) return "#FFFFFF";
  const normalized = value.replace("#", "").padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  const red = ((number >> 16) & 255) / 255;
  const green = ((number >> 8) & 255) / 255;
  const blue = (number & 255) / 255;
  const luminance = [red, green, blue]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return luminance > 0.52 ? "var(--bm-text-primary)" : "#FFFFFF";
}

function getScheduleIconOption(iconId) {
  return SCHEDULE_ICON_OPTIONS.find((item) => item.id === iconId) || SCHEDULE_ICON_OPTIONS[0];
}

function timeToIndex(value) {
  const hour = Number.parseInt(String(value).slice(0, 2), 10);
  return Number.isFinite(hour) ? Math.max(0, Math.min(24, hour)) : 0;
}

function hexToRgba(value, alpha = 1) {
  if (!value || !String(value).startsWith("#")) return `rgba(37, 99, 235, ${alpha})`;
  const normalized = value.replace("#", "").padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildScheduleContext(blocks) {
  if (!blocks.length) return "The weekly schedule grid is currently empty.";
  return blocks.map((block) => (
    `- ${block.name}: ${block.start} to ${block.end} on ${block.days.join(", ")}`
  )).join("\n");
}

function buildSchedulePrompt({ messages, latestText, blocks, initial = false }) {
  const recentContext = messages
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "BlueMind" : "User"}: ${message.content}`)
    .join("\n");

  return [
    "You are BlueMind AI inside the Schedule feature.",
    "Use the same real BlueMind AI reasoning style as the main chat, but focus only on helping the user design a weekly schedule.",
    "Do not behave like a form. Understand answers, ask follow-up questions, detect missing information, recommend improvements, and explain why.",
    "When exact schedule data has been imported from an upload, acknowledge it and help improve it. Do not invent calendar blocks when days, times, or activities are missing.",
    "Ask concise, useful questions based on what the user wants to build.",
    "",
    `Current schedule blocks:\n${buildScheduleContext(blocks)}`,
    recentContext ? `Conversation so far:\n${recentContext}` : "Conversation so far: none.",
    initial
      ? (latestText || "Start the conversation now with a friendly opener. Ask what kind of schedule the user wants to build.")
      : `Current user message: ${latestText}`,
  ].filter(Boolean).join("\n\n");
}

function formatScheduleFileSize(size) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeScheduleTime(value) {
  const match = String(value || "").match(/(\d{1,2})(?::|\.)(\d{2})|(\d{1,2})/);
  if (!match) return "";
  const hour = Number(match[1] ?? match[3]);
  const minute = Number(match[2] ?? 0);
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) return "";
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function guessScheduleIcon(activity = "") {
  const text = activity.toLowerCase();
  if (/sleep|nap|bed/i.test(text)) return "Bed";
  if (/rest|recover|break/i.test(text)) return "Rest";
  if (/gym|workout|train|cardio|run|fitness/i.test(text)) return "Dumbbell";
  if (/meal|food|breakfast|lunch|dinner|nutrition/i.test(text)) return "Apple";
  if (/water|drink|hydrate/i.test(text)) return "Water";
  if (/work|meeting|business|shift|office/i.test(text)) return "Briefcase";
  if (/code|program|software|debug/i.test(text)) return "Code";
  if (/study|read|math|physics|lesson|school|homework|exam/i.test(text)) return "Study";
  if (/drive|car|commute/i.test(text)) return "Car";
  if (/bus|transit/i.test(text)) return "Bus";
  if (/clean/i.test(text)) return "Cleaning";
  if (/laundry/i.test(text)) return "Laundry";
  return "Calendar";
}

function parseScheduleBlocksFromText(text) {
  const content = String(text || "");
  if (!content.trim()) return [];

  const blocks = [];
  const dayPattern = DAYS.join("|");
  const lines = content
    .split(/\n|;|\r/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const dayMatch = line.match(new RegExp(`\\b(${dayPattern})\\b`, "i"));
    const rangeMatch = line.match(/(\d{1,2}(?::|\.)?\d{0,2})\s*(?:-|–|—|to|until)\s*(\d{1,2}(?::|\.)?\d{0,2})/i);
    if (!dayMatch || !rangeMatch) return;

    const start = normalizeScheduleTime(rangeMatch[1]);
    const end = normalizeScheduleTime(rangeMatch[2]);
    if (!start || !end || timeToIndex(end) <= timeToIndex(start)) return;

    const day = DAYS.find((item) => item.toLowerCase() === dayMatch[1].toLowerCase());
    const name = line
      .replace(dayMatch[0], "")
      .replace(rangeMatch[0], "")
      .replace(/[:|\-–—]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48) || "Imported activity";

    blocks.push({
      id: `imported-${Date.now().toString(36)}-${index}`,
      name,
      start,
      end,
      days: [day],
      color: COLOR_OPTIONS[blocks.length % COLOR_OPTIONS.length],
      icon: guessScheduleIcon(name),
    });
  });

  return blocks.slice(0, 32);
}

async function extractReadableFileText(file) {
  const raw = await file.text().catch(() => "");
  return raw
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 9000);
}

function ScheduleButton({ children, active = false, appColor, accentText, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        iconClasses.iconText,
        typeClasses.small,
        active ? "text-white shadow-[0_12px_30px_rgba(25,59,104,0.20)]" : interactionClasses.control,
        className,
      )}
      style={active ? { backgroundColor: appColor, color: accentText } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

function WeeklyGrid({ isDark, blocks, editMode, onAddCell, onRequestDelete }) {
  const lineClass = isDark ? "border-white/[0.07]" : "border-[var(--bm-border)]";
  const headerBg = isDark ? "bg-white/[0.045]" : "bg-[var(--bm-bg-elevated)]";
  const cellBg = isDark ? "bg-transparent" : "bg-white";
  const getCellBlock = (day, hour) => {
    const hourIndex = timeToIndex(hour);
    return blocks.find((block) => (
      block.days.includes(day)
      && hourIndex >= timeToIndex(block.start)
      && hourIndex < timeToIndex(block.end)
    ));
  };

  const getCellPosition = (block, hour) => {
    const hourIndex = timeToIndex(hour);
    const startIndex = timeToIndex(block.start);
    const endIndex = Math.max(startIndex + 1, timeToIndex(block.end));
    return {
      isFirst: hourIndex === startIndex,
      isLast: hourIndex === endIndex - 1,
    };
  };

  return (
    <section className={cn("h-full overflow-hidden rounded-[28px] border shadow-sm", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
      <div className="flex h-full flex-col">
        <div className={cn("grid grid-cols-[76px_repeat(7,minmax(116px,1fr))] border-b", lineClass, headerBg)}>
          <div className={cn("sticky left-0 z-40 flex h-14 items-center justify-center border-r font-bold", typeClasses.small, lineClass, headerBg, "text-[var(--bm-text-muted)]")}>Time</div>
          {DAYS.map((day) => (
            <div key={day} className={cn("flex h-14 items-center justify-center border-r px-3 text-center font-extrabold last:border-r-0", typeClasses.small, lineClass, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
              {day}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className="grid min-w-[900px] grid-cols-[76px_repeat(7,minmax(116px,1fr))]"
            style={{ gridTemplateRows: `repeat(${HOURS.length}, ${ROW_HEIGHT}px)` }}
          >
            {HOURS.map((hour) => (
              <div key={`time-${hour}`} className="contents">
                <div className={cn(
                  "sticky left-0 z-20 flex items-start justify-center border-b border-r pt-2 font-semibold",
                  typeClasses.small,
                  lineClass,
                  isDark ? "bg-[var(--bm-bg-card)]" : "bg-white",
                  "text-[var(--bm-text-muted)]",
                )}>
                  <span>{hour}</span>
                </div>
                {DAYS.map((day) => {
                  const block = getCellBlock(day, hour);
                  const occupied = Boolean(block);
                  const position = block ? getCellPosition(block, hour) : null;
                  const ScheduleIcon = block ? getScheduleIconOption(block.icon).Icon : null;
                  const activityTextColor = block ? getTextOnColor(block.color) : undefined;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      aria-label={`${day} ${hour}`}
                      className={cn(
                        "relative border-b border-r last:border-r-0",
                        lineClass,
                        !occupied && cellBg,
                        occupied && "overflow-hidden",
                      )}
                      style={occupied ? {
                        background: `linear-gradient(135deg, ${hexToRgba(block.color, isDark ? 0.84 : 0.76)}, ${hexToRgba(block.color, isDark ? 0.72 : 0.62)})`,
                        color: activityTextColor,
                        boxShadow: position.isFirst ? `inset 0 1px 0 ${hexToRgba("#FFFFFF", 0.18)}` : undefined,
                      } : undefined}
                    >
                      {editMode && hour !== "24:00" && !occupied && (
                      <button
                        type="button"
                        onClick={() => onAddCell(day, hour)}
                        className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bm-primary)] text-white opacity-80 shadow-sm transition hover:opacity-100"
                        aria-label={`Add activity on ${day} at ${hour}`}
                      >
                        <Plus className="h-3 w-3 stroke-[3]" />
                      </button>
                      )}
                      {occupied && (
                        <div
                          className={cn(
                            "flex h-full min-w-0 items-center px-3",
                            position.isFirst ? "justify-between gap-2 rounded-t-[14px]" : "justify-center",
                            position.isLast && "rounded-b-[14px]",
                          )}
                        >
                          {position.isFirst ? (
                            <>
                              <div className="flex min-w-0 items-center gap-2">
                                {ScheduleIcon && <ScheduleIcon className="h-4 w-4 shrink-0 stroke-[2.4]" aria-hidden="true" />}
                                <span className={cn("truncate font-extrabold leading-tight", typeClasses.small)}>{block.name}</span>
                              </div>
                              {editMode && (
                                <button
                                  type="button"
                                  onClick={() => onRequestDelete(block)}
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/25 text-lg font-black leading-none text-white transition hover:bg-black/40"
                                  aria-label={`Delete ${block.name}`}
                                >
                                  -
                                </button>
                              )}
                            </>
                          ) : (
                            ScheduleIcon && <ScheduleIcon className="h-4 w-4 stroke-[2.4]" aria-hidden="true" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BlockModal({ isDark, appColor, accentText, initialDay, initialStart, onClose, onSave }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState(initialStart || "00:00");
  const [end, setEnd] = useState(HOURS[Math.min(timeToIndex(initialStart || "00:00") + 1, 24)]);
  const [days, setDays] = useState(initialDay ? [initialDay] : []);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [singleSlot, setSingleSlot] = useState(true);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const selectedIconOption = getScheduleIconOption(icon);
  const SelectedIcon = selectedIconOption.Icon;
  const nextHour = HOURS[Math.min(timeToIndex(start) + 1, 24)];

  const toggleDay = (day) => {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  };

  useEffect(() => {
    if (singleSlot || timeToIndex(end) <= timeToIndex(start)) {
      setEnd(nextHour);
    }
  }, [end, nextHour, singleSlot, start]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Activity name is required.");
      return;
    }
    if (!days.length) {
      toast.error("Select at least one day.");
      return;
    }
    const finalEnd = singleSlot ? nextHour : end;
    if (timeToIndex(finalEnd) <= timeToIndex(start)) {
      toast.error("End time must be after start time.");
      return;
    }

    onSave({
      id: `block-${Date.now().toString(36)}`,
      name: name.trim(),
      start,
      end: finalEnd,
      days,
      color,
      icon,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-xl rounded-[30px] border p-5 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>Create Schedule Block</h2>
          <button type="button" onClick={onClose} className={cn("rounded-full p-2", interactionClasses.control)} aria-label="Close block form">
            <X className={iconClasses.button} />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className={cn("font-bold", typeClasses.small)}>Activity name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sleep, Study, Gym..." className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Start time</span>
              <select value={start} onChange={(event) => setStart(event.target.value)} className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")}>
                {HOURS.slice(0, -1).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
            <div className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Use only this time slot?</span>
              <div className={cn("grid h-12 grid-cols-2 gap-1 rounded-2xl border p-1", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                {[
                  { label: "Yes", value: true },
                  { label: "No", value: false },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSingleSlot(item.value)}
                    className={cn("rounded-xl font-extrabold transition-all duration-200", typeClasses.small, singleSlot === item.value ? "text-white shadow-sm" : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)]")}
                    style={singleSlot === item.value ? { backgroundColor: appColor, color: accentText } : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className={cn("font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                {singleSlot ? `${start} - ${nextHour}` : "Choose a longer time range below."}
              </span>
            </div>
          </div>

          {!singleSlot && (
            <label className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>End time</span>
              <select value={end} onChange={(event) => setEnd(event.target.value)} className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")}>
                {HOURS.slice(timeToIndex(start) + 1).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
          )}

          <div className="grid gap-2">
            <span className={cn("font-bold", typeClasses.small)}>Days</span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn("rounded-full px-3 py-2 font-bold", typeClasses.small, days.includes(day) ? "text-white" : interactionClasses.control)}
                  style={days.includes(day) ? { backgroundColor: appColor, color: accentText } : undefined}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Color</span>
              <div className="grid grid-cols-6 gap-2">
                {SCHEDULE_COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setColor(item.value)}
                    className={cn(
                      "group relative h-10 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5",
                      color === item.value ? "border-white shadow-md ring-2 ring-[var(--bm-primary)]" : isDark ? "border-white/[0.10]" : "border-[var(--bm-border)]",
                    )}
                    style={{ backgroundColor: item.value }}
                    aria-label={`Use ${item.name}`}
                    title={item.name}
                  >
                    {color === item.value && (
                      <Check className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 stroke-[3] text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Icon</span>
              <button
                type="button"
                onClick={() => setIconPickerOpen((value) => !value)}
                className={cn(
                  "flex h-12 items-center justify-between gap-3 rounded-2xl border px-4 font-extrabold transition-all duration-200",
                  isDark ? "border-white/[0.08] bg-white/[0.045] text-white hover:bg-white/[0.07]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)] hover:bg-white",
                )}
                aria-expanded={iconPickerOpen}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <SelectedIcon className="h-5 w-5 shrink-0 stroke-[2.4]" />
                  <span className="truncate">{selectedIconOption.label}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", iconPickerOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {iconPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("absolute left-0 right-0 top-[76px] z-20 max-h-64 overflow-y-auto rounded-2xl border p-2 shadow-xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)]" : "border-[var(--bm-border)] bg-white")}
                  >
                    <div className="grid grid-cols-2 gap-1.5">
                      {SCHEDULE_ICON_OPTIONS.map((item) => {
                        const Icon = item.Icon;
                        const selected = icon === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setIcon(item.id);
                              setIconPickerOpen(false);
                            }}
                            className={cn(
                              "flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left font-bold transition-all duration-200",
                              typeClasses.small,
                              selected ? "text-white" : interactionClasses.menuItem,
                            )}
                            style={selected ? { backgroundColor: appColor, color: accentText } : undefined}
                          >
                            <Icon className="h-4 w-4 shrink-0 stroke-[2.4]" />
                            <span className="truncate">{item.label}</span>
                            {selected && <Check className="ml-auto h-4 w-4 shrink-0 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          className={cn("mt-6 h-12 w-full rounded-2xl font-extrabold shadow-[0_12px_30px_rgba(25,59,104,0.20)]", typeClasses.body)}
          style={{ backgroundColor: appColor, color: accentText }}
        >
          Save
        </button>
      </motion.div>
    </div>
  );
}

function DeleteActivityDialog({ isDark, appColor, accentText, activity, onCancel, onDelete }) {
  if (!activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-sm rounded-[28px] border p-6 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <h3 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>Delete activity?</h3>
        <p className={cn("mt-3 font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>
          Are you sure you want to delete this activity?
        </p>
        <p className={cn("mt-3 rounded-2xl px-4 py-3 font-extrabold", typeClasses.body, isDark ? "bg-white/[0.06]" : "bg-[var(--bm-bg-elevated)]")}>
          {activity.name}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={cn("rounded-2xl px-4 py-3 font-bold", typeClasses.small, interactionClasses.control)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDelete(activity)}
            className={cn("rounded-2xl px-5 py-3 font-bold text-white shadow-[0_12px_30px_rgba(220,38,38,0.22)]", typeClasses.small)}
            style={{ backgroundColor: "var(--bm-error)", color: "#FFFFFF" }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ScheduleTypeDialog({ isDark, appColor, accentText, onClose, onSelect }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-3xl rounded-[30px] border p-5 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>Create Custom Schedule</p>
            <h2 className={cn("mt-1 font-extrabold tracking-tight", typeClasses.sectionTitle)}>Choose a schedule type</h2>
          </div>
          <button type="button" onClick={onClose} className={cn("rounded-full p-2", interactionClasses.control)} aria-label="Close schedule type selection">
            <X className={iconClasses.button} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SCHEDULE_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={cn("group rounded-[24px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg", isDark ? "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.07]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] hover:bg-white")}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_12px_26px_rgba(25,59,104,0.18)]"
                  style={{ backgroundColor: appColor, color: accentText }}
                >
                  <Icon className={iconClasses.card} />
                </span>
                <span className={cn("mt-4 block font-extrabold", typeClasses.cardTitle)}>{item.title}</span>
                <span className={cn("mt-2 block font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>{item.description}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function ScheduleAssistant({ isDark, appColor, blocks, startSignal, startContext, chatVisible, onImportBlocks }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const sendLockRef = useRef(false);
  const lastStartSignalRef = useRef(0);
  const pendingAttachmentsRef = useRef([]);
  const cameraInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const textareaRef = useRef(null);
  const canSend = Boolean(input.trim() || pendingAttachments.length) && !isSending && !isUploading;
  const hasConversation = messages.length > 0;

  const resizeInput = (element) => {
    if (!element) return;
    element.style.height = "auto";
    const nextHeight = Math.min(Math.max(element.scrollHeight, 52), 112);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > 112 ? "auto" : "hidden";
  };

  const resetConversation = () => {
    setMessages([]);
    setConversationId("");
    setInput("");
    setPendingAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      });
      return [];
    });
    setAddMenuOpen(false);
    sendLockRef.current = false;
  };

  const streamAssistant = async ({ latestText = "", initial = false, userMessage = null, imageIds = [] }) => {
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    setIsSending(true);

    const assistantId = `assistant-${Date.now()}`;
    const baseMessages = userMessage ? [...messages, userMessage] : messages;

    setMessages((current) => [
      ...current,
      ...(userMessage ? [userMessage] : []),
      { id: assistantId, role: "assistant", content: "", isThinking: true },
    ]);

    let streamedText = "";
    try {
      await streamChatMessage({
        message: buildSchedulePrompt({ messages: baseMessages, latestText, blocks, initial }),
        imageIds,
        conversationId,
        mode: "work",
        metadata: {
          source: "schedule",
          schedule: true,
          scheduleAssistant: true,
          uploadedImageIds: imageIds,
          scheduleBlocks: blocks.map(({ id, name, start, end, days, color, icon }) => ({ id, name, start, end, days, color, icon })),
        },
        onReady: (payload) => {
          const nextConversationId = payload?.conversation?.conversationId;
          if (nextConversationId) setConversationId(nextConversationId);
        },
        onAiStart: () => {
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, isThinking: false } : message
          )));
        },
        onDelta: (payload) => {
          const token = payload?.token || "";
          if (!token) return;
          streamedText += token;
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, content: streamedText, isThinking: false } : message
          )));
        },
        onComplete: (payload) => {
          const finalText = streamedText.trim() || payload?.message?.content || "";
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, content: finalText, isThinking: false } : message
          )));
        },
      });
    } catch (error) {
      console.error("Schedule assistant stream failed", error);
      setMessages((current) => current.map((message) => (
        message.id === assistantId
          ? { ...message, content: "I could not connect to BlueMind AI right now. Please try again.", isThinking: false, error: true }
          : message
      )));
      toast.error(error?.message || "Schedule AI request failed.");
    } finally {
      setIsSending(false);
      sendLockRef.current = false;
    }
  };

  useEffect(() => {
    if (!startSignal || startSignal === lastStartSignalRef.current) return;
    lastStartSignalRef.current = startSignal;
    streamAssistant({
      initial: true,
      latestText: startContext || "Start the conversation now with a friendly opener. Ask what kind of schedule the user wants to build.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => () => {
    pendingAttachmentsRef.current.forEach((attachment) => {
      if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
    });
  }, []);

  const removePendingAttachment = (attachmentId) => {
    setPendingAttachments((current) => {
      const attachment = current.find((item) => item.id === attachmentId);
      if (attachment?.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      return current.filter((item) => item.id !== attachmentId);
    });
  };

  const addPendingFiles = (files, preferredType = "mixed", source = "upload") => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    setAddMenuOpen(false);

    const nextAttachments = [];
    selectedFiles.slice(0, 4).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if ((preferredType === "image" || preferredType === "camera" || preferredType === "mixed") && isImage) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
          toast.error(`${file.name} is not a supported image. Use PNG, JPG, JPEG, or WEBP.`);
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 8MB.`);
          return;
        }
        nextAttachments.push({
          id: `pending-image-${Date.now()}-${file.name}-${file.size}`,
          file,
          name: file.name || (source === "camera" ? "Camera photo" : "Uploaded image"),
          type: "image",
          source,
          localPreviewUrl: URL.createObjectURL(file),
        });
        return;
      }

      if ((preferredType === "pdf" || preferredType === "mixed") && isPdf) {
        nextAttachments.push({
          id: `pending-pdf-${Date.now()}-${file.name}-${file.size}`,
          file,
          name: file.name,
          type: "pdf",
          size: file.size,
          source,
        });
        return;
      }

      toast.error(`${file.name} is not supported here.`);
    });

    if (!nextAttachments.length) return;
    setPendingAttachments((current) => [...current, ...nextAttachments].slice(0, 4));
  };

  const processAttachmentsForSend = async (attachments) => {
    const messageAttachments = [];
    const imageIds = [];
    const contextParts = [];
    const imageFiles = attachments.filter((attachment) => attachment.type === "image");
    const pdfFiles = attachments.filter((attachment) => attachment.type === "pdf");

    if (imageFiles.length) {
      const uploadedImages = [];
      const analyses = [];
      for (const attachment of imageFiles) {
        try {
          const image = await uploadChatImage(attachment.file);
          const analysis = await analyzeImage(
            image.id,
            "Analyze this schedule image. Extract readable text, days, activities, start times, end times, and any weekly planning information. Be concise but include exact times when visible.",
          );
          if (analysis?.analysis) analyses.push(analysis.analysis);
          const uploaded = {
            id: image.id,
            imageId: image.id,
            name: image.originalName || attachment.name || "Uploaded image",
            type: "image",
            previewUrl: getImageUrl(image.id),
          };
          uploadedImages.push(uploaded);
          messageAttachments.push(uploaded);
          imageIds.push(image.id);
        } catch (error) {
          toast.error(error?.message || "Image upload failed.");
        }
      }

      const analysisText = analyses
        .map((analysis) => [analysis.description, analysis.extractedText, Array.isArray(analysis.objects) ? analysis.objects.join(", ") : ""].filter(Boolean).join("\n"))
        .filter(Boolean)
        .join("\n\n");
      const importedBlocks = parseScheduleBlocksFromText(analysisText);
      if (importedBlocks.length > 0) {
        onImportBlocks?.(importedBlocks);
        toast.success(`${importedBlocks.length} schedule ${importedBlocks.length === 1 ? "block" : "blocks"} imported from image.`);
      } else if (uploadedImages.length) {
        toast.info("BlueMind analyzed the image. I could not safely auto-place blocks, so the assistant will use it as context.");
      }

      if (uploadedImages.length) {
        const source = uploadedImages.some((image) => image.name.toLowerCase().includes("camera")) ? "camera photo" : "schedule image";
        contextParts.push([
          `Analyze the uploaded ${source} (${uploadedImages.length === 1 ? uploadedImages[0].name : `${uploadedImages.length} images`}) and use it as context to help build or improve this Schedule.`,
          importedBlocks.length > 0
            ? `${importedBlocks.length} block(s) were automatically imported into the Schedule workspace. Ask whether the user wants improvements or optimization.`
            : "No schedule blocks were safely auto-imported. Use the image context to guide the user.",
          analysisText ? `Image analysis:\n${analysisText}` : "",
        ].filter(Boolean).join("\n\n"));
      }
    }

    if (pdfFiles.length) {
      const extracted = [];
      for (const attachment of pdfFiles.slice(0, 3)) {
        const text = await extractReadableFileText(attachment.file);
        extracted.push({ attachment, text });
        messageAttachments.push({
          id: attachment.id,
          name: attachment.name,
          type: "pdf",
          size: attachment.size,
        });
      }

      const combinedText = extracted.map(({ attachment, text }) => `File: ${attachment.name}\n${text || "No readable embedded text was extracted."}`).join("\n\n");
      const importedBlocks = parseScheduleBlocksFromText(combinedText);
      if (importedBlocks.length > 0) {
        onImportBlocks?.(importedBlocks);
        toast.success(`${importedBlocks.length} schedule ${importedBlocks.length === 1 ? "block" : "blocks"} imported from PDF.`);
      } else {
        toast.info("BlueMind will analyze the PDF text. If the PDF is scanned, upload an image for stronger schedule detection.");
      }

      const names = pdfFiles.map((attachment) => `${attachment.name}${formatScheduleFileSize(attachment.size) ? ` (${formatScheduleFileSize(attachment.size)})` : ""}`).join(", ");
      contextParts.push([
        `The user uploaded PDF schedule file(s): ${names}. Analyze the extracted text and help build or improve the Schedule.`,
        importedBlocks.length > 0
          ? `${importedBlocks.length} block(s) were automatically imported into the Schedule workspace. Ask whether the user wants improvements or optimization.`
          : "If the extracted PDF text is not enough to place exact blocks, ask only for the missing days/times/activities.",
        `Extracted PDF text:\n${combinedText || "No readable text extracted."}`,
      ].join("\n\n"));
    }

    return { messageAttachments, imageIds, contextText: contextParts.filter(Boolean).join("\n\n") };
  };

  const copyAssistantMessage = async (content) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied.");
    } catch {
      toast.error("Could not copy message.");
    }
  };

  const retryAssistantMessage = (messageId) => {
    const messageIndex = messages.findIndex((message) => message.id === messageId);
    const previousUserMessage = messages.slice(0, messageIndex).reverse().find((message) => message.role === "user");
    streamAssistant({
      latestText: previousUserMessage?.content
        ? `Regenerate the previous Schedule answer for this user message: ${previousUserMessage.content}`
        : "Regenerate the previous Schedule answer.",
    });
  };

  const submit = async () => {
    if (!canSend || sendLockRef.current) return;
    sendLockRef.current = true;
    const value = input.trim();
    const attachmentsToSend = pendingAttachments;
    setInput("");
    setPendingAttachments([]);
    window.requestAnimationFrame(() => resizeInput(textareaRef.current));
    setAddMenuOpen(false);
    setIsUploading(Boolean(attachmentsToSend.length));

    let processed = { messageAttachments: [], imageIds: [], contextText: "" };
    try {
      if (attachmentsToSend.length) {
        processed = await processAttachmentsForSend(attachmentsToSend);
      }
    } catch (error) {
      console.error("Schedule attachment preparation failed", error);
      toast.error(error?.message || "Attachment preparation failed.");
      setIsUploading(false);
      sendLockRef.current = false;
      return;
    } finally {
      attachmentsToSend.forEach((attachment) => {
        if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      });
      setIsUploading(false);
    }

    const attachmentLabel = processed.messageAttachments.length
      ? processed.messageAttachments.map((attachment) => attachment.name).join(", ")
      : "";
    const displayText = value || (attachmentLabel ? `Uploaded ${attachmentLabel}` : "");
    const latestText = [value, processed.contextText].filter(Boolean).join("\n\n");
    sendLockRef.current = false;
    streamAssistant({
      latestText: latestText || displayText,
      imageIds: processed.imageIds,
      userMessage: {
        id: `user-${Date.now()}`,
        role: "user",
        content: displayText,
        attachments: processed.messageAttachments,
      },
    });
  };

  const handleUploadFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    addPendingFiles(selectedFiles, "image", "upload");
  };

  const handlePdfFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    addPendingFiles(selectedFiles, "pdf", "upload");
  };

  if (!chatVisible) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn("self-start flex h-[60vh] min-h-[430px] max-h-[680px] w-full flex-col rounded-[28px] border p-4 shadow-sm", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo
            showName={false}
            small
            logoClassName="h-8 w-8"
            className="shrink-0"
          />
          <p className={cn("truncate font-extrabold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind AI</p>
        </div>
        <button
          type="button"
          onClick={resetConversation}
          className={cn("shrink-0 rounded-full px-3 py-1.5 font-extrabold", typeClasses.small, interactionClasses.control)}
        >
          New Chat
        </button>
      </header>

      {!hasConversation && (
        <div className="flex min-h-0 flex-1 flex-col justify-center py-6">
          <h2 className={cn("text-center font-extrabold tracking-tight", typeClasses.sectionTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
            Are you ready?
          </h2>
          <p className={cn("mx-auto mt-3 max-w-[340px] text-center font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>
            BlueMind is ready to help you build your perfect schedule.
          </p>
        </div>
      )}

      <div className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto pr-1", hasConversation ? "mt-4" : "hidden")}>
        {hasConversation && messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" ? (
                <div className="w-full px-1">
                  <p className={cn("font-extrabold", typeClasses.small, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind</p>
                  {message.isThinking ? (
                    <p className={cn("mt-2 font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>BlueMind is thinking...</p>
                  ) : (
                    <>
                      <p className={cn("mt-2 whitespace-pre-wrap font-semibold leading-7", typeClasses.body, message.error ? "text-[var(--bm-error)]" : "text-[var(--bm-text-primary)]")}>{message.content}</p>
                      {!message.error && message.content && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <button type="button" onClick={() => toast.success("Thanks for the feedback.")} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Like response">
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => toast.info("Feedback noted.")} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Dislike response">
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => copyAssistantMessage(message.content)} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Copy response">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => retryAssistantMessage(message.id)} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.control)} aria-label="Retry response">
                            <RefreshCcw className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex max-w-[88%] flex-col items-end gap-2">
                  {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                    <div className="flex max-w-full flex-wrap justify-end gap-2">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.id || attachment.name} className={cn("overflow-hidden rounded-2xl border", isDark ? "border-white/[0.12] bg-white/[0.06]" : "border-[var(--bm-border)] bg-white")}>
                          {attachment.type === "image" ? (
                            <img
                              src={attachment.localPreviewUrl || attachment.previewUrl}
                              alt={attachment.name || "Uploaded schedule image"}
                              className="h-20 w-24 object-cover"
                            />
                          ) : (
                            <div className="flex max-w-[180px] items-center gap-2 px-3 py-2">
                              <Paperclip className={iconClasses.button} />
                              <span className={cn("min-w-0 truncate font-bold", typeClasses.small)}>{attachment.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {message.content && (
                    <div
                      className="rounded-[20px] px-4 py-2.5 text-white"
                      style={{ backgroundColor: appColor }}
                    >
                      <p className={cn("whitespace-pre-wrap font-semibold leading-6", typeClasses.body)}>{message.content}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        className={cn("mt-auto shrink-0 rounded-[26px] border p-2.5 transition-all duration-200", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <AnimatePresence initial={false}>
          {pendingAttachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 6, height: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto px-1"
            >
              {pendingAttachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className={cn("relative flex h-16 max-w-[180px] items-center overflow-hidden rounded-2xl border", isDark ? "border-white/[0.12] bg-white/[0.06]" : "border-[var(--bm-border)] bg-white")}
                >
                  {attachment.type === "image" ? (
                    <img src={attachment.localPreviewUrl} alt={attachment.name} className="h-full w-20 object-cover" />
                  ) : (
                    <div className="flex h-full w-20 items-center justify-center bg-[var(--bm-primary)]/10">
                      <FileText className="h-6 w-6 text-[var(--bm-primary)]" />
                    </div>
                  )}
                  <div className="min-w-0 px-2 pr-7">
                    <p className={cn("truncate font-extrabold", typeClasses.small, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{attachment.name}</p>
                    <p className={cn("mt-0.5 truncate font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                      {attachment.type === "pdf" ? "PDF" : "Image"} {formatScheduleFileSize(attachment.size || attachment.file?.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(attachment.id)}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/70"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="h-3 w-3 stroke-[3]" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2">
          <button
            type="button"
            onClick={() => setAddMenuOpen((value) => !value)}
            className={cn("mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", interactionClasses.control)}
            aria-label="Open schedule attachment menu"
          >
            <Plus className={iconClasses.button} />
          </button>

          <AnimatePresence>
            {addMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className={cn("absolute bottom-12 left-0 z-30 w-52 rounded-2xl border p-1.5 shadow-lg", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)]" : "border-[var(--bm-border)] bg-white")}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold", typeClasses.small, interactionClasses.menuItem)}
                >
                  <Camera className={iconClasses.button} />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    imageInputRef.current?.click();
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold", typeClasses.small, interactionClasses.menuItem)}
                >
                  <Paperclip className={iconClasses.button} />
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    pdfInputRef.current?.click();
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold", typeClasses.small, interactionClasses.menuItem)}
                >
                  <FileText className={iconClasses.button} />
                  Upload PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              resizeInput(event.currentTarget);
            }}
            onInput={(event) => resizeInput(event.currentTarget)}
            rows={1}
            placeholder="Describe your schedule..."
            className={cn(
              inputClasses.composer,
              "max-h-[112px] min-h-[52px] flex-1 resize-none bg-transparent px-2 py-3.5 font-semibold leading-6 outline-none transition-[height] duration-150",
              typeClasses.body,
              isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]",
            )}
          />

          <div className="mb-1 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info("Microphone support for Schedule will be added next.")}
              className={cn("flex h-10 w-10 items-center justify-center rounded-full", interactionClasses.control)}
              aria-label="Use microphone"
            >
              <Mic className={iconClasses.button} />
            </button>
            <BlueMindSendButton isBusy={isSending || isUploading} canSend={canSend} appColor={appColor} sendLabel="Send schedule message" compact />
          </div>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = "";
            addPendingFiles(files, "camera", "camera");
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleUploadFileSelect}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={handlePdfFileSelect}
        />
      </form>
    </motion.aside>
  );
}

function ScheduleTutorial({ isDark, appColor, accentText, onComplete }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-sm rounded-[28px] border p-6 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <div className="mb-5 flex items-center justify-between">
          <span className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>Schedule tutorial</span>
          <span className={cn("font-bold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{step + 1}/{TUTORIAL_STEPS.length}</span>
        </div>
        <h3 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>{current.title}</h3>
        <p className={cn("mt-3 font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>{current.body}</p>
        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onComplete}
            className={cn("rounded-2xl px-4 py-3 font-bold", typeClasses.small, interactionClasses.menuItem)}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) onComplete();
              else setStep((value) => value + 1);
            }}
            className={cn("rounded-2xl px-5 py-3 font-bold shadow-[0_12px_30px_rgba(25,59,104,0.20)]", typeClasses.small)}
            style={{ backgroundColor: appColor, color: accentText }}
          >
            {isLast ? "Start" : "Next"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SchemanPage() {
  const { prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const [chatVisible, setChatVisible] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [scheduleState, setScheduleState] = useState(readScheduleState);
  const [blockModal, setBlockModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [scheduleTypeOpen, setScheduleTypeOpen] = useState(false);
  const [aiStartSignal, setAiStartSignal] = useState(0);
  const [aiStartContext, setAiStartContext] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(SCHEDULE_TUTORIAL_KEY) !== "true");

  const blocks = scheduleState.blocks || [];
  const hasBlocks = blocks.length > 0;
  const pageColumns = useMemo(() => (
    chatVisible ? "xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]" : "xl:grid-cols-1"
  ), [chatVisible]);

  useEffect(() => {
    writeScheduleState(scheduleState);
  }, [scheduleState]);

  const handlePrimaryScheduleAction = () => {
    if (editMode) {
      setEditMode(false);
      toast.success("Schedule changes saved.");
      return;
    }

    if (!hasBlocks) {
      setScheduleTypeOpen(true);
      return;
    }

    setEditMode(true);
    toast.success("Schedule edit mode enabled.");
  };

  const createCustomSchedule = () => {
    setScheduleTypeOpen(true);
  };

  const selectScheduleType = (type) => {
    setScheduleTypeOpen(false);
    setChatVisible(true);
    setAiStartContext(type.assistantPrompt);
    setAiStartSignal((value) => value + 1);
  };

  const startAiDesign = () => {
    setChatVisible(true);
    setAiStartContext(hasBlocks
      ? "The user wants to edit the existing Schedule with BlueMind AI. Use the current schedule blocks as context, identify possible improvements, and ask what they want to optimize."
      : "The user wants BlueMind AI to design a Schedule from scratch. Ask what kind of schedule they want to build and guide them conversationally.");
    setAiStartSignal((value) => value + 1);
  };

  const importScheduleBlocks = (importedBlocks) => {
    if (!importedBlocks?.length) return;
    setScheduleState((current) => ({
      ...current,
      blocks: [...(current.blocks || []), ...importedBlocks],
      updatedAt: new Date().toISOString(),
    }));
    setEditMode(false);
  };

  const saveBlock = (block) => {
    setScheduleState((current) => ({
      ...current,
      blocks: [...(current.blocks || []), block],
      updatedAt: new Date().toISOString(),
    }));
    setBlockModal(null);
    setEditMode(true);
    toast.success("Schedule block added.");
  };

  const deleteActivity = (activity) => {
    setScheduleState((current) => ({
      ...current,
      blocks: (current.blocks || []).filter((block) => block.id !== activity.id),
      updatedAt: new Date().toISOString(),
    }));
    setDeleteTarget(null);
    toast.success("Activity deleted.");
  };

  const closeTutorial = () => {
    localStorage.setItem(SCHEDULE_TUTORIAL_KEY, "true");
    setTutorialOpen(false);
  };

  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")} data-testid="schedule-page">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1600px] flex-col gap-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>Schedule</p>
            <h1 className={cn("mt-1 font-extrabold tracking-tight", typeClasses.pageTitle)}>Schedule workspace</h1>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ScheduleButton onClick={() => setChatVisible((value) => !value)} active={chatVisible} appColor={appColor} accentText={accentText}>
              <MessageSquare className={iconClasses.button} />
              {chatVisible ? "Close Chat" : "Open Chat"}
            </ScheduleButton>
            {(hasBlocks || editMode) && (
              <ScheduleButton onClick={handlePrimaryScheduleAction} active={editMode} appColor={appColor} accentText={accentText}>
                <Plus className={iconClasses.button} />
                {editMode ? "Save Changes" : "Edit Schedule"}
              </ScheduleButton>
            )}
            <ScheduleButton onClick={createCustomSchedule} appColor={appColor} accentText={accentText}>
              <Plus className={iconClasses.button} />
              Create Custom Schedule
            </ScheduleButton>
            <ScheduleButton onClick={startAiDesign} active appColor={appColor} accentText={accentText}>
              <Sparkles className={iconClasses.button} />
              Edit with BlueMind AI
            </ScheduleButton>
          </div>
        </header>

        <div className={cn("grid min-h-0 flex-1 items-start gap-5", pageColumns)}>
          <div className="min-h-[620px]">
            <WeeklyGrid
              isDark={isDark}
              blocks={blocks}
              editMode={editMode}
              onAddCell={(day, hour) => setBlockModal({ day, hour })}
              onRequestDelete={setDeleteTarget}
            />
          </div>
          <ScheduleAssistant
            isDark={isDark}
            appColor={appColor}
            blocks={blocks}
            startSignal={aiStartSignal}
            startContext={aiStartContext}
            chatVisible={chatVisible}
            onImportBlocks={importScheduleBlocks}
          />
        </div>
      </div>

      <AnimatePresence>
        {tutorialOpen && (
          <ScheduleTutorial
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            onComplete={closeTutorial}
          />
        )}
        {blockModal && (
          <BlockModal
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            initialDay={blockModal.day}
            initialStart={blockModal.hour}
            onClose={() => setBlockModal(null)}
            onSave={saveBlock}
          />
        )}
        {deleteTarget && (
          <DeleteActivityDialog
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            activity={deleteTarget}
            onCancel={() => setDeleteTarget(null)}
            onDelete={deleteActivity}
          />
        )}
        {scheduleTypeOpen && (
          <ScheduleTypeDialog
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            onClose={() => setScheduleTypeOpen(false)}
            onSelect={selectScheduleType}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
