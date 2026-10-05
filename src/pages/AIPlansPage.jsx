import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  Camera,
  Check,
  Edit3,
  Expand,
  FileText,
  Globe2,
  Dumbbell,
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
import UnifiedComposer from "@/components/UnifiedComposer";
import MobileNotificationControlCard from "@/mobile/components/MobileNotificationControlCard";
import IOSNativeGlassButton from "@/mobile/components/IOSNativeGlassButton";
import { isNativeIOSApp } from "@/capacitorRuntime";
import {
  addNativeGlassActionListener,
  prepareNativeGlassExperiment,
  presentNativeIOSConfirmation,
  presentNativeIOSSelection,
  presentNativeIOSTextPrompt,
  presentNativeIOSWritingAttachmentPicker,
  setNativeGlassVisible,
  updateNativeGlassState,
} from "@/mobile/nativeGlassBridge";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, interactionClasses, motionTokens, spacingClasses, typeClasses } from "@/lib/interactions";
import { getApiErrorMessage } from "@/services/api";
import { BLUE_MIND_COLORS } from "@/theme/colors";
import {
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
import {
  getNotificationDebugSnapshot,
  getNotificationStatus,
  inspectNotificationSetup,
  queueFeatureNotification,
  sendTestNotification,
  setupReminderNotifications,
} from "@/services/notificationService";

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
    icon: BookOpen,
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
    icon: Dumbbell,
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
  {
    id: "other",
    icon: Sparkles,
    title: "Other",
    description: "Plan any goal with BlueMind",
    prompt: "Help me create a plan for",
    firstQuestion: "What would you like this plan to help you accomplish?",
    suggestions: ["Project", "Learning", "Work", "Personal Goal", "Other"],
  },
];

const GENERATION_STEPS = [
  "Generating your plan...",
  "Creating phases...",
  "Organizing tasks...",
  "Finalizing roadmap...",
];

const mobileNeutralGlassSurfaceClass = "border-white/[0.075] bg-[rgba(38,38,38,0.34)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-[24px]";
const mobileScheduleCardSurfaceClass = "border-white/[0.085] bg-[rgba(31,31,33,0.84)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_34px_rgba(0,0,0,0.20)] backdrop-blur-[24px]";
const mobileNeutralGlassMenuClass = "border-white/[0.08] bg-[rgba(28,28,28,0.78)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-[28px]";
const mobileGlassControlClass = "bm-mobile-glass-control";

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
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function startPlanVoiceInput({ value, onChange, onListeningChange }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast.info("Voice input is not available on this device yet.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;
  recognition.onstart = () => onListeningChange?.(true);
  recognition.onend = () => onListeningChange?.(false);
  recognition.onerror = () => {
    onListeningChange?.(false);
    toast.error("Voice input could not start.");
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results || []).map((result) => result[0]?.transcript || "").join(" ").trim();
    if (transcript) onChange(value ? `${value} ${transcript}` : transcript);
  };
  recognition.start();
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
  mobile = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const imageRef = useRef(null);
  const fileRef = useRef(null);
  const isMobileComposer = mobile || compact;
  const mobileGlassIconStyle = {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(255,255,255,0.018), inset 1px 0 0 rgba(255,255,255,0.035), inset -1px 0 0 rgba(255,255,255,0.03), 0 12px 28px rgba(0,0,0,0.23)",
    backdropFilter: "blur(42px) saturate(1.18)",
    WebkitBackdropFilter: "blur(42px) saturate(1.18)",
  };
  const mobileComposerGlassStyle = {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.016), inset 1px 0 0 rgba(255,255,255,0.032), inset -1px 0 0 rgba(255,255,255,0.026), 0 20px 58px rgba(0,0,0,0.28)",
    backdropFilter: "blur(42px) saturate(1.16)",
    WebkitBackdropFilter: "blur(42px) saturate(1.16)",
  };

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
    startPlanVoiceInput({ value, onChange, onListeningChange: setListening });
    setMenuOpen(false);
  };

  return (
    <form
      className={cn("relative mx-auto w-full", isMobileComposer ? "max-w-md" : "max-w-3xl")}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className={cn(
        "border shadow-[0_22px_70px_rgba(0,0,0,0.14)]",
        isMobileComposer
          ? "rounded-[28px] border-white/[0.055] bg-[rgba(78,78,78,0.18)] px-3 py-2 text-white/90 backdrop-blur-[42px]"
          : compact ? "rounded-[30px] p-2.5" : "rounded-[32px] p-3",
        !isMobileComposer && (isDark ? "border-white/[0.08] bg-white/[0.075] backdrop-blur-[28px]" : "border-[var(--bm-border)] bg-white")
      )}
      style={isMobileComposer ? mobileComposerGlassStyle : undefined}
      >
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
            isMobileComposer ? "max-h-32 min-h-[44px] px-1 py-1 text-[16px] leading-6" : compact ? "max-h-32 min-h-[48px] px-3 py-3 leading-6" : "max-h-48 min-h-[96px] px-2 py-2 leading-7",
            typeClasses.body,
            isMobileComposer ? "text-white/90 placeholder:text-[#8F8F8F]" : isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]"
          )}
        />

        <div className={cn("flex items-center", isMobileComposer ? "mt-1.5 min-h-10 gap-2.5" : compact ? "mt-1 gap-2" : "mt-2 gap-2")}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={cn(
                "flex items-center justify-center rounded-full",
                isMobileComposer ? "bm-mobile-glass-control" : "h-11 w-11",
                !isMobileComposer && interactionClasses.iconButton,
                !isMobileComposer && (isDark ? "bg-white/[0.07] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")
              )}
              style={isMobileComposer ? mobileGlassIconStyle : undefined}
              aria-label="Open plan input tools"
            >
              <Plus className={isMobileComposer ? "" : iconClasses.button} />
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn("absolute bottom-[3.5rem] left-0 z-20 w-56 rounded-3xl border p-2 shadow-2xl", isDark ? "border-white/[0.08] bg-[rgba(28,28,28,0.78)] text-white backdrop-blur-[28px]" : "border-[var(--bm-border)] bg-white")}
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
            className={cn(
              "flex items-center justify-center rounded-full",
              isMobileComposer ? "bm-mobile-glass-control" : "h-11 w-11",
              !isMobileComposer && interactionClasses.iconButton,
              listening ? "text-white" : isMobileComposer ? "" : "text-[var(--bm-text-secondary)]"
            )}
            style={listening ? { backgroundColor: appColor } : isMobileComposer ? mobileGlassIconStyle : undefined}
            aria-label="Start voice input"
          >
            <Mic className={isMobileComposer ? "" : iconClasses.button} />
          </button>
          <BlueMindSendButton
            canSend={Boolean(value.trim() || attachments.length) && !disabled}
            appColor={appColor}
            sendLabel="Send plan goal"
            compact={isMobileComposer}
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

