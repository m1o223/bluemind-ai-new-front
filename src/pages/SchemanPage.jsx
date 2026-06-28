import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, MessageSquare, Mic, Paperclip, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import BrandLogo from "@/components/BrandLogo";
import BlueMindSendButton from "@/components/BlueMindSendButton";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, typeClasses } from "@/lib/interactions";
import { streamHiddenChatMessage } from "@/services/chatService";

const SCHEDULE_STORAGE_KEY = "bluemind-schedule-state-v2";
const SCHEDULE_TUTORIAL_KEY = "bluemind-schedule-tutorial-complete-v1";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 25 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
const ROW_HEIGHT = 48;
const ICON_OPTIONS = ["Book", "Dumbbell", "Briefcase", "Apple", "Moon", "Clock", "Star"];
const ICON_SYMBOLS = {
  Book: "📘",
  Dumbbell: "🏋️",
  Briefcase: "💼",
  Apple: "🍎",
  Moon: "🌙",
  Clock: "⏰",
  Star: "⭐",
};
const COLOR_OPTIONS = ["#2563EB", "#16A34A", "#7C3AED", "#EA580C", "#DC2626", "#0891B2", "#9333EA", "#4F46E5"];
const DISPLAY_ICON_SYMBOLS = {
  Book: "\uD83D\uDCD8",
  Dumbbell: "\uD83C\uDFCB\uFE0F",
  Briefcase: "\uD83D\uDCBC",
  Apple: "\uD83C\uDF4E",
  Moon: "\uD83D\uDE34",
  Clock: "\u23F0",
  Star: "\u2B50",
};

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

function timeToIndex(value) {
  const hour = Number.parseInt(String(value).slice(0, 2), 10);
  return Number.isFinite(hour) ? Math.max(0, Math.min(24, hour)) : 0;
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
    "Do not generate calendar blocks automatically yet. This step is only conversation guidance for schedule design.",
    "Ask concise, useful questions based on what the user wants to build.",
    "",
    `Current schedule blocks:\n${buildScheduleContext(blocks)}`,
    recentContext ? `Conversation so far:\n${recentContext}` : "Conversation so far: none.",
    initial
      ? "Start the conversation now with a friendly opener. Ask what kind of schedule the user wants to build."
      : `Current user message: ${latestText}`,
  ].filter(Boolean).join("\n\n");
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

