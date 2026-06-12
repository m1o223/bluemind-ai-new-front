import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  Edit3,
  Expand,
  FileText,
  Globe2,
  Image,
  Languages,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Send,
  Save,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, motionTokens, spacingClasses, typeClasses } from "@/lib/interactions";
import {
  applyAIPlanInstruction,
  createAIPlanFromConversation,
  getPlanningQuestions,
  getPlanProgress,
  getPlanStatus,
  hasEnoughPlanContext,
  loadAIPlans,
  saveAIPlans,
} from "@/services/aiPlansService";

const ROTATING_PLAN_SUGGESTIONS = [
  "Build a study plan",
  "Create an exam preparation plan",
  "Plan a website project",
  "Build a programming roadmap",
  "Create a fitness routine",
  "Plan a business idea",
  "Organize a language learning plan",
];

const QUICK_PLAN_CARDS = [
  {
    id: "study",
    icon: Sparkles,
    title: "Study Plan",
    description: "Prepare for exams and lessons",
    prompt: "Study Plan",
    firstQuestion: "Great. What subject are you studying?",
    suggestions: ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Swedish", "History", "Geography", "Programming", "Other"],
  },
  {
    id: "website",
    icon: Globe2,
    title: "Website Plan",
    description: "Build a site step by step",
    prompt: "Website Plan",
    firstQuestion: "What kind of website do you want to build?",
    suggestions: ["Portfolio", "E-commerce", "AI Tool", "Educational Website", "Blog", "Business Website", "Landing Page", "Other"],
  },
  {
    id: "programming",
    icon: BrainCircuit,
    title: "Programming Plan",
    description: "Learn or build software",
    prompt: "Programming Plan",
    firstQuestion: "What type of programming plan do you need?",
    suggestions: ["Frontend", "Backend", "Full Stack", "Mobile Apps", "Game Development", "AI Development", "Databases", "Other"],
  },
  {
    id: "business",
    icon: BriefcaseBusiness,
    title: "Business Plan",
    description: "Organize a business idea",
    prompt: "Business Plan",
    firstQuestion: "What kind of business idea do you want to organize?",
    suggestions: ["Startup", "Product Launch", "Marketing", "Sales", "Branding", "Operations", "Funding", "Other"],
  },
  {
    id: "fitness",
    icon: Target,
    title: "Fitness Plan",
    description: "Training and habits",
    prompt: "Fitness Plan",
    firstQuestion: "What fitness goal should this plan help you reach?",
    suggestions: ["Strength", "Weight Loss", "Running", "Home Workout", "Gym Routine", "Nutrition", "Consistency", "Other"],
  },
  {
    id: "language",
    icon: Languages,
    title: "Language Plan",
    description: "Learn a new language",
    prompt: "Language Plan",
    firstQuestion: "Which language do you want to learn, and what level are you starting from?",
    suggestions: ["English", "Swedish", "Arabic", "Spanish", "German", "French", "Beginner", "Other"],
  },
  {
    id: "design",
    icon: Image,
    title: "Design Plan",
    description: "Plan creative work",
    prompt: "Design Plan",
    firstQuestion: "What type of creative work do you want to plan?",
    suggestions: ["Brand Identity", "UI Design", "Poster", "Presentation", "Portfolio", "Animation", "Social Media", "Other"],
  },
  {
    id: "ai-project",
    icon: Sparkles,
    title: "AI Project",
    description: "Build an AI-powered product",
    prompt: "AI Project",
    firstQuestion: "What should your AI-powered product help people do?",
    suggestions: ["Chatbot", "Study Tool", "Image Tool", "Research Tool", "Automation", "Recommendation System", "Assistant", "Other"],
  },
];

const GENERATION_STEPS = [
  "Generating your plan...",
  "Creating phases...",
  "Organizing tasks...",
  "Finalizing roadmap...",
];

function getTextOnColor(hex) {
  const normalized = String(hex || "var(--bm-primary)").replace("#", "").padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const luminance = [red, green, blue]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.52 ? "var(--bm-text-primary)" : "#FFFFFF";
}