function StartScreen({ isDark, appColor, accentText, onStart, onBack, mobile = false, nativeIOS = false, nativeHandlerRef }) {
  const [goal, setGoal] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [selectedPlanTypeId, setSelectedPlanTypeId] = useState("study");
  const [nativeComposerActive, setNativeComposerActive] = useState(false);
  const [nativeListening, setNativeListening] = useState(false);
  const nativeCameraRef = useRef(null);
  const nativePhotosRef = useRef(null);
  const nativeFilesRef = useRef(null);

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

  const addNativeFiles = (files, type) => {
    const next = Array.from(files || []).map((file) => fileToAttachment(file, type));
    if (next.length) setAttachments((current) => [...current, ...next]);
  };

  useEffect(() => {
    if (!mobile || !nativeIOS) return undefined;
    let cancelled = false;
    void prepareNativeGlassExperiment().then((supported) => {
      if (cancelled) return;
      setNativeComposerActive(supported);
      if (supported) void setNativeGlassVisible(true);
    });
    return () => {
      cancelled = true;
      if (nativeHandlerRef) nativeHandlerRef.current = null;
      void setNativeGlassVisible(false);
    };
  }, [mobile, nativeHandlerRef, nativeIOS]);

  useEffect(() => {
    if (!nativeComposerActive) return;
    const selectedType = QUICK_PLAN_CARDS.find((item) => item.id === selectedPlanTypeId) || QUICK_PLAN_CARDS[0];
    void updateNativeGlassState({
      text: goal,
      canSend: Boolean(goal.trim() || attachments.length),
      isSending: false,
      isListening: nativeListening,
      voiceStatus: nativeListening ? "listening" : "idle",
      voiceTranscript: "",
      attachments: [],
      isUploadingAttachments: false,
      isComposerVisible: true,
      isHeaderVisible: true,
      isMenuOpen: false,
      isDark,
      isRTL: false,
      accentColor: appColor,
      brandPrimaryColor: BLUE_MIND_COLORS.primary,
      isWritingMode: false,
      isAIPlanMode: true,
      placeholder: "Tell BlueMind what you want to plan…",
      headerTitlePrefix: "AI Plan",
      quickActions: ["Study", "Website", "Programming", "Personal"],
      selectedMode: selectedType.id,
      modes: QUICK_PLAN_CARDS.map((item) => ({ id: item.id, title: item.title.replace(" Plan", "") })),
    });
  }, [appColor, attachments.length, goal, isDark, nativeComposerActive, nativeListening, selectedPlanTypeId]);

  if (nativeHandlerRef) {
    nativeHandlerRef.current = async (event) => {
      const selectedType = QUICK_PLAN_CARDS.find((item) => item.id === selectedPlanTypeId) || QUICK_PLAN_CARDS[0];
      if (event?.action === "textChanged") setGoal(String(event.text || ""));
      if (event?.action === "selectMode" && QUICK_PLAN_CARDS.some((item) => item.id === event.mode)) setSelectedPlanTypeId(event.mode);
      if (event?.action === "send") submit(String(event.text || goal), selectedType);
      if (event?.action === "menu") onBack();
      if (event?.action === "aiPlanCamera") nativeCameraRef.current?.click();
      if (event?.action === "aiPlanPhotos") nativePhotosRef.current?.click();
      if (event?.action === "aiPlanFiles") nativeFilesRef.current?.click();
      if (event?.action === "microphone") startPlanVoiceInput({ value: goal, onChange: setGoal, onListeningChange: setNativeListening });
      if (event?.action === "aiPlanQuickAction") {
        const match = QUICK_PLAN_CARDS.find((item) => item.title.replace(" Plan", "") === event.text);
        if (match) {
          setSelectedPlanTypeId(match.id);
          setGoal(match.prompt);
        }
      }
      if (event?.action === "aiPlanTools") {
        await presentNativeIOSSelection({
          title: "AI Plan Tools",
          selectedValue: "",
          requestId: "ai-plan-tools",
          options: [
            { value: "improve", label: "Improve Plan", symbol: "wand.and.stars" },
            { value: "type", label: "Change Plan Type", symbol: "list.bullet" },
            { value: "new", label: "Start New AI Plan", symbol: "plus" },
            { value: "refine", label: "Refine Goal", symbol: "scope" },
          ],
        });
      }
      if (event?.action === "settingsSelection" && event.requestId === "ai-plan-tools") {
        if (event.value === "new") setGoal("");
        if (event.value === "type") {
          await presentNativeIOSSelection({
            title: "Plan Type",
            selectedValue: selectedPlanTypeId,
            requestId: "ai-plan-type",
            options: QUICK_PLAN_CARDS.map((item) => ({ value: item.id, label: item.title.replace(" Plan", ""), symbol: "list.bullet" })),
          });
        }
        if (event.value === "improve" || event.value === "refine") setGoal((current) => current || "Help me refine this plan goal: ");
      }
      if (event?.action === "settingsSelection" && event.requestId === "ai-plan-type" && QUICK_PLAN_CARDS.some((item) => item.id === event.value)) setSelectedPlanTypeId(event.value);
    };
  }

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
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col pb-[132px]">
      <header className="bm-web-chat-header grid grid-cols-[44px_minmax(0,1fr)_44px] items-center py-2">
        <button type="button" onClick={onBack} className="bm-mobile-glass-control" aria-label="Back">
          <ArrowLeft />
        </button>
        <div />
        <div />
      </header>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center pt-2 text-center">
        <BrandLogo showName={false} small logoClassName="h-16 w-16" />
        <h1 className="mt-5 text-[24px] font-semibold leading-tight tracking-tight">AI Plan</h1>
        <p className="mt-2 text-sm font-medium text-[var(--bm-text-secondary)]">Build, organize, and improve your plan with BlueMind.</p>

        <div className="bm-web-chat-composer fixed inset-x-4 bottom-[max(10px,env(safe-area-inset-bottom))] z-30">
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
            mobile
          />
        </div>
        <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => addNativeFiles(event.target.files, "image")} />
        <input ref={nativePhotosRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => addNativeFiles(event.target.files, "image")} />
        <input ref={nativeFilesRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.xls,.xlsx,.ppt,.pptx" multiple className="hidden" onChange={(event) => addNativeFiles(event.target.files, "file")} />
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

function ConversationBuilder({ goal, draftContext, isDark, appColor, accentText, onCancel, onCreate, mobile = false, nativeIOS = false, nativeHandlerRef }) {
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
  const [selectedPlanTypeId, setSelectedPlanTypeId] = useState(draftContext?.sourceCard?.id || "study");
  const [nativeComposerActive, setNativeComposerActive] = useState(false);
  const [nativeListening, setNativeListening] = useState(false);
  const nativeCameraRef = useRef(null);
  const nativePhotosRef = useRef(null);
  const nativeFilesRef = useRef(null);
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
      selectedQuickCard: (QUICK_PLAN_CARDS.find((item) => item.id === selectedPlanTypeId) || draftContext?.sourceCard) ? {
        id: (QUICK_PLAN_CARDS.find((item) => item.id === selectedPlanTypeId) || draftContext.sourceCard).id,
        title: (QUICK_PLAN_CARDS.find((item) => item.id === selectedPlanTypeId) || draftContext.sourceCard).title,
        prompt: (QUICK_PLAN_CARDS.find((item) => item.id === selectedPlanTypeId) || draftContext.sourceCard).prompt,
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

  const addNativeFiles = (files, type) => {
    const next = Array.from(files || []).map((file) => fileToAttachment(file, type));
    if (next.length) setAttachments((current) => [...current, ...next]);
  };

  useEffect(() => {
    if (!mobile || !nativeIOS) return undefined;
    let cancelled = false;
    void prepareNativeGlassExperiment().then((supported) => {
      if (cancelled) return;
      setNativeComposerActive(supported);
      if (supported) void setNativeGlassVisible(true);
    });
    return () => {
      cancelled = true;
      if (nativeHandlerRef) nativeHandlerRef.current = null;
      void setNativeGlassVisible(false);
    };
  }, [mobile, nativeHandlerRef, nativeIOS]);

  useEffect(() => {
    if (!nativeComposerActive) return;
    void updateNativeGlassState({
      text: input,
      canSend: Boolean(input.trim() || attachments.length) && !generating && !isPlanningAiThinking,
      isSending: generating || isPlanningAiThinking,
      isListening: nativeListening,
      voiceStatus: nativeListening ? "listening" : "idle",
      voiceTranscript: "",
      attachments: [],
      isUploadingAttachments: false,
      isComposerVisible: true,
      isHeaderVisible: true,
      isMenuOpen: false,
      isDark,
      isRTL: false,
      accentColor: appColor,
      brandPrimaryColor: BLUE_MIND_COLORS.primary,
      isWritingMode: false,
      isAIPlanMode: true,
      placeholder: "Tell BlueMind what you want to plan…",
      headerTitlePrefix: "AI Plan",
      quickActions: [],
      selectedMode: selectedPlanTypeId,
      modes: QUICK_PLAN_CARDS.map((item) => ({ id: item.id, title: item.title.replace(" Plan", "") })),
    });
  }, [appColor, attachments.length, generating, input, isDark, isPlanningAiThinking, nativeComposerActive, nativeListening, selectedPlanTypeId]);

  if (nativeHandlerRef) {
    nativeHandlerRef.current = async (event) => {
      if (event?.action === "textChanged") setInput(String(event.text || ""));
      if (event?.action === "selectMode" && QUICK_PLAN_CARDS.some((item) => item.id === event.mode)) setSelectedPlanTypeId(event.mode);
      if (event?.action === "send") submitAnswer(String(event.text || input));
      if (event?.action === "menu") onCancel();
      if (event?.action === "aiPlanCamera") nativeCameraRef.current?.click();
      if (event?.action === "aiPlanPhotos") nativePhotosRef.current?.click();
      if (event?.action === "aiPlanFiles") nativeFilesRef.current?.click();
      if (event?.action === "microphone") startPlanVoiceInput({ value: input, onChange: setInput, onListeningChange: setNativeListening });
      if (event?.action === "aiPlanTools") {
        await presentNativeIOSSelection({
          title: "AI Plan Tools",
          selectedValue: "",
          requestId: "ai-plan-tools",
          options: [
            { value: "improve", label: "Improve Plan", symbol: "wand.and.stars" },
            { value: "type", label: "Change Plan Type", symbol: "list.bullet" },
            { value: "new", label: "Start New AI Plan", symbol: "plus" },
            { value: "refine", label: "Refine Goal", symbol: "scope" },
          ],
        });
      }
      if (event?.action === "settingsSelection" && event.requestId === "ai-plan-tools") {
        if (event.value === "new") onCancel();
        if (event.value === "type") {
          await presentNativeIOSSelection({
            title: "Plan Type",
            selectedValue: selectedPlanTypeId,
            requestId: "ai-plan-type",
            options: QUICK_PLAN_CARDS.map((item) => ({ value: item.id, label: item.title.replace(" Plan", ""), symbol: "list.bullet" })),
          });
        }
        if (event.value === "improve" || event.value === "refine") setInput("Help me refine this plan based on our conversation.");
      }
      if (event?.action === "settingsSelection" && event.requestId === "ai-plan-type" && QUICK_PLAN_CARDS.some((item) => item.id === event.value)) setSelectedPlanTypeId(event.value);
    };
  }

  return (
    <div className={cn("flex flex-col", mobile ? "min-h-[calc(100dvh-3rem)] pb-[132px]" : "min-h-[calc(100vh-4rem)]")}>
      <header className="bm-web-chat-header flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(mobile ? "bm-mobile-glass-control" : "inline-flex h-11 items-center rounded-full px-3 font-bold", !mobile && iconClasses.iconText, !mobile && typeClasses.small, !mobile && interactionClasses.menuItem)}
          aria-label="Back"
        >
          <ArrowLeft className={mobile ? "" : iconClasses.button} />
          {!mobile && "Back"}
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
          {!mobile && <div className="mb-6 text-center">
            <p className={cn("font-bold uppercase tracking-[0.16em]", typeClasses.small, "text-[var(--bm-text-muted)]")}>AI Plan Builder</p>
            <h1 className={cn("mt-2 font-extrabold tracking-tight", mobile ? "text-[24px] leading-tight" : typeClasses.pageTitle)}>BlueMind is building your plan</h1>
            <p className={cn("mx-auto mt-2 max-w-2xl font-semibold", mobile ? "text-sm leading-6" : typeClasses.body, "text-[var(--bm-text-secondary)]")}>
              Answer a few quick questions. When there is enough context, BlueMind will turn it into a visual roadmap.
            </p>
          </div>}

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

        <div className={cn(mobile ? "bm-web-chat-composer fixed inset-x-4 bottom-[max(10px,env(safe-area-inset-bottom))] z-30" : "pb-4")}>
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
            compact={mobile}
            mobile={mobile}
          />
        </div>
        {mobile && (
          <>
            <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => addNativeFiles(event.target.files, "image")} />
            <input ref={nativePhotosRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => addNativeFiles(event.target.files, "image")} />
            <input ref={nativeFilesRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.xls,.xlsx,.ppt,.pptx" multiple className="hidden" onChange={(event) => addNativeFiles(event.target.files, "file")} />
          </>
        )}
      </section>
    </div>
  );
}

function PlanHomeCard({ plan, index, isDark, onOpen, onDelete, onRename, nativeIOS, onOpenNativeActions }) {
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
        "relative w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-[24px] border p-4 shadow-sm",
        isDark ? mobileScheduleCardSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-[22px]",
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

        <div className="relative shrink-0">
          {nativeIOS ? (
            <IOSNativeGlassButton
              id={`ai-plan-actions-${plan.id}`}
              symbol="ellipsis"
              label={`Actions for ${plan.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenNativeActions(plan, event.currentTarget);
              }}
              className="bm-mobile-glass-control"
              isDark={isDark}
            >
              <MoreVertical className={iconClasses.button} />
            </IOSNativeGlassButton>
          ) : (
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
          )}

          {!nativeIOS && menuOpen && (
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
                    onRename(plan);
                    setMenuOpen(false);
                  }}
                  className={cn("w-full px-4 py-3 text-left text-sm", isDark ? "text-white hover:bg-white/[0.08]" : "hover:bg-[#2F7DF6]/[0.08]")}
                >
                  Rename
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

function AIPlansInfoPanel({ debug, busy, isDark, appColor, onEnable, onRefresh, onTest, nativeIOS }) {
  return (
    <MobileNotificationControlCard
      title="AI Plans Notifications"
      description="Manage AI plan notification delivery for this section."
      debug={debug}
      busy={busy}
      isDark={isDark}
      appColor={appColor}
      onEnable={onEnable}
      onRefresh={onRefresh}
      onTest={onTest}
      testId="mobile-ai-plans-info-panel"
      nativeGlass={nativeIOS}
    />
  );
}

function Dashboard({ plans, isDark, appColor, onCreate, onOpen, onBack, onDelete, onRename, onOpenNativeActions, nativeIOS = false, mobile = false, notificationDebug, notificationBusy, onEnableNotifications, onRefreshNotifications, onTestNotification }) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return plans;
    return plans.filter((plan) => (
      String(plan.title || "").toLocaleLowerCase().includes(query)
      || String(plan.description || "").toLocaleLowerCase().includes(query)
    ));
  }, [plans, searchQuery]);

  if (mobile) {
    return (
      <div
        className={cn(
          "min-h-[100dvh] pb-[max(24px,env(safe-area-inset-bottom))]",
          isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]",
        )}
        data-testid="mobile-ai-plans-page"
      >
        <header
          className={cn(
            "sticky top-0 z-20 border-b px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl",
            isDark ? "border-white/10 bg-[var(--bm-bg-app)]/92" : "border-black/[0.08] bg-[var(--bm-bg-app)]/92",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <IOSNativeGlassButton id="ai-plans-back" symbol="arrow.left" label="Back to chat" onClick={onBack} className={cn(mobileGlassControlClass)} isDark={isDark}>
                <ArrowLeft className="h-5 w-5" />
              </IOSNativeGlassButton>
              <div className="min-w-0">
                <p className={cn("text-xs font-medium", isDark ? "text-white/[0.48]" : "text-[var(--bm-text-secondary)]")}>
                  BlueMind AI
                </p>
                <h1 className="truncate text-xl font-semibold">AI Plans</h1>
              </div>
            </div>

            <IOSNativeGlassButton id="ai-plans-add" symbol="plus" label="Create AI plan" onClick={onCreate} className={cn(mobileGlassControlClass)} isDark={isDark} data-testid="mobile-create-ai-plan">
              <Plus className="h-5 w-5" />
            </IOSNativeGlassButton>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
          <AIPlansInfoPanel
            debug={notificationDebug}
            busy={notificationBusy}
            isDark={isDark}
            appColor={appColor}
            onEnable={onEnableNotifications}
            onRefresh={onRefreshNotifications}
            onTest={onTestNotification}
            nativeIOS={nativeIOS}
          />

          <div className="relative">
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
                nativeIOS && "bm-reminders-stable-search",
                isDark
                  ? `${mobileNeutralGlassSurfaceClass} placeholder:text-white/42`
                  : "border-black/[0.06] bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_12px_28px_rgba(15,23,42,0.08)]",
              )}
              data-testid="mobile-ai-plans-search"
            />
          </div>

          <section className="space-y-3">
            <AnimatePresence initial={false}>
              {filteredPlans.map((plan, index) => (
                <PlanHomeCard
                  key={plan.id}
                  plan={plan}
                  index={index}
                  isDark={isDark}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onRename={onRename}
                  nativeIOS={nativeIOS}
                  onOpenNativeActions={onOpenNativeActions}
                />
              ))}
            </AnimatePresence>

          </section>

          {filteredPlans.length === 0 && (
            <section className="py-14 text-center">
              <div className={cn("mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[22px]", isDark ? "bg-white/[0.08]" : "bg-white shadow-sm")}>
                <Sparkles className={cn("h-6 w-6", isDark ? "text-white/70" : "text-[var(--bm-text-secondary)]")} />
              </div>
              <h2 className="text-base font-semibold">{plans.length ? "No matching AI plans" : "No AI plans yet"}</h2>
              <p className={cn("mx-auto mt-2 max-w-[280px] text-sm leading-6", isDark ? "text-white/[0.55]" : "text-[var(--bm-text-secondary)]")}>
                {plans.length ? "Try a different plan name." : "Create a plan and let BlueMind help you organize it."}
              </p>
              {!plans.length && (
                <button type="button" onClick={onCreate} className="mt-5 min-h-11 rounded-2xl bg-[var(--bm-primary)] px-5 text-sm font-semibold text-white">
                  Create AI Plan
                </button>
              )}
            </section>
          )}
        </main>
      </div>
    );
  }

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

function buildPlanAssistantContext(plan) {
  const progress = getPlanProgress(plan);
  const phases = (plan.phases || []).map((phase, phaseIndex) => ({
    id: phase.id,
    index: phaseIndex + 1,
    title: phase.title,
    description: phase.description,
    tasks: (phase.tasks || []).map((task) => ({ id: task.id, title: task.title, completed: Boolean(task.done) })),
  }));
  return {
    id: plan.id,
    name: plan.title,
    type: plan.type || plan.category || plan.goalType || "AI Plan",
    description: plan.description || "",
    status: getPlanStatus(plan),
    progress,
    phases,
    completedTasks: phases.flatMap((phase) => phase.tasks.filter((task) => task.completed)),
    existingInformation: {
      goal: plan.goal || "",
      recommendations: plan.recommendations || [],
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
  };
}

function MobilePlanAssistantChat({ plan, isDark, appColor, accentText, nativeIOS, nativeHandlerRef }) {
  const [messages, setMessages] = useState(() => ([{
    role: "ai",
    content: `I’m ready to help with “${plan.title}”. What would you like to work on?`,
  }]));
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const cameraRef = useRef(null);
  const photosRef = useRef(null);
  const filesRef = useRef(null);
  const sendLockRef = useRef(false);
  const context = useMemo(() => buildPlanAssistantContext(plan), [plan]);

  const addFiles = (fileList, type) => {
    const next = Array.from(fileList || []).map((file) => fileToAttachment(file, type));
    if (next.length) setAttachments((current) => [...current, ...next]);
    setAttachmentMenuOpen(false);
  };

  const openPicker = async (source, fallbackRef) => {
    setAttachmentMenuOpen(false);
    if (nativeIOS) {
      const opened = await presentNativeIOSWritingAttachmentPicker(source);
      if (!opened) toast.error("Couldn’t open the iOS attachment picker.");
      return;
    }
    fallbackRef.current?.click();
  };

  useEffect(() => {
    if (!nativeHandlerRef) return undefined;
    nativeHandlerRef.current = (event) => {
      if (event?.action !== "writingAttachmentsPicked") return;
      const files = (event.attachments || []).map((item) => {
        const binary = window.atob(String(item.base64 || ""));
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return new File([bytes], item.name || "Attachment", { type: item.mimeType || "application/octet-stream" });
      });
      addFiles(files, event.source === "files" ? "file" : "image");
    };
    return () => { nativeHandlerRef.current = null; };
  }, [nativeHandlerRef]);

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !attachments.length) || sending || sendLockRef.current) return;
    sendLockRef.current = true;
    const attachmentNames = attachments.map((attachment) => attachment.name).filter(Boolean);
    setMessages((current) => [...current, {
      role: "user",
      content: text || `Attached: ${attachmentNames.join(", ")}`,
    }, { role: "ai", content: "", isThinking: true }]);
    setInput("");
    setSending(true);
    let answer = "";
    try {
      await streamHiddenChatMessage({
        message: [
          "You are BlueMind AI assisting with one already-created AI Plan.",
          "Use the supplied plan context when answering. Do not silently modify the plan or its tasks.",
          `Current plan context: ${JSON.stringify(context)}`,
          attachmentNames.length ? `User attached files by name: ${attachmentNames.join(", ")}` : "",
          `User message: ${text || "Please review the attached context."}`,
        ].filter(Boolean).join("\n\n"),
        mode: "work",
        metadata: {
          source: "ai_plan_assistant",
          aiPlans: true,
          hiddenChat: true,
          planId: context.id,
          planName: context.name,
          planType: context.type,
          planProgress: context.progress.percent,
        },
        onDelta: (payload) => {
          const token = payload?.token || "";
          if (!token) return;
          answer += token;
          setMessages((current) => [
            ...current.filter((message) => !message.isThinking && !message.isStreaming),
            { role: "ai", content: answer, isStreaming: true },
          ]);
        },
        onComplete: (payload) => {
          if (!answer.trim()) answer = payload?.message?.content || "";
        },
      });
      setMessages((current) => [
        ...current.filter((message) => !message.isThinking && !message.isStreaming),
        { role: "ai", content: answer.trim() || "I couldn’t complete that response. Please try again." },
      ]);
      setAttachments([]);
    } catch (error) {
      setMessages((current) => [
        ...current.filter((message) => !message.isThinking && !message.isStreaming),
        { role: "ai", content: getApiErrorMessage(error, "BlueMind could not respond. Please try again.") },
      ]);
    } finally {
      setSending(false);
      sendLockRef.current = false;
    }
  };

  return (
      <section
        className="flex h-[calc(100dvh-118px-env(safe-area-inset-top))] min-h-[420px] w-full min-w-0 max-w-full flex-col overflow-hidden pb-[max(4px,env(safe-area-inset-bottom))]"
        aria-label={`BlueMind AI assistant for ${plan.title}`}
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
              {message.isThinking ? (
                <ThinkingIndicator className="mb-0" />
              ) : (
                <div
                  className={cn("max-w-[86%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-sm font-medium leading-6", message.role === "user" ? "text-white" : "border border-white/[0.07] bg-white/[0.055] text-white/88")}
                  style={message.role === "user" ? { backgroundColor: appColor, color: accentText } : undefined}
                >
                  {message.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="relative shrink-0 pt-2">
          <UnifiedComposer
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}
            attachments={attachments}
            onRemoveAttachment={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
            placeholder={`Ask about ${plan.title}...`}
            isDark={isDark}
            appColor={appColor}
            variant="mobile"
            canSend={Boolean(input.trim() || attachments.length) && !sending}
            isBusy={sending}
            isSubmitting={sending}
            onSendAction={() => void sendMessage()}
            onAdd={() => setAttachmentMenuOpen((open) => !open)}
            onVoice={() => startPlanVoiceInput({ value: input, onChange: setInput })}
            actionMenu={attachmentMenuOpen ? (
              <div className="absolute bottom-[92px] left-0 z-20 w-44 overflow-hidden rounded-[22px] border border-white/[0.09] bg-[rgba(28,28,30,0.92)] p-1.5 shadow-[0_18px_46px_rgba(0,0,0,0.42)] backdrop-blur-[28px]">
                {[["Files", FileText, "files", filesRef], ["Photos", Image, "photos", photosRef], ["Camera", Camera, "camera", cameraRef]].map(([label, Icon, source, ref]) => (
                  <button key={source} type="button" onClick={() => void openPicker(source, ref)} className="flex h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-sm font-medium text-white active:bg-white/10">
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
            ) : null}
          />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => addFiles(event.target.files, "image")} />
          <input ref={photosRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => addFiles(event.target.files, "image")} />
          <input ref={filesRef} type="file" multiple className="hidden" onChange={(event) => addFiles(event.target.files, "file")} />
        </div>
      </section>
  );
}

function PlanDetail({ plan, isDark, appColor, accentText, onBack, onUpdate, onDelete, mobile = false, nativeIOS = false, nativeHandlerRef }) {
  const [fullScreen, setFullScreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState(() => plan.phases?.[0]?.id || "");
  const [assistantSheetOpen, setAssistantSheetOpen] = useState(false);
  const progress = getPlanProgress(plan);
  const status = getPlanStatus(plan);
  const activePhase = useMemo(() => {
    const phases = plan.phases || [];
    return phases.find((phase) => phase.id === activePhaseId) || phases[0];
  }, [activePhaseId, plan.phases]);

  useEffect(() => {
    if (!plan.phases?.length) return;
    if (!plan.phases.some((phase) => phase.id === activePhaseId)) {
      setActivePhaseId(plan.phases[0].id);
    }
  }, [activePhaseId, plan.phases]);

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

  if (mobile) {
    const mobileStats = [
      { label: "Progress", value: `${progress.percent}%` },
      { label: "Phases", value: progress.phases },
      { label: "Tasks", value: progress.total },
      { label: "Status", value: status },
    ];

    return (
      <PageShell isDark={isDark}>
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-6">
          <header className="mb-5 grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
            <IOSNativeGlassButton id={`ai-plan-detail-back-${plan.id}`} symbol="arrow.left" label="Back" onClick={onBack} className="bm-mobile-glass-control" isDark={isDark}>
              <ArrowLeft className={iconClasses.button} />
            </IOSNativeGlassButton>
            <h1 className="truncate text-center text-lg font-semibold tracking-tight">{plan.title}</h1>
            <div className="flex items-center gap-2">
              <IOSNativeGlassButton
                id={`ai-plan-detail-assistant-${plan.id}`}
                symbol="sparkles"
                label={`Open BlueMind AI for ${plan.title}`}
                onClick={() => setAssistantSheetOpen((open) => !open)}
                className={cn("bm-mobile-glass-control", assistantSheetOpen && "text-[var(--bm-primary)]")}
                isDark={isDark}
              >
                <Sparkles className={iconClasses.button} />
              </IOSNativeGlassButton>
              <IOSNativeGlassButton
                id={`ai-plan-detail-edit-${plan.id}`}
                symbol="pencil"
                label="Edit plan"
                onClick={() => setEditMode((value) => !value)}
                className={cn("bm-mobile-glass-control", editMode && "text-[var(--bm-primary)]")}
                isDark={isDark}
              >
                <Edit3 className={iconClasses.button} />
              </IOSNativeGlassButton>
              <IOSNativeGlassButton
                id={`ai-plan-detail-delete-${plan.id}`}
                symbol="trash"
                label="Delete plan"
                onClick={() => onDelete(plan)}
                className="bm-mobile-glass-control text-red-200"
                isDark={isDark}
              >
                <Trash2 className={iconClasses.button} />
              </IOSNativeGlassButton>
            </div>
          </header>

          {assistantSheetOpen ? (
            <MobilePlanAssistantChat
              plan={plan}
              isDark={isDark}
              appColor={appColor}
              accentText={accentText}
              nativeIOS={nativeIOS}
              nativeHandlerRef={nativeHandlerRef}
            />
          ) : (
            <>

          <div className="mb-4">
            <p className={cn("text-sm font-semibold leading-6", isDark ? "text-white/56" : "text-[var(--bm-text-secondary)]")}>{plan.description}</p>
          </div>

          <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
              {mobileStats.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold",
                    isDark ? mobileNeutralGlassSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] backdrop-blur-[22px]",
                  )}
                >
                  <span className={isDark ? "text-white/54" : "text-[var(--bm-text-secondary)]"}>{item.label}</span>
                  <span className="ml-2">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <section className="mb-5">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-3">
                {(plan.phases || []).map((phase, index) => {
                  const selected = activePhase?.id === phase.id;
                  const complete = phase.tasks?.length > 0 && phase.tasks.every((task) => task.done);
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setActivePhaseId(phase.id)}
                      className={cn(
                        "min-w-[178px] rounded-[24px] border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur-[24px]",
                        selected
                          ? "border-white/18 bg-white/[0.11] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_34px_rgba(0,0,0,0.18)]"
                          : isDark ? mobileNeutralGlassSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] backdrop-blur-[22px]",
                      )}
                    >
                      <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", complete ? "text-emerald-300" : isDark ? "text-white/50" : "text-[var(--bm-text-secondary)]")}>
                        Phase {index + 1}
                      </p>
                      <h2 className="mt-2 line-clamp-2 text-sm font-semibold">{phase.title}</h2>
                      <p className={cn("mt-2 text-xs font-semibold", isDark ? "text-white/45" : "text-[var(--bm-text-secondary)]")}>
                        {phase.tasks?.filter((task) => task.done).length || 0}/{phase.tasks?.length || 0} tasks
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {activePhase && (
            <motion.article
              key={activePhase.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("rounded-[26px] border p-4", isDark ? mobileNeutralGlassSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] backdrop-blur-[22px]")}
            >
              <div className="mb-4">
                <h2 className="text-base font-semibold">{activePhase.title}</h2>
                <p className={cn("mt-2 text-sm font-semibold leading-6", isDark ? "text-white/52" : "text-[var(--bm-text-secondary)]")}>{activePhase.description}</p>
              </div>
              <div className="space-y-2">
                {(activePhase.tasks || []).map((task) => (
                  <div key={task.id} className={cn("group flex items-center gap-3 rounded-2xl border px-3 py-3", task.done ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : isDark ? "border-white/[0.06] bg-white/[0.035]" : "border-[var(--bm-border)] bg-[var(--bm-bg-app)]")}>
                    <button type="button" onClick={() => updateTask(activePhase.id, task.id, { done: !task.done })} className={cn("bm-mobile-glass-control bm-reminders-static-glass-control !h-8 !min-h-8 !w-8 !min-w-8", task.done ? "!border-emerald-400 !bg-emerald-500 text-white" : isDark ? "border-white/[0.12]" : "border-[var(--bm-border-strong)]")} aria-label={task.done ? "Mark task incomplete" : "Mark task complete"}>
                      {task.done ? <Check className="h-5 w-5 stroke-[3]" /> : null}
                    </button>
                    <span className={cn("min-w-0 flex-1 text-sm font-semibold", task.done && "line-through decoration-emerald-300/70")}>{task.title}</span>
                    {editMode && (
                      <div className="flex shrink-0 gap-1">
                        <MiniAction label="Edit" icon={Edit3} onClick={() => renameTask(activePhase.id, task)} glass />
                        <MiniAction label="Delete" icon={Trash2} danger onClick={() => deleteTask(activePhase.id, task.id)} glass />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.article>
          )}

          {plan.recommendations?.length > 0 && (
            <section className={cn("mt-5 rounded-[26px] border p-4", isDark ? mobileNeutralGlassSurfaceClass : "border-black/[0.08] bg-white/80 text-[var(--bm-text-primary)] backdrop-blur-[22px]")}>
              <h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4" />AI Recommendations</h2>
              <div className="mt-3 space-y-2">
                {plan.recommendations.map((item) => (
                  <p key={item} className={cn("rounded-2xl px-3 py-3 text-sm font-semibold leading-6", isDark ? "bg-white/[0.045] text-white/58" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]")}>{item}</p>
                ))}
              </div>
            </section>
          )}
            </>
          )}
        </motion.section>
      </PageShell>
    );
  }

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

function MiniAction({ icon: Icon, label, onClick, danger, glass = false }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cn("flex h-8 w-8 items-center justify-center rounded-full", glass ? "bm-mobile-glass-control bm-reminders-static-glass-control !h-8 !min-h-8 !w-8 !min-w-8" : interactionClasses.iconButton, danger ? "text-red-400" : "")}>
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
  const nativeIOS = isMobileRoute && isNativeIOSApp();
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const [plans, setPlans] = useState([]);
  const [mode, setMode] = useState("dashboard");
  const [draftPlanName, setDraftPlanName] = useState("");
  const [draftGoal, setDraftGoal] = useState("");
  const [draftContext, setDraftContext] = useState(null);
  const [activePlanId, setActivePlanId] = useState("");
  const [notificationDebug, setNotificationDebug] = useState(() => getNotificationDebugSnapshot());
  const [notificationBusy, setNotificationBusy] = useState({
    enabling: false,
    refreshing: false,
    sendingTest: false,
  });
  const nativePlanCallbacksRef = useRef(new Map());
  const nativePlanChatHandlerRef = useRef(null);

  useEffect(() => {
    const loaded = loadAIPlans();
    setPlans(loaded);
    setMode("dashboard");
  }, []);

  useEffect(() => {
    if (!nativeIOS) return undefined;
    let listenerHandle;
    const callbacks = nativePlanCallbacksRef.current;
    void addNativeGlassActionListener((event) => {
      if (nativePlanChatHandlerRef.current) {
        void nativePlanChatHandlerRef.current(event);
      }
      const callback = callbacks.get(event?.requestId);
      if (!callback) return;
      callbacks.delete(event.requestId);
      callback(event);
    }).then((handle) => { listenerHandle = handle; });
    return () => {
      callbacks.clear();
      listenerHandle?.remove?.();
    };
  }, [nativeIOS]);

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
    if (!isMobileRoute) return;
    refreshNotificationStatus();
  }, [isMobileRoute]);

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
        toast.success("AI Plan notifications enabled");
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
        title: "BlueMind - AI Plans",
        body: "Your AI Plan notifications are connected.",
        url: "/mobile/ai-plans",
      });
      toast.success("Test notification sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send test notification"));
    } finally {
      setNotificationBusy((prev) => ({ ...prev, sendingTest: false }));
    }
  };

  useEffect(() => {
    saveAIPlans(plans);
  }, [plans]);

  const activePlan = useMemo(() => plans.find((plan) => plan.id === activePlanId), [plans, activePlanId]);

  const createPlan = (plan) => {
    const chosenName = draftPlanName.trim();
    const namedPlan = chosenName
      ? { ...plan, title: chosenName, updatedAt: new Date().toISOString() }
      : plan;
    setPlans((current) => [namedPlan, ...current]);
    setActivePlanId(namedPlan.id);
    setMode("detail");
    setDraftPlanName("");
    toast.success("AI plan created");
    queueFeatureNotification({
      type: "ai_plans",
      sourceId: namedPlan.id,
      source: {
        planTitle: namedPlan.title,
        status: namedPlan.status || "ready",
        deepLink: "/mobile/ai-plans",
      },
      dedupeKey: `ai_plans:${namedPlan.id}:ready`,
    }).catch(() => {
      // Plan creation should not fail if notification delivery is unavailable.
    });
  };

  const updatePlan = (updatedPlan) => {
    setPlans((current) => current.map((plan) => plan.id === updatedPlan.id ? updatedPlan : plan));
  };

  const renamePlan = (plan, rawName) => {
    const title = String(rawName || "").trim();
    if (!title) return;
    updatePlan({ ...plan, title, updatedAt: new Date().toISOString() });
    toast.success("AI plan renamed");
  };

  const deletePlan = (planId, options = {}) => {
    if (!options.skipConfirm && !window.confirm("Delete this AI plan?")) return;
    setPlans((current) => current.filter((plan) => plan.id !== planId));
    if (activePlanId === planId) {
      setActivePlanId("");
      setMode("dashboard");
    }
    toast.success("Plan deleted");
  };

  const beginNamedPlan = (rawName) => {
    const title = String(rawName || "").trim();
    if (!title) return;
    setDraftPlanName(title);
    setDraftGoal("");
    setDraftContext(null);
    setMode("start");
  };

  const requestPlanName = () => {
    if (!nativeIOS) {
      const title = window.prompt("What would you like to name this plan?", "")?.trim();
      if (title) beginNamedPlan(title);
      return;
    }
    const requestId = globalThis.crypto?.randomUUID?.() || `ai-plan-name-${Date.now()}`;
    nativePlanCallbacksRef.current.set(requestId, (event) => {
      if (event.confirmed === true) beginNamedPlan(event.value);
    });
    void presentNativeIOSTextPrompt({
      title: "New AI Plan",
      message: "What would you like to name this plan?",
      placeholder: "Plan name",
      confirmTitle: "Continue",
      cancelTitle: "Cancel",
      requestId,
    });
  };

  const requestRenamePlan = (plan) => {
    if (!nativeIOS) {
      const title = window.prompt("Rename AI Plan", plan.title || "")?.trim();
      if (title) renamePlan(plan, title);
      return;
    }
    const requestId = globalThis.crypto?.randomUUID?.() || `ai-plan-rename-${Date.now()}`;
    nativePlanCallbacksRef.current.set(requestId, (event) => {
      if (event.confirmed === true) renamePlan(plan, event.value);
    });
    void presentNativeIOSTextPrompt({
      title: "Rename AI Plan",
      message: "Enter a new name for this plan.",
      placeholder: "Plan name",
      value: plan.title || "",
      confirmTitle: "Rename",
      cancelTitle: "Cancel",
      requestId,
    });
  };

  const requestDetailDelete = (plan) => {
    if (!nativeIOS) {
      deletePlan(plan.id);
      return;
    }
    const requestId = globalThis.crypto?.randomUUID?.() || `ai-plan-detail-delete-${Date.now()}`;
    nativePlanCallbacksRef.current.set(requestId, (event) => {
      if (event.confirmed === true) deletePlan(plan.id, { skipConfirm: true });
    });
    void presentNativeIOSConfirmation({
      title: "Delete this plan?",
      message: `“${plan.title}” will be removed from AI Plans.`,
      confirmTitle: "Delete",
      cancelTitle: "Cancel",
      destructive: true,
      requestId,
    });
  };

  const openNativePlanActions = (plan, anchorElement) => {
    const rect = anchorElement?.getBoundingClientRect?.();
    const requestId = globalThis.crypto?.randomUUID?.() || `ai-plan-actions-${Date.now()}`;
    nativePlanCallbacksRef.current.set(requestId, (event) => {
      if (event.value === "open") {
        setActivePlanId(plan.id);
        setMode("detail");
        return;
      }
      if (event.value === "rename") {
        requestRenamePlan(plan);
        return;
      }
      if (event.value !== "delete") return;
      const confirmationRequestId = globalThis.crypto?.randomUUID?.() || `ai-plan-delete-${Date.now()}`;
      nativePlanCallbacksRef.current.set(confirmationRequestId, (confirmation) => {
        if (confirmation.confirmed === true) deletePlan(plan.id, { skipConfirm: true });
      });
      void presentNativeIOSConfirmation({
        title: "Delete AI Plan?",
        message: `“${plan.title}” will be permanently deleted.`,
        confirmTitle: "Delete",
        cancelTitle: "Cancel",
        destructive: true,
        requestId: confirmationRequestId,
      });
    });
    void presentNativeIOSSelection({
      title: "",
      selectedValue: "",
      requestId,
      anchorRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined,
      options: [
        { label: "Open", value: "open", symbol: "arrow.up.right" },
        { label: "Rename", value: "rename", symbol: "pencil" },
        { label: "Delete", value: "delete", symbol: "trash", destructive: true },
      ],
    });
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
          onCancel={() => setMode("dashboard")}
          onCreate={createPlan}
          mobile={isMobileRoute}
          nativeIOS={nativeIOS}
          nativeHandlerRef={nativePlanChatHandlerRef}
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
        onDelete={isMobileRoute ? requestDetailDelete : deletePlan}
        mobile={isMobileRoute}
        nativeIOS={nativeIOS}
        nativeHandlerRef={nativePlanChatHandlerRef}
      />
    );
  }

  if (mode === "start") {
    return (
      <PageShell isDark={isDark}>
        <StartScreen
          mobile={isMobileRoute}
          isDark={isDark}
          appColor={appColor}
          accentText={accentText}
          nativeIOS={nativeIOS}
          nativeHandlerRef={nativePlanChatHandlerRef}
          onBack={() => setMode("dashboard")}
          onStart={(goal, context) => {
            setDraftGoal(goal);
            setDraftContext(context || null);
            setMode("conversation");
          }}
        />
      </PageShell>
    );
  }

  if (isMobileRoute) {
    return (
      <Dashboard
        plans={plans}
        isDark={isDark}
        appColor={appColor}
        mobile
        onCreate={requestPlanName}
        onOpen={(planId) => {
          setActivePlanId(planId);
          setMode("detail");
        }}
        onBack={() => navigate("/mobile/chat")}
        onDelete={deletePlan}
        onRename={requestRenamePlan}
        onOpenNativeActions={openNativePlanActions}
        nativeIOS={nativeIOS}
        notificationDebug={notificationDebug}
        notificationBusy={notificationBusy}
        onEnableNotifications={handleEnableNotifications}
        onRefreshNotifications={refreshNotificationStatus}
        onTestNotification={handleSendTestNotification}
      />
    );
  }

  return (
    <PageShell isDark={isDark}>
      <Dashboard
        plans={plans}
        isDark={isDark}
        appColor={appColor}
        onCreate={requestPlanName}
        onOpen={(planId) => {
          setActivePlanId(planId);
          setMode("detail");
        }}
        onBack={() => navigate(-1)}
        onDelete={deletePlan}
        onRename={requestRenamePlan}
        onOpenNativeActions={openNativePlanActions}
        nativeIOS={false}
      />
    </PageShell>
  );
}
