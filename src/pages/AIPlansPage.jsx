import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
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
  Mic,
  MoreVertical,
  Paperclip,
  Plus,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useApp } from "@/context/AppContext";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import BlueMindSendButton from "@/components/BlueMindSendButton";
import BrandLogo from "@/components/BrandLogo";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, motionTokens, spacingClasses, typeClasses } from "@/lib/interactions";
import {
  applyAIPlanInstruction,
  analyzePlanningConversation,
  createAIPlanFromConversation,
  getPlanningQuestions,
  getPlanProgress,
  getPlanStatus,
  hasEnoughPlanContext,
  isPlanGenerationConfirmation,
  loadAIPlans,
  saveAIPlans,
} from "@/services/aiPlansService";
import { streamHiddenChatMessage } from "@/services/chatService";
import { queueFeatureNotification } from "@/services/notificationService";

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
  {
    id: "personal",
    icon: Target,
    title: "Personal",
    description: "Plan personal goals",
    prompt: "Personal Plan",
    firstQuestion: "What personal goal should this plan help you organize?",
    suggestions: ["Daily Routine", "Habits", "Travel", "Budget", "Health", "Productivity", "Life Goals", "Other"],
  },
];

const GENERATION_STEPS = [
  "Generating your plan...",
  "Creating phases...",
  "Organizing tasks...",
  "Finalizing roadmap...",
];

const mobileNeutralGlassSurfaceClass = "border-white/[0.075] bg-[rgba(38,38,38,0.34)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-[24px]";
const mobileNeutralGlassMenuClass = "border-white/[0.08] bg-[rgba(28,28,28,0.78)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-[28px]";

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