function PageShell({ children, isDark, fullScreen = false }) {
  return (
    <div className={cn("min-h-screen", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")} data-testid="ai-plans-page">
      <main className={cn("mx-auto px-4 py-6 sm:px-6 sm:py-8", fullScreen ? "max-w-[1500px]" : "max-w-7xl")}>
        {children}
      </main>
    </div>
  );
}

function ProgressBar({ value, appColor, isDark }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full", isDark ? "bg-white/[0.08]" : "bg-[var(--bm-border)]")}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: appColor }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={motionTokens.cardTransition}
      />
    </div>
  );
}

function fileToAttachment(file, type) {
  return {
    id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    previewUrl: type === "image" ? URL.createObjectURL(file) : "",
    file,
  };
}

function formatFileSize(size) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function PlannerComposer({
  value,
  onChange,
  onSubmit,
  attachments,
  onAttachmentsChange,
  placeholder,
  isDark,
  appColor,
  accentText,
  disabled = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const imageRef = useRef(null);
  const fileRef = useRef(null);

  const addFiles = (files, type) => {
    const next = Array.from(files || []).map((file) => fileToAttachment(file, type));
    if (!next.length) return;
    onAttachmentsChange([...(attachments || []), ...next]);
    setMenuOpen(false);
  };

  const removeAttachment = (id) => {
    const item = attachments.find((attachment) => attachment.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    onAttachmentsChange(attachments.filter((attachment) => attachment.id !== id));
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info("Voice input is not available in this browser yet.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice input could not start.");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) onChange(value ? `${value} ${transcript}` : transcript);
    };
    recognition.start();
    setMenuOpen(false);
  };

  return (
    <form
      className={cn("relative mx-auto w-full max-w-3xl")}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className={cn("rounded-[32px] border p-3 shadow-[0_22px_70px_rgba(0,0,0,0.14)]", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
        {attachments.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {attachments.map((attachment) => (
              <div key={attachment.id} className={cn("relative flex h-16 min-w-16 max-w-[180px] items-center gap-2 overflow-hidden rounded-2xl border px-2", isDark ? "border-white/[0.08] bg-white/[0.06]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                {attachment.type === "image" && attachment.previewUrl ? (
                  <img src={attachment.previewUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bm-hover-bg)]">
                    <FileText className={iconClasses.button} />
                  </span>
                )}
                <span className="min-w-0 pr-5">
                  <span className={cn("block truncate font-bold", typeClasses.small)}>{attachment.name}</span>
                  <span className={cn("block font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{formatFileSize(attachment.size)}</span>
                </span>
                <button type="button" onClick={() => removeAttachment(attachment.id)} className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(inputClasses.composer, "max-h-48 min-h-[96px] w-full resize-none bg-transparent px-2 py-2 font-semibold leading-7 outline-none", typeClasses.body, isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]")}
        />

        <div className="mt-2 flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={cn("flex h-11 w-11 items-center justify-center rounded-full", interactionClasses.iconButton, isDark ? "bg-white/[0.07] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}
              aria-label="Open plan input tools"
            >
              <Plus className={iconClasses.button} />
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn("absolute bottom-[3.5rem] left-0 z-20 w-56 rounded-3xl border p-2 shadow-2xl", isDark ? "border-white/[0.08] bg-[var(--bm-bg-modal)]" : "border-[var(--bm-border)] bg-white")}
              >
                <ToolMenuButton icon={Image} label="Upload image" onClick={() => imageRef.current?.click()} />
                <ToolMenuButton icon={Paperclip} label="Upload file" onClick={() => fileRef.current?.click()} />
                <ToolMenuButton icon={Mic} label="Voice input" onClick={startVoice} />
              </motion.div>
            )}
          </div>

          <span className={cn("font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
            {attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} ready` : "Add context for a better plan"}
          </span>

          <div className="flex-1" />

          <button
            type="button"
            onClick={startVoice}
            className={cn("flex h-11 w-11 items-center justify-center rounded-full", interactionClasses.iconButton, listening ? "text-white" : "text-[var(--bm-text-secondary)]")}
            style={listening ? { backgroundColor: appColor } : undefined}
            aria-label="Start voice input"
          >
            <Mic className={iconClasses.button} />
          </button>
          <button
            type="submit"
            disabled={disabled || (!value.trim() && !attachments.length)}
            className={cn("flex h-11 w-11 items-center justify-center rounded-full text-white disabled:cursor-not-allowed disabled:bg-[var(--bm-disabled-bg)] disabled:opacity-60", interactionClasses.iconButton)}
            style={!disabled && (value.trim() || attachments.length) ? { backgroundColor: appColor, color: accentText } : undefined}
            aria-label="Send plan goal"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => addFiles(event.target.files, "image")} />
      <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" multiple className="hidden" onChange={(event) => addFiles(event.target.files, "file")} />
    </form>
  );
}

function ToolMenuButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center rounded-2xl px-3 py-3 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.menuItem)}>
      <Icon className={iconClasses.button} />
      {label}
    </button>
  );
}

function StartScreen({ isDark, appColor, accentText, onStart, onBack }) {
  const [goal, setGoal] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSuggestionIndex((index) => (index + 1) % ROTATING_PLAN_SUGGESTIONS.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, []);

  const submit = (nextGoal = goal, sourceCard = null) => {
    const cleanGoal = String(nextGoal || "").trim();
    if (cleanGoal || attachments.length) {
      onStart(cleanGoal || "Create a plan from my attachments", {
        sourceCard,
        attachments: attachments.map(({ file, previewUrl, ...metadata }) => metadata),
      });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center justify-between py-2">
        <button type="button" onClick={onBack} className={cn("inline-flex h-11 items-center rounded-full px-3 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.menuItem)}>
          <ArrowLeft className={iconClasses.button} />
          Back
        </button>
        <span className={cn("inline-flex h-11 items-center rounded-2xl px-4 font-extrabold", typeClasses.small)} style={{ backgroundColor: appColor, color: accentText }}>
          Create Plan
        </span>
      </header>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: appColor, color: accentText }}>
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className={cn("max-w-3xl font-extrabold tracking-tight", typeClasses.pageTitle)}>What plan would you like to create today?</h1>
        <AnimatePresence mode="wait">
          <motion.p
            key={ROTATING_PLAN_SUGGESTIONS[suggestionIndex]}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={motionTokens.transition}
            className={cn("mt-4 font-bold", typeClasses.body, "text-[var(--bm-text-secondary)]")}
          >
            {ROTATING_PLAN_SUGGESTIONS[suggestionIndex]}
          </motion.p>
        </AnimatePresence>

        <div className="mt-8 w-full">
          <PlannerComposer
            value={goal}
            onChange={setGoal}
            onSubmit={() => submit()}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            placeholder="Tell BlueMind what you want to plan..."
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
          />
        </div>

        <div className="mt-8 grid w-full max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_PLAN_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => submit(card.prompt, card)}
                className={cn("group rounded-[24px] border p-4 text-left shadow-sm", interactionClasses.card, isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}
              >
                <span className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.07]" : "bg-[var(--bm-hover-bg)]")} style={{ color: appColor }}>
                  <Icon className={iconClasses.card} />
                </span>
                <span className={cn("block font-extrabold", typeClasses.cardTitle)}>{card.title}</span>
                <span className={cn("mt-1 block font-semibold", typeClasses.small, "text-[var(--bm-text-secondary)]")}>{card.description}</span>
              </button>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}

function getInitialAIMessage(goal, draftContext) {
  if (draftContext?.sourceCard?.firstQuestion) {
    return {
      role: "ai",
      content: draftContext.sourceCard.firstQuestion,
      suggestions: draftContext.sourceCard.suggestions || [],
    };
  }
  return {
    role: "ai",
    content: getPlanningQuestions(goal, []),
    suggestions: [],
  };
}

function ConversationBuilder({ goal, draftContext, isDark, appColor, accentText, onCancel, onCreate }) {
  const [messages, setMessages] = useState(() => ([
    { role: "user", content: goal },
    getInitialAIMessage(goal, draftContext),
  ]));
  const [answers, setAnswers] = useState([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState(draftContext?.attachments || []);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const enough = hasEnoughPlanContext(goal, answers);

  useEffect(() => {
    if (!generating) return undefined;
    const interval = window.setInterval(() => {
      setGenerationStep((step) => Math.min(step + 1, GENERATION_STEPS.length - 1));
    }, 520);
    return () => window.clearInterval(interval);
  }, [generating]);

  const submitAnswer = (nextInput = input) => {
    const clean = String(nextInput || "").trim();
    if (!clean || generating) return;
    const nextAnswers = [...answers, { question: getPlanningQuestions(goal, answers), content: clean }];
    const nextQuestion = getPlanningQuestions(goal, nextAnswers);
    const nextMessages = [...messages, { role: "user", content: clean }];
    if (nextQuestion) {
      nextMessages.push({ role: "ai", content: nextQuestion, suggestions: [] });
    }
    if (hasEnoughPlanContext(goal, nextAnswers)) {
      nextMessages.push({ role: "ai", content: "I have enough information now. Would you like me to generate your plan?", suggestions: [] });
    }
    setAnswers(nextAnswers);
    setMessages(nextMessages);
    setInput("");
  };

  const generate = () => {
    if (!enough || generating) return;
    setGenerating(true);
    setGenerationStep(0);
    window.setTimeout(() => onCreate(createAIPlanFromConversation(goal, answers, {
      attachments,
      messages,
      selectedQuickCard: draftContext?.sourceCard ? {
        id: draftContext.sourceCard.id,
        title: draftContext.sourceCard.title,
        prompt: draftContext.sourceCard.prompt,
      } : null,
    })), 2300);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center justify-between py-2">
        <button type="button" onClick={onCancel} className={cn("inline-flex h-11 items-center rounded-full px-3 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.menuItem)}>
          <ArrowLeft className={iconClasses.button} />
          Back
        </button>
        <button
          type="button"
          onClick={generate}
          disabled={!enough || generating}
          className={cn("inline-flex h-11 items-center rounded-2xl px-4 font-bold disabled:cursor-not-allowed disabled:opacity-55", iconClasses.iconText, typeClasses.small, interactionClasses.control, !enough && (isDark ? "bg-white/[0.07] text-[var(--bm-text-muted)]" : "bg-[var(--bm-border)] text-[var(--bm-text-secondary)]"))}
          style={enough ? { backgroundColor: appColor, color: accentText } : undefined}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {enough ? "Generate Plan" : "Not enough details yet"}
        </button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto px-1 py-6 sm:px-4">
          <div className="mb-6 text-center">
            <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>AI Plan Builder</p>
            <h1 className={cn("mt-2 font-extrabold tracking-tight", typeClasses.pageTitle)}>BlueMind is building your plan</h1>
            <p className={cn("mx-auto mt-2 max-w-2xl font-semibold", typeClasses.body, "text-[var(--bm-text-secondary)]")}>
              Answer a few quick questions. When there is enough context, BlueMind will turn it into a visual roadmap.
            </p>
          </div>

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}-${message.content}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[86%] font-semibold", typeClasses.body, message.role === "user" ? "rounded-3xl px-4 py-3 text-white" : "px-1 py-2 text-[var(--bm-text-primary)]")} style={message.role === "user" ? { backgroundColor: appColor, color: accentText } : undefined}>
                  <p className="whitespace-pre-wrap leading-7">{message.content}</p>
                  {message.suggestions?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => submitAnswer(suggestion)}
                          className={cn("rounded-full border px-3 py-2 font-bold", typeClasses.small, interactionClasses.menuItem, isDark ? "border-white/[0.08] bg-white/[0.06]" : "border-[var(--bm-border)] bg-white")}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {generating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-3xl border px-5 py-5 text-center", isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-[var(--bm-border)] bg-[var(--bm-bg-app)]")}>
              <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: appColor }} />
              <p className={cn("mt-3 font-extrabold", typeClasses.cardTitle)}>{GENERATION_STEPS[generationStep]}</p>
            </motion.div>
          )}
        </div>

        <div className="pb-4">
          <PlannerComposer
            value={input}
            onChange={setInput}
            onSubmit={() => submitAnswer()}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            placeholder="Answer BlueMind..."
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
            disabled={generating}
          />
        </div>
      </section>
    </div>
  );
}

function Dashboard({ plans, isDark, appColor, accentText, onCreate, onOpen, onEdit, onToggleStatus, onDelete }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>AI Plans</p>
          <h1 className={cn("mt-2 font-extrabold tracking-tight", typeClasses.pageTitle)}>My AI Plans</h1>
          <p className={cn("mt-2 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>Open, edit, track, or continue any plan you created.</p>
        </div>
        <button type="button" onClick={onCreate} className={cn("inline-flex h-12 items-center justify-center rounded-2xl px-5 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.control)} style={{ backgroundColor: appColor, color: accentText }}>
          <Plus className="h-4 w-4" />
          New Plan
        </button>
      </div>

      <div className={cn("grid md:grid-cols-2 xl:grid-cols-3", spacingClasses.cardGap)}>
        {plans.map((plan, index) => {
          const progress = getPlanProgress(plan);
          const status = getPlanStatus(plan);
          return (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionTokens.transition, delay: index * 0.04 }}
              className={cn("rounded-[28px] border shadow-sm", spacingClasses.card, interactionClasses.card, isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className={cn("truncate font-extrabold", typeClasses.cardTitle)}>{plan.title}</h2>
                  <p className={cn("mt-2 line-clamp-2 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{plan.description}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 font-bold", typeClasses.small, status === "Completed" ? "bg-emerald-500/15 text-emerald-400" : status === "Active" ? "bg-sky-500/15 text-sky-400" : "bg-amber-500/15 text-amber-400")}>{status}</span>
              </div>
              <ProgressBar value={progress.percent} appColor={appColor} isDark={isDark} />
              <div className={cn("mt-3 grid grid-cols-3 gap-2 font-bold", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                <span>{progress.percent}%</span>
                <span>{progress.phases} phases</span>
                <span>{progress.total} tasks</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" onClick={() => onOpen(plan.id)} className={cn("rounded-2xl px-3 py-3 font-bold", typeClasses.small, interactionClasses.control)} style={{ backgroundColor: appColor, color: accentText }}>Open Plan</button>
                <button type="button" onClick={() => onEdit(plan.id)} className={cn("rounded-2xl px-3 py-3 font-bold", typeClasses.small, interactionClasses.menuItem, isDark ? "bg-white/[0.07]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-primary)]")}>Edit</button>
                <button type="button" onClick={() => onToggleStatus(plan.id)} disabled={status === "Completed"} className={cn("rounded-2xl px-3 py-3 font-bold disabled:opacity-50", typeClasses.small, interactionClasses.menuItem, isDark ? "bg-white/[0.07]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-primary)]")}>{plan.status === "Paused" ? "Resume" : "Pause"}</button>
                <button type="button" onClick={() => onDelete(plan.id)} className={cn("rounded-2xl bg-red-500/10 px-3 py-3 font-bold text-red-400", typeClasses.small, interactionClasses.menuItem)}>Delete</button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

function PlanDetail({ plan, isDark, appColor, accentText, onBack, onUpdate, onDelete }) {
  const [fullScreen, setFullScreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [instruction, setInstruction] = useState("");
  const progress = getPlanProgress(plan);
  const status = getPlanStatus(plan);

  const updateTask = (phaseId, taskId, patch) => {
    onUpdate({
      ...plan,
      phases: plan.phases.map((phase) => phase.id === phaseId ? {
        ...phase,
        tasks: phase.tasks.map((task) => task.id === taskId ? { ...task, ...patch } : task),
      } : phase),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteTask = (phaseId, taskId) => {
    onUpdate({
      ...plan,
      phases: plan.phases.map((phase) => phase.id === phaseId ? { ...phase, tasks: phase.tasks.filter((task) => task.id !== taskId) } : phase),
      updatedAt: new Date().toISOString(),
    });
  };

  const renameTask = (phaseId, task) => {
    const nextTitle = window.prompt("Edit task", task.title);
    if (nextTitle?.trim()) updateTask(phaseId, task.id, { title: nextTitle.trim() });
  };

  const applyInstruction = (event) => {
    event.preventDefault();
    if (!instruction.trim()) return;
    onUpdate(applyAIPlanInstruction(plan, instruction));
    setInstruction("");
    toast.success("Plan updated");
  };

  return (
    <PageShell isDark={isDark} fullScreen={fullScreen}>
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <button type="button" onClick={onBack} className={cn("mb-4 inline-flex items-center rounded-full px-3 py-2 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.menuItem, isDark ? "bg-white/[0.06]" : "bg-white text-[var(--bm-primary)] shadow-sm")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className={cn("font-extrabold tracking-tight", typeClasses.pageTitle)}>{plan.title}</h1>
            <p className={cn("mt-3 max-w-3xl font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{plan.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Edit3} label="Edit Plan" isDark={isDark} active={editMode} onClick={() => setEditMode((value) => !value)} />
            <ActionButton icon={Expand} label="Full Screen" isDark={isDark} active={fullScreen} onClick={() => setFullScreen((value) => !value)} />
            <ActionButton icon={Save} label="Save" isDark={isDark} onClick={() => toast.success("Plan saved")} />
            <button type="button" onClick={() => onDelete(plan.id)} className={cn("inline-flex h-11 items-center rounded-2xl bg-red-500/10 px-4 font-bold text-red-400", iconClasses.iconText, typeClasses.small, interactionClasses.menuItem)}>
              <Trash2 className="h-4 w-4" />
              Delete Plan
            </button>
          </div>
        </div>

        <div className={cn("mb-6 rounded-[28px] border p-5", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Progress" value={`${progress.percent}%`} isDark={isDark} />
            <Stat label="Phases" value={progress.phases} isDark={isDark} />
            <Stat label="Tasks" value={`${progress.completed}/${progress.total}`} isDark={isDark} />
            <Stat label="Status" value={status} isDark={isDark} />
          </div>
          <div className="mt-5">
            <ProgressBar value={progress.percent} appColor={appColor} isDark={isDark} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4 xl:grid-cols-2">
            {plan.phases.map((phase, index) => {
              const complete = phase.tasks.length > 0 && phase.tasks.every((task) => task.done);
              return (
                <motion.article key={phase.id} layout className={cn("rounded-[26px] border shadow-sm", spacingClasses.card, interactionClasses.card, complete ? "border-emerald-400/30 bg-emerald-500/10" : isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, complete ? "text-emerald-400" : isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Phase {index + 1}</p>
                      <h2 className={cn("mt-1 font-extrabold", typeClasses.sectionTitle)}>{phase.title}</h2>
                      <p className={cn("mt-2 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{phase.description}</p>
                    </div>
                    {complete && <span className={cn("rounded-full bg-emerald-500/15 px-3 py-1 font-bold text-emerald-400", typeClasses.small)}>Completed</span>}
                  </div>
                  <div className="space-y-2">
                    {phase.tasks.map((task) => (
                      <div key={task.id} className={cn("group flex items-center gap-3 rounded-2xl border px-3 py-3", interactionClasses.menuItem, task.done ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : isDark ? "border-white/[0.06] bg-white/[0.035]" : "border-[var(--bm-border)] bg-[var(--bm-bg-app)]")}>
                        <button type="button" onClick={() => updateTask(phase.id, task.id, { done: !task.done })} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", interactionClasses.iconButton, task.done ? "border-emerald-400 bg-emerald-500 text-white" : isDark ? "border-white/[0.12]" : "border-[var(--bm-border-strong)]")}>
                          {task.done ? <Check className="h-4 w-4" /> : null}
                        </button>
                        <span className={cn("min-w-0 flex-1 font-bold", typeClasses.small, task.done && "line-through decoration-emerald-300/70")}>{task.title}</span>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <MiniAction label="Complete" icon={Check} onClick={() => updateTask(phase.id, task.id, { done: true })} />
                          <MiniAction label="Not complete" icon={X} onClick={() => updateTask(phase.id, task.id, { done: false })} />
                          {editMode && <MiniAction label="Edit" icon={Edit3} onClick={() => renameTask(phase.id, task)} />}
                          {editMode && <MiniAction label="Delete" icon={Trash2} danger onClick={() => deleteTask(phase.id, task.id)} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </div>

          <aside className="space-y-4">
            <div className={cn("rounded-[26px] border p-5", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
              <h3 className={cn("flex items-center font-extrabold", iconClasses.iconText, typeClasses.sectionTitle)}><Sparkles className={iconClasses.button} style={{ color: appColor }} />AI Recommendations</h3>
              <div className="mt-4 space-y-2">
                {(plan.recommendations || []).map((item) => (
                  <p key={item} className={cn("rounded-2xl px-3 py-3 font-semibold", typeClasses.body, isDark ? "bg-white/[0.05] text-[var(--bm-text-secondary)]" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]")}>{item}</p>
                ))}
              </div>
            </div>
            <form onSubmit={applyInstruction} className={cn("rounded-[26px] border p-5", isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
              <h3 className={cn("font-extrabold", typeClasses.sectionTitle)}>Improve with AI</h3>
              <p className={cn("mt-2 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>Try: Make this plan simpler, add a testing phase, or split this into two weeks.</p>
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={4}
                className={cn(inputClasses.textarea, "mt-4 resize-none font-semibold", typeClasses.body)}
                placeholder="Add a testing phase..."
              />
              <button type="submit" disabled={!instruction.trim()} className={cn("mt-3 h-11 w-full rounded-2xl font-bold disabled:opacity-50", typeClasses.small, interactionClasses.control)} style={{ backgroundColor: appColor, color: accentText }}>Apply AI Update</button>
            </form>
          </aside>
        </div>
      </motion.section>
    </PageShell>
  );
}

function ActionButton({ icon: Icon, label, isDark, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex h-11 items-center rounded-2xl px-4 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.control, active ? "bg-white text-[var(--bm-text-primary)]" : isDark ? "bg-white/[0.07]" : "bg-white text-[var(--bm-primary)] shadow-sm")}>
      <Icon className={iconClasses.button} />
      {label}
    </button>
  );
}

function MiniAction({ icon: Icon, label, onClick, danger }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cn("flex h-8 w-8 items-center justify-center rounded-full", interactionClasses.iconButton, danger ? "text-red-400" : "")}>
      <Icon className={iconClasses.button} />
    </button>
  );
}

function Stat({ label, value, isDark }) {
  return (
    <div className={cn("rounded-2xl px-4 py-4", isDark ? "bg-white/[0.05]" : "bg-[var(--bm-bg-elevated)]")}>
      <p className={cn("font-bold uppercase tracking-[0.14em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{label}</p>
      <p className={cn("mt-2 font-extrabold", typeClasses.sectionTitle)}>{value}</p>
    </div>
  );
}

export default function AIPlansPage() {
  const { prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const [plans, setPlans] = useState([]);
  const [mode, setMode] = useState("dashboard");
  const [draftGoal, setDraftGoal] = useState("");
  const [draftContext, setDraftContext] = useState(null);
  const [activePlanId, setActivePlanId] = useState("");

  useEffect(() => {
    const loaded = loadAIPlans();
    setPlans(loaded);
    setMode(loaded.length ? "dashboard" : "start");
  }, []);

  useEffect(() => {
    saveAIPlans(plans);
  }, [plans]);

  const activePlan = useMemo(() => plans.find((plan) => plan.id === activePlanId), [plans, activePlanId]);

  const createPlan = (plan) => {
    setPlans((current) => [plan, ...current]);
    setActivePlanId(plan.id);
    setMode("detail");
    toast.success("AI plan created");
  };

  const updatePlan = (updatedPlan) => {
    setPlans((current) => current.map((plan) => plan.id === updatedPlan.id ? updatedPlan : plan));
  };

  const deletePlan = (planId) => {
    if (!window.confirm("Delete this AI plan?")) return;
    setPlans((current) => current.filter((plan) => plan.id !== planId));
    if (activePlanId === planId) {
      setActivePlanId("");
      setMode(plans.length > 1 ? "dashboard" : "start");
    }
    toast.success("Plan deleted");
  };

  const editPlan = (planId) => {
    const plan = plans.find((item) => item.id === planId);
    const nextTitle = window.prompt("Edit plan title", plan?.title || "");
    if (!nextTitle?.trim()) return;
    updatePlan({ ...plan, title: nextTitle.trim(), updatedAt: new Date().toISOString() });
  };

  const toggleStatus = (planId) => {
    setPlans((current) => current.map((plan) => plan.id === planId ? {
      ...plan,
      status: plan.status === "Paused" ? "Active" : "Paused",
      updatedAt: new Date().toISOString(),
    } : plan));
  };

  if (mode === "conversation") {
    return (
      <PageShell isDark={isDark}>
        <ConversationBuilder
          goal={draftGoal}
          draftContext={draftContext}
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          onCancel={() => setMode(plans.length ? "dashboard" : "start")}
          onCreate={createPlan}
        />
      </PageShell>
    );
  }

  if (mode === "detail" && activePlan) {
    return (
      <PlanDetail
        plan={activePlan}
        isDark={isDark}
        appColor={appColor}
        accentText={accentText}
        onBack={() => setMode("dashboard")}
        onUpdate={updatePlan}
        onDelete={deletePlan}
      />
    );
  }

  if (!plans.length || mode === "start") {
    return (
      <PageShell isDark={isDark}>
        <StartScreen
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          onStart={(goal, context) => {
            setDraftGoal(goal);
            setDraftContext(context || null);
            setMode("conversation");
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell isDark={isDark}>
      <Dashboard
        plans={plans}
        isDark={isDark}
        appColor={appColor}
        accentText={accentText}
        onCreate={() => {
          setDraftContext(null);
          setMode("start");
        }}
        onOpen={(planId) => {
          setActivePlanId(planId);
          setMode("detail");
        }}
        onEdit={editPlan}
        onToggleStatus={toggleStatus}
        onDelete={deletePlan}
      />
    </PageShell>
  );
}
