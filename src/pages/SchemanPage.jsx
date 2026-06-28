import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Apple, BookOpen, BriefcaseBusiness, CalendarDays, Dumbbell, MessageSquare, Plus, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import BlueMindSendButton from "@/components/BlueMindSendButton";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, typeClasses } from "@/lib/interactions";

const SCHEDULE_STORAGE_KEY = "bluemind-schedule-state-v1";
const SCHEDULE_TUTORIAL_KEY = "bluemind-schedule-tutorial-complete-v1";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 25 }, (_, index) => `${String(index).padStart(2, "0")}:00`);

const SCHEDULE_TYPES = [
  {
    id: "study",
    title: "Study Schedule",
    description: "Create an intelligent study schedule.",
    icon: BookOpen,
    firstPrompt: "Great. Which days do you study, what time do you start and finish, and which subjects should we plan first?",
    examples: ["Study days", "Start time", "Finish time", "Subjects", "Upcoming exams", "Priority subjects"],
  },
  {
    id: "gym",
    title: "Gym Schedule",
    description: "Create a personalized workout schedule.",
    icon: Dumbbell,
    firstPrompt: "Nice. What are your training days, training time, and main goal: build muscle, lose fat, cardio, strength, or endurance?",
    examples: ["Training days", "Training time", "Build muscle", "Lose fat", "Cardio", "Strength"],
  },
  {
    id: "nutrition",
    title: "Nutrition Schedule",
    description: "Create a healthy meal schedule.",
    icon: Apple,
    firstPrompt: "Good. Do you already have a meal plan, and what is your goal: fat loss, muscle gain, or a healthy lifestyle?",
    examples: ["Meal plan", "Fat loss", "Muscle gain", "Healthy lifestyle", "Meal timing", "Food preferences"],
  },
  {
    id: "business",
    title: "Business Schedule",
    description: "Create work and employee schedules.",
    icon: BriefcaseBusiness,
    firstPrompt: "Understood. How many employees do you have, what are the working days and hours, and how long should breaks be?",
    examples: ["Employees", "Working days", "Working hours", "Break duration", "Shift preferences", "Fair rotation"],
  },
];

const TUTORIAL_STEPS = [
  {
    title: "This is your weekly planner.",
    body: "The grid starts empty so you can build a clean schedule from scratch.",
  },
  {
    title: "This is the AI assistant.",
    body: "Use the compact BlueMind assistant to describe what you want to organize.",
  },
  {
    title: "Create a custom schedule.",
    body: "Choose a schedule type first. BlueMind will use the right workflow for that category later.",
  },
  {
    title: "You're ready.",
    body: "Start with an empty weekly schedule and build from here.",
  },
];