function WeeklyGrid({ isDark, blocks, manualMode, onAddCell }) {
  const lineClass = isDark ? "border-white/[0.07]" : "border-[var(--bm-border)]";
  const headerBg = isDark ? "bg-white/[0.045]" : "bg-[var(--bm-bg-elevated)]";
  const cellBg = isDark ? "bg-transparent" : "bg-white";
  const isCellOccupied = (day, hour) => {
    const hourIndex = timeToIndex(hour);
    return blocks.some((block) => (
      block.days.includes(day)
      && hourIndex >= timeToIndex(block.start)
      && hourIndex < timeToIndex(block.end)
    ));
  };
  const isInteriorHourCovered = (hour) => {
    const hourIndex = timeToIndex(hour);
    return blocks.some((block) => (
      hourIndex > timeToIndex(block.start)
      && hourIndex < timeToIndex(block.end)
    ));
  };

  return (
    <section className={cn("h-full overflow-hidden rounded-[28px] border shadow-sm", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
      <div className="flex h-full flex-col">
        <div className={cn("grid grid-cols-[76px_repeat(7,minmax(116px,1fr))] border-b", lineClass, headerBg)}>
          <div className={cn("flex h-14 items-center justify-center border-r font-bold", typeClasses.small, lineClass, "text-[var(--bm-text-muted)]")}>Time</div>
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
                  "flex items-start justify-center border-r pt-2 font-semibold",
                  !isInteriorHourCovered(hour) && "border-b",
                  typeClasses.small,
                  lineClass,
                  "text-[var(--bm-text-muted)]",
                )}>
                  <span className={cn(isInteriorHourCovered(hour) && "opacity-0")}>{hour}</span>
                </div>
                {DAYS.map((day) => {
                  const occupied = isCellOccupied(day, hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      aria-label={`${day} ${hour}`}
                      className={cn(
                        "relative border-r last:border-r-0",
                        !occupied && "border-b",
                        lineClass,
                        occupied ? (isDark ? "bg-[var(--bm-bg-card)]" : "bg-white") : cellBg,
                      )}
                    >
                      {manualMode && hour !== "24:00" && !occupied && (
                      <button
                        type="button"
                        onClick={() => onAddCell(day, hour)}
                        className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bm-primary)] text-white opacity-80 shadow-sm transition hover:opacity-100"
                        aria-label={`Add activity on ${day} at ${hour}`}
                      >
                        <Plus className="h-3 w-3 stroke-[3]" />
                      </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {blocks.flatMap((block) => block.days.map((day) => {
              const dayIndex = DAYS.indexOf(day);
              const startIndex = timeToIndex(block.start);
              const endIndex = Math.max(startIndex + 1, timeToIndex(block.end));
              if (dayIndex === -1) return null;

              return (
                <motion.div
                  key={`${block.id}-${day}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="z-30 mx-1.5 my-1 overflow-hidden rounded-[24px] px-4 py-3 text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] ring-1 ring-white/20"
                  style={{
                    gridColumn: dayIndex + 2,
                    gridRow: `${startIndex + 1} / ${endIndex + 1}`,
                    background: `linear-gradient(145deg, ${block.color}, #1D4ED8)`,
                  }}
                >
                  <div className="flex h-full flex-col justify-between gap-2">
                    <p className={cn("text-[15px] font-extrabold leading-tight tracking-[0.01em]")}>
                      <span className="mr-1.5">{DISPLAY_ICON_SYMBOLS[block.icon] || "\u2B50"}</span>
                      {block.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/15 p-2 backdrop-blur-sm">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-75">From</p>
                        <p className="mt-0.5 text-sm font-black leading-none">{block.start}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-75">To</p>
                        <p className="mt-0.5 text-sm font-black leading-none">{block.end}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }))}
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

  const toggleDay = (day) => {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Activity name is required.");
      return;
    }
    if (!days.length) {
      toast.error("Select at least one day.");
      return;
    }
    if (timeToIndex(end) <= timeToIndex(start)) {
      toast.error("End time must be after start time.");
      return;
    }

    onSave({
      id: `block-${Date.now().toString(36)}`,
      name: name.trim(),
      start,
      end,
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
            <label className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>End time</span>
              <select value={end} onChange={(event) => setEnd(event.target.value)} className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")}>
                {HOURS.slice(1).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
          </div>

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
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setColor(item)}
                    className={cn("h-9 w-9 rounded-full border-2", color === item ? "border-white ring-2 ring-[var(--bm-primary)]" : "border-transparent")}
                    style={{ backgroundColor: item }}
                    aria-label={`Use color ${item}`}
                  />
                ))}
              </div>
            </div>
            <label className="grid gap-2">
              <span className={cn("font-bold", typeClasses.small)}>Icon</span>
              <select value={icon} onChange={(event) => setIcon(event.target.value)} className={cn(inputClasses.base, "h-12 rounded-2xl px-4 font-semibold")}>
                {ICON_OPTIONS.map((item) => <option key={item} value={item}>{DISPLAY_ICON_SYMBOLS[item]} {item}</option>)}
              </select>
            </label>
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

function ScheduleAssistant({ isDark, appColor, blocks, startSignal, chatVisible }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const sendLockRef = useRef(false);
  const lastStartSignalRef = useRef(0);
  const canSend = Boolean(input.trim()) && !isSending;

  const streamAssistant = async ({ latestText = "", initial = false, userMessage = null }) => {
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
      await streamHiddenChatMessage({
        message: buildSchedulePrompt({ messages: baseMessages, latestText, blocks, initial }),
        mode: "work",
        metadata: {
          source: "schedule",
          schedule: true,
          hiddenChat: true,
          scheduleBlocks: blocks.map(({ id, name, start, end, days, color, icon }) => ({ id, name, start, end, days, color, icon })),
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
    streamAssistant({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  const submit = () => {
    if (!canSend || sendLockRef.current) return;
    const value = input.trim();
    setInput("");
    setAddMenuOpen(false);
    streamAssistant({
      latestText: value,
      userMessage: { id: `user-${Date.now()}`, role: "user", content: value },
    });
  };

  if (!chatVisible) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex min-h-[520px] flex-col rounded-[28px] border p-5 shadow-sm", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}
    >
      <div>
        <div className="flex items-center gap-2">
          <BrandLogo
            showName={false}
            small
            logoClassName="h-10 w-10"
            className="shrink-0"
          />
          <p className={cn("font-extrabold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind AI</p>
        </div>
        <h2 className={cn("mt-7 text-center font-extrabold tracking-tight", typeClasses.sectionTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
          What would you like BlueMind to help you build today?
        </h2>
        <p className={cn("mt-3 text-center font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>
          BlueMind can help you create smart schedules for study, gym, nutrition, work, and more.
        </p>
      </div>

      <div className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="px-1">
            <p className={cn("font-extrabold", typeClasses.body, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Ready when you are.</p>
            <p className={cn("mt-2 font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>
              Click Design Schedule with BlueMind AI to start the real AI conversation.
            </p>
          </div>
        ) : (
          messages.map((message) => (
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
                    <p className={cn("mt-2 whitespace-pre-wrap font-semibold leading-7", typeClasses.body, message.error ? "text-[var(--bm-error)]" : "text-[var(--bm-text-primary)]")}>{message.content}</p>
                  )}
                </div>
              ) : (
                <div
                  className="max-w-[88%] rounded-[20px] px-4 py-2.5 text-white"
                  style={{ backgroundColor: appColor }}
                >
                  <p className={cn("whitespace-pre-wrap font-semibold leading-6", typeClasses.body)}>{message.content}</p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <form
        className={cn("mt-4 shrink-0 rounded-[24px] border p-2", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddMenuOpen((value) => !value)}
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", interactionClasses.control)}
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
                    toast.info("Camera support for Schedule will be added next.");
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
                    toast.info("Image and PDF upload for Schedule will be added next.");
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold", typeClasses.small, interactionClasses.menuItem)}
                >
                  <Paperclip className={iconClasses.button} />
                  Upload Image / PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={1}
            placeholder="Tell me what kind of schedule you want to create..."
            className={cn(
              inputClasses.composer,
              "max-h-[68px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 font-semibold leading-6 outline-none",
              typeClasses.body,
              isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]",
            )}
          />

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info("Microphone support for Schedule will be added next.")}
              className={cn("flex h-9 w-9 items-center justify-center rounded-full", interactionClasses.control)}
              aria-label="Use microphone"
            >
              <Mic className={iconClasses.button} />
            </button>
            <BlueMindSendButton isBusy={isSending} canSend={canSend} appColor={appColor} sendLabel="Send schedule message" compact />
          </div>
        </div>
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
  const [manualMode, setManualMode] = useState(false);
  const [scheduleState, setScheduleState] = useState(readScheduleState);
  const [blockModal, setBlockModal] = useState(null);
  const [aiStartSignal, setAiStartSignal] = useState(0);
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(SCHEDULE_TUTORIAL_KEY) !== "true");

  const blocks = scheduleState.blocks || [];
  const hasBlocks = blocks.length > 0;
  const pageColumns = useMemo(() => (
    chatVisible ? "xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]" : "xl:grid-cols-1"
  ), [chatVisible]);

  useEffect(() => {
    writeScheduleState(scheduleState);
  }, [scheduleState]);

  const enterManualMode = () => {
    setManualMode(true);
    toast.success(hasBlocks ? "Schedule edit mode enabled." : "Manual schedule design enabled.");
  };

  const startAiDesign = () => {
    setChatVisible(true);
    setAiStartSignal((value) => value + 1);
  };

  const saveBlock = (block) => {
    setScheduleState((current) => ({
      ...current,
      blocks: [...(current.blocks || []), block],
      updatedAt: new Date().toISOString(),
    }));
    setBlockModal(null);
    setManualMode(true);
    toast.success("Schedule block added.");
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
            <ScheduleButton onClick={enterManualMode} active={manualMode} appColor={appColor} accentText={accentText}>
              <Plus className={iconClasses.button} />
              {hasBlocks ? "Edit Schedule" : "Design Schedule Manually"}
            </ScheduleButton>
            <ScheduleButton onClick={startAiDesign} active appColor={appColor} accentText={accentText}>
              <Sparkles className={iconClasses.button} />
              {hasBlocks ? "Edit with BlueMind AI" : "Design Schedule with BlueMind AI"}
            </ScheduleButton>
          </div>
        </header>

        <div className={cn("grid min-h-0 flex-1 gap-5", pageColumns)}>
          <div className="min-h-[620px]">
            <WeeklyGrid
              isDark={isDark}
              blocks={blocks}
              manualMode={manualMode}
              onAddCell={(day, hour) => setBlockModal({ day, hour })}
            />
          </div>
          <AnimatePresence mode="wait">
            {chatVisible && (
              <ScheduleAssistant
                key="schedule-assistant"
                isDark={isDark}
                appColor={appColor}
                blocks={blocks}
                startSignal={aiStartSignal}
                chatVisible={chatVisible}
              />
            )}
          </AnimatePresence>
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
      </AnimatePresence>
    </main>
  );
}
