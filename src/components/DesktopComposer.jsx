import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Brain,
  Check,
  ChevronDown,
  FileText,
  Lightbulb,
  Mic,
  Plus,
  Search,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

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
    id: "vision",
    label: "BlueMind Vision",
    description: "Best with images and files",
    responseMode: "writing",
    icon: Sparkles,
  },
  {
    id: "research",
    label: "BlueMind Research",
    description: "Careful research answers",
    responseMode: "research",
    icon: Search,
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
    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[18px] border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] shadow-sm" title={label}>
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
        <div className="flex h-full w-full items-center justify-center text-[var(--bm-primary)]">
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

function SelectorMenu({ id, label, value, description, options, selectedValue, onSelect, icon: Icon, activeMenu, setActiveMenu, align = "left" }) {
  const open = activeMenu === id;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setActiveMenu(open ? "" : id)}
        className="inline-flex h-10 max-w-[240px] items-center gap-2 rounded-full border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] px-3.5 text-sm font-bold text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-hover-bg)]"
        aria-expanded={open}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-[var(--bm-primary)]" />}
        <span className="min-w-0 truncate">{value}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--bm-text-muted)]" />
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
              className={cn(
                "absolute top-[calc(100%+8px)] z-50 w-[286px] overflow-hidden rounded-[20px] border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] p-1.5 shadow-2xl",
                align === "right" ? "right-0" : "left-0",
              )}
            >
              <div className="px-3 pb-2 pt-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--bm-text-muted)]">{label}</p>
                {description && <p className="mt-1 text-xs font-semibold text-[var(--bm-text-secondary)]">{description}</p>}
              </div>
              {options.map((option) => {
                const OptionIcon = option.icon;
                const selected = selectedValue === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onSelect(option);
                      setActiveMenu("");
                    }}
                    className={cn(
                      "flex min-h-[58px] w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors",
                      selected ? "bg-[var(--bm-primary)]/12 text-[var(--bm-primary)]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
                    )}
                  >
                    {OptionIcon && (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bm-primary)]/10 text-[var(--bm-primary)]">
                        <OptionIcon className="h-4.5 w-4.5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{option.label}</span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--bm-text-secondary)]">{option.description}</span>
                    </span>
                    {selected && <Check className="h-4.5 w-4.5 shrink-0" />}
                  </button>
                );
              })}
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
  isBusy = false,
  canSend = false,
  onSendAction,
  addLabel = "Attach",
  voiceLabel = "Voice input",
  sendLabel = "Send",
  stopLabel = "Stop generating",
  appColor = "var(--bm-primary)",
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
  const maxHeightRef = useRef(320);
  const hasText = Boolean(String(value || "").trim());
  const normalizedAttachments = useMemo(() => attachments.filter(Boolean), [attachments]);
  const hasAttachments = normalizedAttachments.length > 0 || isUploading;
  const activeModel = BLUEMIND_MODELS.find((model) => model.id === modelId) || getBlueMindModelByResponseMode(responseMode);
  const activeThinkingLevel = THINKING_LEVELS.find((level) => level.id === thinkingLevel) || THINKING_LEVELS[1];
  const activePlaceholder = placeholder || ROTATING_PROMPTS[promptIndex];

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
    const element = inputRef?.current;
    if (!element) return;
    const minHeight = 88;
    const maxHeight = maxHeightRef.current;
    element.style.height = "auto";
    const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [inputRef, value, hasText]);

  const handleTextareaInput = (event) => {
    const element = event.currentTarget;
    const minHeight = 88;
    const maxHeight = maxHeightRef.current;
    element.style.height = "auto";
    const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  return (
    <form className="desktop-bluemind-composer relative w-full" onSubmit={onSubmit}>
      {pendingPanel}
      {actionMenu}

      <motion.section
        initial={false}
        animate={{
          boxShadow: isFocused
            ? "0 28px 80px rgba(15, 23, 42, 0.16)"
            : "0 18px 60px rgba(15, 23, 42, 0.10)",
        }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-visible rounded-[34px] border border-[var(--bm-border)] bg-[var(--bm-bg-card)]/96 p-4 text-[var(--bm-text-primary)] backdrop-blur-2xl"
        data-testid="desktop-bluemind-composer"
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
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[18px] border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--bm-text-muted)]/30 border-t-[var(--bm-primary)]" />
                  </div>
                )}
                {normalizedAttachments.length > 1 && onClearAttachments && (
                  <button
                    type="button"
                    onClick={onClearAttachments}
                    className="h-10 shrink-0 rounded-full bg-[var(--bm-hover-bg)] px-4 text-xs font-extrabold text-[var(--bm-primary)] transition-colors hover:bg-[var(--bm-active-bg)]"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <AnimatePresence mode="wait">
            {!hasText && !isFocused && (
              <motion.span
                key={activePlaceholder}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute left-0 top-0 text-[18px] font-medium leading-7 text-[var(--bm-text-secondary)]"
              >
                {activePlaceholder}
              </motion.span>
            )}
          </AnimatePresence>
          <textarea
            ref={inputRef}
            value={value}
            onChange={onChange}
            onInput={handleTextareaInput}
            onKeyDown={onKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={1}
            placeholder={isFocused || hasText ? activePlaceholder : ""}
            className="desktop-bluemind-composer-input block w-full resize-none bg-transparent text-[18px] font-medium leading-7 text-[var(--bm-text-primary)] outline-none placeholder:text-[var(--bm-text-secondary)]/80"
            style={{
              ...inputDirectionStyle,
              minHeight: "88px",
              maxHeight: "46vh",
              caretColor: "var(--bm-input-caret)",
              letterSpacing: "0",
            }}
            data-testid={testId}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] px-3.5 text-sm font-bold text-[var(--bm-text-primary)] transition-colors hover:bg-[var(--bm-hover-bg)]"
              aria-label={addLabel}
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add</span>
            </button>

            <SelectorMenu
              id="model"
              label="BlueMind model"
              description="Choose the BlueMind engine for this request."
              value={activeModel.label}
              icon={activeModel.icon}
              options={BLUEMIND_MODELS}
              selectedValue={activeModel.id}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              onSelect={(model) => onResponseModeChange?.(model.responseMode, model)}
            />

            <SelectorMenu
              id="thinking"
              label="Thinking level"
              description="Control how much reasoning BlueMind uses."
              value={activeThinkingLevel.label}
              icon={Lightbulb}
              options={THINKING_LEVELS}
              selectedValue={activeThinkingLevel.id}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              onSelect={(level) => onThinkingLevelChange?.(level.id, level)}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onVoice}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                isListening ? "text-white" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)] hover:text-[var(--bm-text-primary)]",
              )}
              style={isListening ? { backgroundColor: appColor } : undefined}
              aria-label={voiceLabel}
            >
              <Mic className="h-5 w-5" />
            </button>
            <motion.button
              type={isBusy ? "button" : "submit"}
              onClick={onSendAction}
              disabled={!isBusy && !canSend}
              whileTap={!isBusy && canSend ? { scale: 0.93 } : undefined}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_12px_28px_rgba(25,59,104,0.22)] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
              style={{ backgroundColor: isBusy || canSend ? appColor : "var(--bm-text-muted)" }}
              aria-label={isBusy ? stopLabel : sendLabel}
            >
              {isBusy ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <ArrowUp className="h-5 w-5 -translate-y-[1px] stroke-[2.7]" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.section>
    </form>
  );
}