function readScheduleState() {
  try {
    const value = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) || "null");
    return value && typeof value === "object" ? value : { exists: false };
  } catch {
    return { exists: false };
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

function WeeklyGrid({ isDark }) {
  const lineClass = isDark ? "border-white/[0.07]" : "border-[var(--bm-border)]";
  const headerBg = isDark ? "bg-white/[0.045]" : "bg-[var(--bm-bg-elevated)]";
  const cellBg = isDark ? "bg-transparent" : "bg-white";

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
          <div className="grid min-w-[900px] grid-cols-[76px_repeat(7,minmax(116px,1fr))]">
            {HOURS.map((hour) => (
              <div key={`time-${hour}`} className="contents">
                <div className={cn("flex h-12 items-start justify-center border-b border-r pt-2 font-semibold", typeClasses.small, lineClass, "text-[var(--bm-text-muted)]")}>
                  {hour}
                </div>
                {DAYS.map((day) => (
                  <div
                    key={`${day}-${hour}`}
                    aria-label={`${day} ${hour}`}
                    className={cn("h-12 border-b border-r last:border-r-0", lineClass, cellBg)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScheduleTypeModal({ isDark, appColor, accentText, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const filteredTypes = SCHEDULE_TYPES.filter((type) => (
    `${type.title} ${type.description}`.toLowerCase().includes(query.trim().toLowerCase())
  ));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("w-full max-w-3xl rounded-[30px] border p-5 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]")}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>Create Custom Schedule</h2>
            <p className={cn("mt-1 font-semibold", typeClasses.small, "text-[var(--bm-text-secondary)]")}>Choose the type of schedule you want to build.</p>
          </div>
          <button type="button" onClick={onClose} className={cn("rounded-full p-2", interactionClasses.control)} aria-label="Close schedule types">
            <X className={iconClasses.button} />
          </button>
        </div>

        <label className={cn("mt-5 flex h-12 items-center gap-3 rounded-2xl border px-4", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
          <Search className={cn(iconClasses.button, "text-[var(--bm-text-muted)]")} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search schedule types..."
            className={cn(inputClasses.base, "h-full flex-1 bg-transparent p-0 font-semibold outline-none", typeClasses.body)}
          />
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {filteredTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onSelect(type)}
                className={cn("group rounded-[24px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5", isDark ? "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.075]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] hover:bg-white")}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_12px_28px_rgba(25,59,104,0.18)]" style={{ backgroundColor: appColor, color: accentText }}>
                    <Icon className={iconClasses.card} />
                  </span>
                  <div>
                    <h3 className={cn("font-extrabold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{type.title}</h3>
                    <p className={cn("mt-1 font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>{type.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function ScheduleAssistant({ isDark, appColor, selectedType, onOpenTypes, chatVisible }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const canSend = Boolean(input.trim());

  useEffect(() => {
    if (!selectedType) return;
    setMessages([
      {
        id: `assistant-${selectedType.id}`,
        role: "assistant",
        content: selectedType.firstPrompt,
        examples: selectedType.examples,
      },
    ]);
  }, [selectedType]);

  const submit = () => {
    if (!canSend) return;
    const value = input.trim();
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: value },
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: selectedType
          ? "Got it. I will use that detail when the intelligent scheduling system is connected. For now, keep adding the key constraints you want BlueMind to consider."
          : "Choose a schedule type first so BlueMind can use the right workflow.",
        examples: selectedType?.examples || [],
      },
    ]);
    setInput("");
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
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: appColor }}>
            <Sparkles className={iconClasses.button} />
          </span>
          <p className={cn("font-extrabold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind</p>
        </div>
        <h2 className={cn("mt-7 font-extrabold tracking-tight", typeClasses.sectionTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
          What would you like to build today?
        </h2>
        <p className={cn("mt-3 font-semibold leading-7", typeClasses.body, "text-[var(--bm-text-secondary)]")}>
          BlueMind can help organize study, gym, nutrition, and business schedules. Choose a type to start the right workflow.
        </p>
        <button type="button" onClick={onOpenTypes} className={cn("mt-4 rounded-2xl px-4 py-3 font-bold", typeClasses.small, interactionClasses.control)}>
          Choose Schedule Type
        </button>
      </div>

      <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className={cn("rounded-[22px] border p-4", isDark ? "border-white/[0.08] bg-white/[0.035]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
            <p className={cn("font-bold", typeClasses.body, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Start with a schedule type.</p>
            <p className={cn("mt-2 font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-secondary)]")}>
              Click Create Custom Schedule and choose Study, Gym, Nutrition, or Business.
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
              <div
                className={cn(
                  "max-w-[92%] rounded-[22px] px-4 py-3",
                  message.role === "user"
                    ? "text-white"
                    : isDark ? "bg-white/[0.055] text-white" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)]",
                )}
                style={message.role === "user" ? { backgroundColor: appColor } : undefined}
              >
                <p className={cn("whitespace-pre-wrap font-semibold leading-6", typeClasses.body)}>{message.content}</p>
                {message.examples?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.examples.map((example) => (
                      <button
                        type="button"
                        key={example}
                        onClick={() => setInput(example)}
                        className={cn("rounded-full px-3 py-1.5 font-bold", typeClasses.small, isDark ? "bg-white/[0.08] text-white" : "bg-white text-[var(--bm-text-primary)]")}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <form
        className={cn("mt-6 rounded-[26px] border p-3", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          placeholder="Tell BlueMind what you want to organize..."
          className={cn(
            inputClasses.composer,
            "max-h-32 min-h-[84px] w-full resize-none bg-transparent px-2 py-2 font-semibold leading-6 outline-none",
            typeClasses.body,
            isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]",
          )}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={cn("font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{selectedType?.title || "Schedule assistant"}</span>
          <BlueMindSendButton canSend={canSend} appColor={appColor} sendLabel="Send schedule message" />
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
  const [scheduleState, setScheduleState] = useState(readScheduleState);
  const [selectedType, setSelectedType] = useState(null);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(SCHEDULE_TUTORIAL_KEY) !== "true");

  const scheduleExists = Boolean(scheduleState.exists);
  const pageColumns = useMemo(() => (
    chatVisible ? "xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]" : "xl:grid-cols-1"
  ), [chatVisible]);

  useEffect(() => {
    writeScheduleState(scheduleState);
  }, [scheduleState]);

  const createScheduleShell = () => {
    setScheduleState({
      exists: true,
      id: scheduleState.id || `schedule-${Date.now().toString(36)}`,
      type: selectedType?.id || scheduleState.type,
      createdAt: scheduleState.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    toast.success(scheduleExists ? "Schedule ready to edit." : "Schedule created.");
  };

  const selectScheduleType = (type) => {
    setSelectedType(type);
    setScheduleState({
      exists: true,
      id: `schedule-${Date.now().toString(36)}`,
      type: type.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setTypeModalOpen(false);
    setChatVisible(true);
    toast.success(`${type.title} selected.`);
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
            <ScheduleButton onClick={createScheduleShell} appColor={appColor} accentText={accentText}>
              <Sparkles className={iconClasses.button} />
              {scheduleExists ? "Edit Schedule" : "Create Schedule"}
            </ScheduleButton>
            <ScheduleButton onClick={() => setTypeModalOpen(true)} active appColor={appColor} accentText={accentText}>
              <Plus className={iconClasses.button} />
              Create Custom Schedule
            </ScheduleButton>
          </div>
        </header>

        <div className={cn("grid min-h-0 flex-1 gap-5", pageColumns)}>
          <div className="min-h-[620px]">
            <WeeklyGrid isDark={isDark} />
          </div>
          <AnimatePresence mode="wait">
            {chatVisible && (
              <ScheduleAssistant
                key="schedule-assistant"
                isDark={isDark}
                appColor={appColor}
                selectedType={selectedType}
                onOpenTypes={() => setTypeModalOpen(true)}
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
        {typeModalOpen && (
          <ScheduleTypeModal
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            onClose={() => setTypeModalOpen(false)}
            onSelect={selectScheduleType}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
