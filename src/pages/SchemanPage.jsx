import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import BlueMindSendButton from "@/components/BlueMindSendButton";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, typeClasses } from "@/lib/interactions";

const TENT_STORAGE_KEY = "bluemind-tent-state-v1";
const TENT_TUTORIAL_KEY = "bluemind-tent-tutorial-complete-v1";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 25 }, (_, index) => `${String(index).padStart(2, "0")}:00`);

const TUTORIAL_STEPS = [
  {
    title: "This is your weekly planner.",
    body: "The grid is empty on purpose. Future Tent tools will help you organize it step by step.",
  },
  {
    title: "This is the BlueMind assistant.",
    body: "Use the compact assistant to describe what you want to organize when AI scheduling is added.",
  },
  {
    title: "This button creates a new Tent.",
    body: "New Tent starts from a clean empty weekly grid.",
  },
  {
    title: "This button edits your Tent.",
    body: "Create Tent changes to Edit Tent after your first Tent workspace exists.",
  },
  {
    title: "You’re ready.",
    body: "Start with the empty planner and build from here.",
  },
];

function readTentState() {
  try {
    const value = JSON.parse(localStorage.getItem(TENT_STORAGE_KEY) || "null");
    return value && typeof value === "object" ? value : { exists: false };
  } catch {
    return { exists: false };
  }
}

function writeTentState(state) {
  try {
    localStorage.setItem(TENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local persistence is best-effort until Tent backend storage is added.
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

function TentButton({ children, active = false, appColor, accentText, className, ...props }) {
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
          <div className={cn("flex h-14 items-center justify-center border-r font-bold", typeClasses.small, lineClass, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Time</div>
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
                <div className={cn("flex h-12 items-start justify-center border-b border-r pt-2 font-semibold", typeClasses.small, lineClass, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
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

function TentAssistant({ isDark, appColor, chatVisible }) {
  const [input, setInput] = useState("");
  const textAreaRef = useRef(null);
  const canSend = Boolean(input.trim());

  const submit = () => {
    if (!canSend) return;
    toast.info("Tent AI scheduling will be connected in the next step.");
    setInput("");
    textAreaRef.current?.focus();
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
          Let me help you build your Tent.
        </h2>
        <p className={cn("mt-3 font-semibold leading-7", typeClasses.body, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>
          Tell BlueMind what kind of week you want to organize. AI scheduling is not active yet, but this assistant area is ready for the next step.
        </p>
      </div>

      <div className="flex-1" />

      <form
        className={cn("mt-6 rounded-[26px] border p-3", isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={textAreaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          placeholder="Ask BlueMind to help organize your schedule..."
          className={cn(
            inputClasses.composer,
            "max-h-32 min-h-[84px] w-full resize-none bg-transparent px-2 py-2 font-semibold leading-6 outline-none",
            typeClasses.body,
            isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]",
          )}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={cn("font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>Tent assistant</span>
          <BlueMindSendButton canSend={canSend} appColor={appColor} sendLabel="Send Tent message" />
        </div>
      </form>
    </motion.aside>
  );
}

function TentTutorial({ isDark, appColor, accentText, onComplete }) {
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
          <span className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>Tent tutorial</span>
          <span className={cn("font-bold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{step + 1}/{TUTORIAL_STEPS.length}</span>
        </div>
        <h3 className={cn("font-extrabold tracking-tight", typeClasses.sectionTitle)}>{current.title}</h3>
        <p className={cn("mt-3 font-semibold leading-7", typeClasses.body, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{current.body}</p>
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
  const [tentState, setTentState] = useState(readTentState);
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(TENT_TUTORIAL_KEY) !== "true");

  const tentExists = Boolean(tentState.exists);
  const pageColumns = useMemo(() => (
    chatVisible ? "xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]" : "xl:grid-cols-1"
  ), [chatVisible]);

  useEffect(() => {
    writeTentState(tentState);
  }, [tentState]);

  const createTent = () => {
    setTentState({
      exists: true,
      id: `tent-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    toast.success(tentExists ? "Tent ready to edit." : "Tent created.");
  };

  const newTent = () => {
    setTentState({
      exists: true,
      id: `tent-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    toast.success("New empty Tent created.");
  };

  const closeTutorial = () => {
    localStorage.setItem(TENT_TUTORIAL_KEY, "true");
    setTutorialOpen(false);
  };

  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")} data-testid="tent-page">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1600px] flex-col gap-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>Tent</p>
            <h1 className={cn("mt-1 font-extrabold tracking-tight", typeClasses.pageTitle)}>Tent workspace</h1>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <TentButton onClick={() => setChatVisible((value) => !value)} active={chatVisible} appColor={appColor} accentText={accentText}>
              <MessageSquare className={iconClasses.button} />
              {chatVisible ? "Close Chat" : "Open Chat"}
            </TentButton>
            <TentButton onClick={createTent} active appColor={appColor} accentText={accentText}>
              <Sparkles className={iconClasses.button} />
              {tentExists ? "Edit Tent" : "Create Tent"}
            </TentButton>
            <TentButton onClick={newTent} appColor={appColor} accentText={accentText}>
              <Plus className={iconClasses.button} />
              New Tent
            </TentButton>
          </div>
        </header>

        <div className={cn("grid min-h-0 flex-1 gap-5", pageColumns)}>
          <div className="min-h-[620px]">
            <WeeklyGrid isDark={isDark} />
          </div>
          <AnimatePresence mode="wait">
            {chatVisible && <TentAssistant key="tent-assistant" isDark={isDark} appColor={appColor} chatVisible={chatVisible} />}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {tutorialOpen && (
          <TentTutorial
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            onComplete={closeTutorial}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