function formatPlanCreatedParts(value) {
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
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
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
  disabled = false,
  compact = false,
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
      <div className={cn(
        "border shadow-[0_22px_70px_rgba(0,0,0,0.14)]",
        compact ? "rounded-[30px] p-2.5" : "rounded-[32px] p-3",
        isDark ? "border-white/[0.08] bg-white/[0.075] backdrop-blur-[28px]" : "border-[var(--bm-border)] bg-white"
      )}>
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
          rows={compact ? 1 : 3}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            inputClasses.composer,
            "w-full resize-none bg-transparent font-semibold outline-none",
            compact ? "max-h-32 min-h-[48px] px-3 py-3 leading-6" : "max-h-48 min-h-[96px] px-2 py-2 leading-7",
            typeClasses.body,
            isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]"
          )}
        />

        <div className={cn("flex items-center gap-2", compact ? "mt-1" : "mt-2")}>
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

          {!compact && (
            <span className={cn("font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
              {attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} ready` : "Add context for a better plan"}
            </span>
          )}

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
          <BlueMindSendButton
            canSend={Boolean(value.trim() || attachments.length) && !disabled}
            appColor={appColor}
            sendLabel="Send plan goal"
          />
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

function StartScreen({ isDark, appColor, accentText, onStart, onBack, mobile = false }) {
  const [goal, setGoal] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    if (mobile) return undefined;

    const interval = window.setInterval(() => {
      setSuggestionIndex((index) => (index + 1) % ROTATING_PLAN_SUGGESTIONS.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [mobile]);

  const submit = (nextGoal = goal, sourceCard = null) => {
    const cleanGoal = String(nextGoal || "").trim();
    if (cleanGoal || attachments.length) {
      onStart(cleanGoal || "Create a plan from my attachments", {
        sourceCard,
        attachments: attachments.map(({ file, previewUrl, ...metadata }) => metadata),
      });
    }
  };

  if (!mobile) {
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
                  <span className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--bm-icon-primary)]", isDark ? "bg-white/[0.07]" : "bg-[var(--bm-hover-bg)]")}>
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center py-2">
        <button type="button" onClick={onBack} className="bm-mobile-glass-control" aria-label="Back">
          <ArrowLeft />
        </button>
        <div />
        <div />
      </header>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center py-5 text-center">
        <BrandLogo showName={false} small logoClassName="h-16 w-16" />
        <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-tight">Create AI Plan</h1>
        <p className="mt-2 text-sm font-medium text-[var(--bm-text-secondary)]">Tell BlueMind what you want to organize.</p>

        <div className="mt-6 w-full overflow-hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PLAN_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => submit(card.prompt, card)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97]",
                  isDark
                    ? "border-white/[0.08] bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-[24px]"
                    : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)] shadow-sm"
                )}
              >
                {card.title.replace(" Plan", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 w-full">
          <PlannerComposer
            value={goal}
            onChange={setGoal}
            onSubmit={() => submit()}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            placeholder="Tell BlueMind what you want to plan..."
            isDark={isDark}
            appColor={appColor}
            compact
          />
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
      question: draftContext.sourceCard.firstQuestion,
    };
  }
  const analysis = analyzePlanningConversation(goal, []);
  return {
    role: "ai",
    content: analysis.content,
    suggestions: analysis.suggestions || [],
    question: analysis.question,
    slotId: analysis.slot?.id,
  };
}

function buildPlanningAssistantPrompt({ goal, answers, latestAnswer, analysis }) {
  return [
    "You are BlueMind AI inside AI Plans.",
    "Act like an intelligent planning assistant, not a fixed questionnaire.",
    "The frontend planning analyzer has already chosen the next action. Follow that action exactly.",
    "Write one short, friendly assistant message only. Do not include JSON. Do not include a plan yet.",
    "",
    `User goal: ${goal}`,
    `Latest user answer: ${latestAnswer}`,
    `Collected answers: ${answers.map((answer, index) => `${index + 1}. ${answer.question || "Answer"}: ${answer.content}`).join(" | ") || "None"}`,
    `Next action: ${analysis.action}`,
    `Required meaning: ${analysis.content}`,
    analysis.question ? `Question to ask: ${analysis.question}` : "",
    analysis.canGenerate ? "If asking for confirmation, clearly say you have enough information and the user can reply Yes/Go ahead to generate automatically." : "",
    "If the answer was unclear, kindly ask for clarification.",
  ].filter(Boolean).join("\n");
}

async function getPlanningAssistantReply({ goal, answers, latestAnswer, analysis }) {
  let text = "";
  await streamHiddenChatMessage({
    message: buildPlanningAssistantPrompt({ goal, answers, latestAnswer, analysis }),
    mode: "work",
    metadata: {
      source: "ai_plans_builder",
      aiPlans: true,
      planningAction: analysis.action,
      planningCanGenerate: analysis.canGenerate,
      hiddenChat: true,
    },
    onDelta: (payload) => {
      text += payload?.token || "";
    },
    onComplete: (payload) => {
      if (!text.trim()) {
        text = payload?.message?.content || "";
      }
    },
  });
  return text.trim();
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
  const [isPlanningAiThinking, setIsPlanningAiThinking] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const planningResponseTimerRef = useRef(null);
  const planningSendLockRef = useRef(false);
  const enough = hasEnoughPlanContext(goal, answers);
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "ai" && !message.isThinking);

  useEffect(() => {
    if (!generating) return undefined;
    const interval = window.setInterval(() => {
      setGenerationStep((step) => Math.min(step + 1, GENERATION_STEPS.length - 1));
    }, 520);
    return () => window.clearInterval(interval);
  }, [generating]);

  useEffect(() => () => {
    if (planningResponseTimerRef.current) {
      window.clearTimeout(planningResponseTimerRef.current);
    }
  }, []);

  const generateFrom = (sourceAnswers = answers, sourceMessages = messages) => {
    if (!hasEnoughPlanContext(goal, sourceAnswers) || generating || isPlanningAiThinking) return;
    setGenerating(true);
    setGenerationStep(0);
    window.setTimeout(() => onCreate(createAIPlanFromConversation(goal, sourceAnswers, {
      attachments,
      messages: sourceMessages,
      selectedQuickCard: draftContext?.sourceCard ? {
        id: draftContext.sourceCard.id,
        title: draftContext.sourceCard.title,
        prompt: draftContext.sourceCard.prompt,
      } : null,
    })), 2300);
  };

  const submitAnswer = (nextInput = input) => {
    const clean = String(nextInput || "").trim();
    if (!clean || generating || isPlanningAiThinking || planningSendLockRef.current) return;
    planningSendLockRef.current = true;

    if (isPlanGenerationConfirmation(clean) && enough) {
      const nextMessages = [
        ...messages,
        { role: "user", content: clean },
        { role: "ai", content: "Generating your personalized plan...", suggestions: [] },
      ];
      setMessages(nextMessages);
      setInput("");
      planningSendLockRef.current = false;
      generateFrom(answers, nextMessages);
      return;
    }

    const activeQuestion = lastAssistantMessage?.question || lastAssistantMessage?.content || getPlanningQuestions(goal, answers);
    const nextAnswers = [...answers, { question: activeQuestion, slotId: lastAssistantMessage?.slotId, content: clean }];
    const analysis = analyzePlanningConversation(goal, nextAnswers, clean);
    const nextMessages = [...messages, { role: "user", content: clean }, { role: "ai", content: "", isThinking: true }];
    setAnswers(nextAnswers);
    setMessages(nextMessages);
    setInput("");
    setIsPlanningAiThinking(true);

    planningResponseTimerRef.current = window.setTimeout(async () => {
      const aiContent = await getPlanningAssistantReply({
        goal,
        answers: nextAnswers,
        latestAnswer: clean,
        analysis,
      }).catch(() => analysis.content);

      setMessages((current) => [
        ...current.filter((message) => !message.isThinking),
        {
          role: "ai",
          content: aiContent || analysis.content,
          suggestions: analysis.suggestions || [],
          question: analysis.question,
          slotId: analysis.slot?.id,
          canGenerate: analysis.canGenerate,
        },
      ]);
      setIsPlanningAiThinking(false);
      planningSendLockRef.current = false;
    }, 220);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center justify-between py-2">
        <button type="button" onClick={onCancel} className={cn("inline-flex h-11 items-center rounded-full px-3 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.menuItem)}>
          <ArrowLeft className={iconClasses.button} />
          Back
        </button>
        <div
          className={cn("inline-flex h-11 items-center rounded-2xl px-4 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.control, !enough && (isDark ? "bg-white/[0.07] text-[var(--bm-text-muted)]" : "bg-[var(--bm-border)] text-[var(--bm-text-secondary)]"))}
          style={enough ? { backgroundColor: appColor, color: accentText } : undefined}
        >
          {generating ? <BlueMindLoadingDots /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating..." : enough ? "Reply Yes to generate" : "Collecting details"}
        </div>
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
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.isThinking ? (
                  <ThinkingIndicator className="mb-0" />
                ) : (
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
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {generating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-3xl border px-5 py-5 text-center", isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-[var(--bm-border)] bg-[var(--bm-bg-app)]")}>
              <BlueMindLoadingDots className="mx-auto text-[var(--bm-primary)]" />
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
            disabled={generating || isPlanningAiThinking}
          />
        </div>
      </section>
    </div>
  );
}

function PlanHomeCard({ plan, index, isDark, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const created = formatPlanCreatedParts(plan.createdAt || plan.updatedAt);

  return (
    <motion.article
      key={plan.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ ...motionTokens.transition, delay: index * 0.035 }}
      onClick={() => onOpen(plan.id)}
      className={cn(
        "relative cursor-pointer rounded-[24px] border p-4 shadow-sm transition",
        isDark ? mobileNeutralGlassSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-[22px]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-1">
          <h2 className="truncate text-[15px] font-semibold">{plan.title}</h2>
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
            aria-label="AI plan actions"
          >
            <MoreVertical className={iconClasses.button} />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close AI plan menu"
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
                    onOpen(plan.id);
                    setMenuOpen(false);
                  }}
                  className={cn("w-full px-4 py-3 text-left text-sm", isDark ? "text-white hover:bg-white/[0.08]" : "hover:bg-[#2F7DF6]/[0.08]")}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(plan.id);
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

function Dashboard({ plans, isDark, onCreate, onOpen, onBack, onDelete }) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return plans;
    return plans.filter((plan) => String(plan.title || "").toLowerCase().includes(query));
  }, [plans, searchQuery]);

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-5 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
        <button type="button" onClick={onBack} className="bm-mobile-glass-control" aria-label="Back">
          <ArrowLeft />
        </button>
        <h1 className="truncate text-center text-lg font-semibold tracking-tight">AI Plans</h1>
        <button type="button" onClick={onCreate} className="bm-mobile-glass-control" aria-label="Create AI plan">
          <Plus />
        </button>
      </header>

      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white"
        />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search AI plans"
          className={cn(
            inputClasses.search,
            typeClasses.body,
            "pl-14 pr-4 font-semibold backdrop-blur-[24px]",
            isDark
              ? `${mobileNeutralGlassSurfaceClass} placeholder:text-white/42`
              : "border-black/[0.06] bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_12px_28px_rgba(15,23,42,0.08)]",
          )}
          data-testid="mobile-ai-plans-search"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {filteredPlans.map((plan, index) => (
            <PlanHomeCard
              key={plan.id}
              plan={plan}
              index={index}
              isDark={isDark}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredPlans.length === 0 && (
        <section className="py-14 text-center">
          <h2 className="text-base font-semibold">No matching AI plans</h2>
          <p className={cn("mx-auto mt-2 max-w-[260px] text-sm leading-6", isDark ? "text-white/[0.55]" : "text-[var(--bm-text-secondary)]")}>
            Try a different plan name.
          </p>
        </section>
      )}
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
            <button type="button" onClick={onBack} className={cn("mb-4 inline-flex items-center rounded-full px-3 py-2 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.menuItem, isDark ? "bg-white/[0.06]" : "bg-white text-[var(--bm-text-primary)] shadow-sm")}>
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
                          {task.done ? <Check className="h-5 w-5 stroke-[3]" /> : null}
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
              <h3 className={cn("flex items-center font-extrabold", iconClasses.iconText, typeClasses.sectionTitle)}><Sparkles className={cn(iconClasses.button, "text-[var(--bm-icon-primary)]")} />AI Recommendations</h3>
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
    <button type="button" onClick={onClick} className={cn("inline-flex h-11 items-center rounded-2xl px-4 font-bold", iconClasses.iconText, typeClasses.small, interactionClasses.control, active ? "bg-[var(--bm-selected-bg)] text-[var(--bm-selected-text)]" : isDark ? "bg-white/[0.07]" : "bg-white text-[var(--bm-text-primary)] shadow-sm")}>
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
  const navigate = useNavigate();
  const location = useLocation();
  const { prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const isMobileRoute = location.pathname.startsWith("/mobile");
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
    queueFeatureNotification({
      type: "ai_plans",
      sourceId: plan.id,
      source: {
        planTitle: plan.title,
        status: plan.status || "ready",
        deepLink: "/mobile/ai-plans",
      },
      dedupeKey: `ai_plans:${plan.id}:ready`,
    }).catch(() => {
      // Plan creation should not fail if notification delivery is unavailable.
    });
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
          mobile={isMobileRoute}
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          onBack={() => {
            if (plans.length) {
              setMode("dashboard");
              return;
            }
            navigate(-1);
          }}
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
        onCreate={() => {
          setDraftContext(null);
          setMode("start");
        }}
        onOpen={(planId) => {
          setActivePlanId(planId);
          setMode("detail");
        }}
        onBack={() => navigate(-1)}
        onDelete={deletePlan}
      />
    </PageShell>
  );
}
