import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Lightbulb,
  Mic,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import VoiceRecordingPanel from "@/components/VoiceRecordingPanel";
import BlueMindSendButton from "@/components/BlueMindSendButton";

const ROTATING_PROMPTS = [
  "How can I help you today?",
  "Ask BlueMind anything.",
  "What would you like to learn?",
  "Ready when you are.",
  "What would you like to build today?",
  "Need help with a project?",
];

const BLUEMIND_MODELS = [
  {
    id: "lite",
    label: "BlueMind Lite",
    description: "Fast everyday help",
    responseMode: "general",
    icon: Sparkles,
  },
  {
    id: "core",
    label: "BlueMind Core",
    description: "Balanced study and work",
    responseMode: "work",
    icon: Brain,
  },
  {
    id: "pro",
    label: "BlueMind Pro",
    description: "Deeper reasoning",
    responseMode: "study",
    icon: Lightbulb,
  },
  {
    id: "research",
    label: "BlueMind Research",
    description: "Careful research answers",
    responseMode: "research",
    icon: Search,
  },
  {
    id: "vision",
    label: "BlueMind Vision",
    description: "Best with images and files",
    responseMode: "writing",
    icon: Sparkles,
  },
];

export const THINKING_LEVELS = [
  { id: "quick", label: "Quick", description: "Shortest reasoning path" },
  { id: "balanced", label: "Balanced", description: "Good default depth" },
  { id: "deep", label: "Deep", description: "More careful reasoning" },
  { id: "expert", label: "Expert", description: "Detailed expert pass" },
  { id: "max", label: "Max", description: "Maximum effort" },
];

export function getBlueMindModelByResponseMode(responseMode) {
  return BLUEMIND_MODELS.find((model) => model.responseMode === responseMode) || BLUEMIND_MODELS[0];
}

function getAttachmentPreview(attachment) {
  return attachment?.previewUrl || attachment?.url || attachment?.thumbnail || attachment?.src || "";
}

function isImageAttachment(attachment) {
  return attachment?.type === "image" || Boolean(getAttachmentPreview(attachment));
}

