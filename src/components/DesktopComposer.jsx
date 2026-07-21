import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Mic,
  Plus,
  RotateCcw,
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
  inputDirectionStyle,
  actionMenu,
  pendingPanel,
  testId = "chat-input",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const internalInputRef = useRef(null);
  const maxHeightRef = useRef(320);
  const hasText = Boolean(String(value || "").trim());
  const normalizedAttachments = useMemo(() => attachments.filter(Boolean), [attachments]);
  const hasAttachments = normalizedAttachments.length > 0 || isUploading;
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

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={onAdd}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-hover-bg)]"
                      aria-label={addLabel}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    {actionMenu}
                  </div>
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