function AttachmentPreview({ attachment, onRemove }) {
  const [failed, setFailed] = useState(false);
  const preview = getAttachmentPreview(attachment);
  const label = attachment?.name || attachment?.fileName || attachment?.title || "Attachment";
  const showImage = isImageAttachment(attachment) && preview && !failed;

  return (
    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[18px] bg-[var(--bm-hover-bg)] shadow-sm" title={label}>
      {showImage ? (
        <img
          src={preview}
          alt={label}
          className="h-full w-full object-cover"
          draggable="false"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--bm-icon-primary)]">
          <FileText className="h-7 w-7" />
        </div>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-transform active:scale-95"
          aria-label={`Remove ${label}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ModelMenu({
  activeModel,
  modelId,
  thinkingLevel,
  onResponseModeChange,
  onThinkingLevelChange,
  activeMenu,
  setActiveMenu,
  isDark = false,
}) {
  const id = "models";
  const open = activeMenu === id;
  const [thinkingSubmenuOpen, setThinkingSubmenuOpen] = useState(false);
  const selectedRowClass = isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-primary)]/10 text-[var(--bm-primary)]";
  const idleRowClass = isDark ? "text-white hover:bg-white/[0.07]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]";
  const dropdownSurfaceClass = isDark
    ? "bg-[var(--bm-bg-card)] text-white ring-white/[0.08] shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
    : "bg-white text-[var(--bm-text-primary)] ring-[var(--bm-border)] shadow-[0_12px_28px_rgba(15,23,42,0.10)]";
  const triggerClass = cn(
    "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-bold transition-colors",
    isDark ? "text-white hover:bg-white/[0.07]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
  );

  useEffect(() => {
    if (!open) setThinkingSubmenuOpen(false);
  }, [open]);

  const selectModel = (model) => {
    onResponseModeChange?.(model.responseMode, model);
    setActiveMenu("");
  };

  const selectThinkingLevel = (level) => {
    onThinkingLevelChange?.(level.id, level);
    setThinkingSubmenuOpen(false);
    setActiveMenu("");
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setActiveMenu(open ? "" : id)} className={cn(triggerClass, "max-w-[220px]")} aria-expanded={open}>
        <span className="min-w-0 truncate">{activeModel.label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0", isDark ? "text-white/75" : "text-[var(--bm-text-muted)]")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveMenu("")} aria-label="Close menu" />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-[calc(100%+8px)] z-50 flex items-start"
            >
              <div className={cn("w-[248px] rounded-[20px] p-1.5 ring-1", dropdownSurfaceClass)}>
                {BLUEMIND_MODELS.map((model) => {
                  const selected = modelId === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onMouseEnter={() => setThinkingSubmenuOpen(false)}
                      onFocus={() => setThinkingSubmenuOpen(false)}
                      onClick={() => selectModel(model)}
                      className={cn(
                        "flex min-h-[42px] w-full items-center gap-2 rounded-[14px] px-2.5 text-left text-sm font-extrabold transition-colors",
                        selected ? selectedRowClass : idleRowClass,
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {selected && <Check className="h-5 w-5 stroke-[3] text-[var(--bm-check)]" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{model.label}</span>
                    </button>
                  );
                })}

                <div className={cn("my-1.5 h-px", isDark ? "bg-white/[0.08]" : "bg-[var(--bm-border)]")} />

                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setThinkingSubmenuOpen(true)}
                    onFocus={() => setThinkingSubmenuOpen(true)}
                    onClick={(event) => {
                      event.preventDefault();
                      setThinkingSubmenuOpen((value) => !value);
                    }}
                    className={cn(
                      "flex min-h-[42px] w-full items-center gap-2 rounded-[14px] px-2.5 text-left text-sm font-extrabold transition-colors",
                      thinkingSubmenuOpen ? selectedRowClass : idleRowClass,
                    )}
                    aria-haspopup="menu"
                    aria-expanded={thinkingSubmenuOpen}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center" />
                    <span className="min-w-0 flex-1 truncate">Thinking</span>
                    <ChevronRight className={cn("h-4 w-4 shrink-0", isDark ? "text-white/70" : "text-[var(--bm-text-muted)]")} />
                  </button>

                  <AnimatePresence>
                    {thinkingSubmenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -4, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                        className={cn("absolute left-[calc(100%+8px)] bottom-0 z-50 w-[174px] rounded-[20px] p-1.5 ring-1", dropdownSurfaceClass)}
                        onMouseEnter={() => setThinkingSubmenuOpen(true)}
                      >
                        {THINKING_LEVELS.map((level) => {
                          const selected = thinkingLevel === level.id;
                          return (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => selectThinkingLevel(level)}
                              className={cn(
                                "flex min-h-[40px] w-full items-center gap-2 rounded-[14px] px-2.5 text-left text-sm font-extrabold transition-colors",
                                selected ? selectedRowClass : idleRowClass,
                              )}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                {selected && <Check className="h-5 w-5 stroke-[3] text-[var(--bm-check)]" />}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{level.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DesktopComposer({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  inputRef,
  placeholder,
  modePill = null,
  attachments = [],
  onRemoveAttachment,
  onClearAttachments,
  isUploading = false,
  onAdd,
  onVoice,
  isListening = false,
  voiceAudioLevels = [],
  onCancelVoice,
  onFinishVoice,
  voiceStatus = "idle",
  voiceStatusLabel = "",
  voiceError = "",
  voiceResponseEnabled = true,
  voiceAutoplayEnabled = true,
  onToggleVoiceResponse,
  onToggleVoiceAutoplay,
  onStopVoicePlayback,
  onReplayVoice,
  canReplayVoice = false,
  isBusy = false,
  canSend = false,
  onSendAction,
  addLabel = "Attach",
  voiceLabel = "Voice input",
  sendLabel = "Send",
  stopLabel = "Stop generating",
  appColor = "var(--bm-primary)",
  isDark = false,
  responseMode,
  modelId,
  onResponseModeChange,
  thinkingLevel = "balanced",
  onThinkingLevelChange,
  inputDirectionStyle,
  actionMenu,
  pendingPanel,
  testId = "chat-input",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [activeMenu, setActiveMenu] = useState("");
  const internalInputRef = useRef(null);
  const maxHeightRef = useRef(320);
  const hasText = Boolean(String(value || "").trim());
  const normalizedAttachments = useMemo(() => attachments.filter(Boolean), [attachments]);
  const hasAttachments = normalizedAttachments.length > 0 || isUploading;
  const activeModel = BLUEMIND_MODELS.find((model) => model.id === modelId) || getBlueMindModelByResponseMode(responseMode);
  const activeThinkingLevel = THINKING_LEVELS.find((level) => level.id === thinkingLevel) || THINKING_LEVELS[1];
  const activePlaceholder = placeholder || ROTATING_PROMPTS[promptIndex];
  const showVoiceControls = voiceStatus !== "idle" || canReplayVoice || voiceError;

  const setTextareaRef = useCallback((node) => {
    internalInputRef.current = node;
    if (typeof inputRef === "function") {
      inputRef(node);
    } else if (inputRef) {
      inputRef.current = node;
    }
  }, [inputRef]);

  const getTextarea = useCallback(() => {
    return internalInputRef.current || inputRef?.current || null;
  }, [inputRef]);

  const focusTextarea = useCallback((event) => {
    const target = event?.target;
    if (target?.closest?.("button,a,input,select,[role='button'],[role='menuitem'],[contenteditable='true']")) {
      return;
    }
    getTextarea()?.focus({ preventScroll: true });
  }, [getTextarea]);

  useEffect(() => {
    if (placeholder) return undefined;
    const timer = window.setInterval(() => {
      setPromptIndex((index) => (index + 1) % ROTATING_PROMPTS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [placeholder]);

  useLayoutEffect(() => {
    const updateMaxHeight = () => {
      maxHeightRef.current = Math.max(260, Math.floor(window.innerHeight * 0.46));
    };
    updateMaxHeight();
    window.addEventListener("resize", updateMaxHeight);
    return () => window.removeEventListener("resize", updateMaxHeight);
  }, []);

  useLayoutEffect(() => {
    const element = getTextarea();
    if (!element) return;
    const minHeight = 104;
    const maxHeight = maxHeightRef.current;
    element.style.height = "auto";
    const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [getTextarea, value, hasText, isListening]);

  useEffect(() => {
    const element = getTextarea();
    if (!element) return undefined;
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && activeElement !== document.documentElement && activeElement !== element) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => element.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [getTextarea, isListening]);

  const handleTextareaInput = (event) => {
    const element = event.currentTarget;
    const minHeight = 104;
    const maxHeight = maxHeightRef.current;
    element.style.height = "auto";
    const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  return (
    <form className="desktop-bluemind-composer relative w-full" onSubmit={onSubmit}>
      {pendingPanel}

      <motion.section
        initial={false}
        animate={{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)" }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-visible rounded-[36px] bg-[var(--bm-bg-card)] px-6 py-6 text-[var(--bm-text-primary)]"
        data-testid="desktop-bluemind-composer"
      >
        {showVoiceControls && !isListening && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--bm-hover-bg)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bm-primary)]/12 text-[var(--bm-primary)]">
                {voiceStatus === "speaking" ? <Volume2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {["processing", "thinking", "speaking"].includes(voiceStatus) && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--bm-primary)]/20" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-[var(--bm-text-primary)]">
                  {voiceError || voiceStatusLabel || "Voice ready"}
                </span>
                <span className="block text-xs font-semibold text-[var(--bm-text-secondary)]">
                  Voice {voiceResponseEnabled ? "on" : "off"} - Auto-play {voiceAutoplayEnabled ? "on" : "off"}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleVoiceResponse}
                className={cn(
                  "h-8 rounded-full px-3 text-xs font-extrabold transition-colors",
                  voiceResponseEnabled ? "bg-[var(--bm-primary)] text-white" : "bg-[var(--bm-bg-card)] text-[var(--bm-text-secondary)]",
                )}
              >
                Voice
              </button>
              <button
                type="button"
                onClick={onToggleVoiceAutoplay}
                className={cn(
                  "h-8 rounded-full px-3 text-xs font-extrabold transition-colors",
                  voiceAutoplayEnabled ? "bg-[var(--bm-primary)] text-white" : "bg-[var(--bm-bg-card)] text-[var(--bm-text-secondary)]",
                )}
              >
                Auto
              </button>
              {voiceStatus === "speaking" && (
                <button
                  type="button"
                  onClick={onStopVoicePlayback}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-active-bg)]"
                  aria-label="Stop AI voice playback"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              )}
              {canReplayVoice && (
                <button
                  type="button"
                  onClick={onReplayVoice}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-active-bg)]"
                  aria-label="Replay AI voice response"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isListening ? (
            <VoiceRecordingPanel
              key="recording"
              audioLevels={voiceAudioLevels}
              onCancel={onCancelVoice}
              onFinish={onFinishVoice}
              isDark={isDark}
              appColor={appColor}
            />
          ) : (
            <motion.div
              key="composer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              {(modePill || hasAttachments) && (
                <div className="mb-4 flex max-w-full flex-wrap items-center gap-2">
                  {modePill && (
                    <button
                      type="button"
                      onClick={modePill.onClear}
                      className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--bm-primary)]/12 px-3 py-1.5 text-sm font-extrabold text-[var(--bm-primary)] transition-colors hover:bg-[var(--bm-primary)]/16"
                      aria-label={modePill.clearLabel || `Clear ${modePill.label}`}
                    >
                      {modePill.icon && <modePill.icon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{modePill.label}</span>
                      <X className="h-4 w-4 shrink-0" />
                    </button>
                  )}

                  {hasAttachments && (
                    <div className="flex max-w-full items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {normalizedAttachments.map((attachment) => (
                        <AttachmentPreview
                          key={attachment.id || getAttachmentPreview(attachment) || attachment.name}
                          attachment={attachment}
                          onRemove={onRemoveAttachment}
                        />
                      ))}
                      {isUploading && (
                        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[18px] bg-[var(--bm-hover-bg)]">
                          <BlueMindLoadingDots className="text-[var(--bm-primary)]" />
                        </div>
                      )}
                      {normalizedAttachments.length > 1 && onClearAttachments && (
                        <button
                          type="button"
                          onClick={onClearAttachments}
                          className="h-10 shrink-0 rounded-full bg-[var(--bm-hover-bg)] px-4 text-xs font-extrabold text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-active-bg)]"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="relative cursor-text" onPointerDown={focusTextarea} onClick={focusTextarea}>
                <AnimatePresence mode="wait">
                  {!hasText && !isFocused && (
                    <motion.span
                      key={activePlaceholder}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-none absolute left-0 top-2 text-[18px] font-medium leading-7 text-[var(--bm-text-secondary)]"
                    >
                      {activePlaceholder}
                    </motion.span>
                  )}
                </AnimatePresence>
                <textarea
                  ref={setTextareaRef}
                  value={value}
                  onChange={onChange}
                  onInput={handleTextareaInput}
                  onKeyDown={onKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  rows={1}
                  placeholder={isFocused || hasText ? activePlaceholder : ""}
                  className="desktop-bluemind-composer-input bm-composer-input relative z-10 block w-full resize-none bg-transparent pt-2 text-[18px] font-medium leading-7 text-[var(--bm-text-primary)] outline-none placeholder:text-[var(--bm-text-secondary)]/80"
                  style={{
                    ...inputDirectionStyle,
                    minHeight: "104px",
                    maxHeight: "46vh",
                    caretColor: "var(--bm-input-caret)",
                    letterSpacing: "0",
                  }}
                  data-testid={testId}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={onAdd}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-hover-bg)]"
                      aria-label={addLabel}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    {actionMenu}
                  </div>

                  <ModelMenu
                    activeModel={activeModel}
                    modelId={activeModel.id}
                    thinkingLevel={activeThinkingLevel.id}
                    onResponseModeChange={onResponseModeChange}
                    onThinkingLevelChange={onThinkingLevelChange}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    isDark={isDark}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={onVoice}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--bm-hover-bg)] hover:text-[var(--bm-text-primary)]",
                      voiceResponseEnabled ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-muted)]",
                    )}
                    aria-label={voiceLabel}
                  >
                    {voiceResponseEnabled ? <Mic className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </button>
                  <BlueMindSendButton
                    isBusy={isBusy}
                    canSend={canSend}
                    onClick={onSendAction}
                    appColor={appColor}
                    sendLabel={sendLabel}
                    stopLabel={stopLabel}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </form>
  );
}
