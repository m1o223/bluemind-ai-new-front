import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Mic, Plus, X } from "lucide-react";

import { inputClasses } from "@/lib/interactions";
import { cn } from "@/lib/utils";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import VoiceRecordingPanel from "@/components/VoiceRecordingPanel";
import BlueMindSendButton from "@/components/BlueMindSendButton";

function getAttachmentPreview(attachment) {
  return attachment?.previewUrl || attachment?.url || attachment?.thumbnail || attachment?.src || "";
}

function isImageAttachment(attachment) {
  return attachment?.type === "image" || Boolean(getAttachmentPreview(attachment));
}

function AttachmentPreview({ attachment, isDark, isMobile, onRemove }) {
  const [failed, setFailed] = useState(false);
  const preview = getAttachmentPreview(attachment);
  const label = attachment?.name || attachment?.fileName || attachment?.title || "Attachment";
  const showImage = isImageAttachment(attachment) && preview && !failed;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[16px] border shadow-sm",
        isMobile ? "h-14 w-14" : "h-16 w-16",
        isDark ? "border-white/10 bg-white/[0.08]" : "border-[var(--bm-border)] bg-white/85",
      )}
      title={label}
    >
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
          <FileText className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
        </div>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-transform active:scale-95"
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function UnifiedComposer({
  value,
  onChange,
  onInput,
  onSubmit,
  onKeyDown,
  inputRef,
  placeholder = "Ask anything...",
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
  isBusy = false,
  canSend = false,
  onSendAction,
  addLabel = "Attach",
  voiceLabel = "Voice",
  sendLabel = "Send",
  stopLabel = "Stop generating",
  isDark = false,
  appColor = "var(--bm-primary)",
  variant = "desktop",
  maxTextHeight = 180,
  inputDirectionStyle,
  actionMenu,
  pendingPanel,
  testId = "chat-input",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const internalInputRef = useRef(null);
  const isMobile = variant === "mobile";
  const hasText = Boolean(String(value || "").trim());
  const hasAttachments = attachments.length > 0 || isUploading;
  const isAttachmentState = hasAttachments || Boolean(modePill);
  const isTypingState = isMobile ? hasText : !isAttachmentState && (isFocused || hasText);
  const isIdleState = isMobile ? !isTypingState : !isAttachmentState && !isTypingState;
  const textareaMinHeight = isMobile ? 44 : (isIdleState ? 30 : 38);
  const composerState = isAttachmentState ? "attachment" : isTypingState ? "typing" : "idle";
  const useSubtleAddButton = isMobile || isIdleState;
  const mobileGlassIconButtonClass =
    "border border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white/78 backdrop-blur-[42px] hover:bg-[rgba(96,96,96,0.2)] hover:text-white/88 active:bg-[rgba(106,106,106,0.22)]";
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

  const normalizedAttachments = useMemo(
    () => attachments.filter(Boolean),
    [attachments],
  );

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

  useLayoutEffect(() => {
    const element = getTextarea();
    if (!element) return;

    element.style.height = "auto";
    const nextHeight = hasText ? Math.min(element.scrollHeight, maxTextHeight) : textareaMinHeight;
    element.style.height = `${Math.max(nextHeight, textareaMinHeight)}px`;
    element.style.overflowY = element.scrollHeight > maxTextHeight ? "auto" : "hidden";
  }, [getTextarea, hasText, isListening, maxTextHeight, textareaMinHeight, value]);

  useEffect(() => {
    if (isMobile) return undefined;
    const element = getTextarea();
    if (!element) return undefined;
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && activeElement !== document.documentElement && activeElement !== element) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => element.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [getTextarea, isListening, isMobile]);

  const addButton = (
    <motion.button
      type="button"
      layout
      onClick={(event) => {
        event.stopPropagation();
        onAdd?.();
      }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-all duration-200",
        isMobile ? "h-10 w-10" : "h-11 w-11",
        isMobile
          ? mobileGlassIconButtonClass
          : useSubtleAddButton
          ? isDark ? "bg-transparent text-white/90 hover:text-white" : "bg-transparent text-[var(--bm-icon-primary)] hover:text-[var(--bm-text-primary)]"
          : isDark ? "bg-[var(--bm-bg-card)] text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] ring-1 ring-white/[0.09] hover:bg-[var(--bm-bg-elevated)]" : "bg-white text-[var(--bm-icon-primary)] shadow-[0_12px_28px_rgba(15,23,42,0.12)] ring-1 ring-[var(--bm-border)] hover:bg-[var(--bm-hover-bg)]",
      )}
      style={isMobile ? mobileGlassIconStyle : {
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
      aria-label={addLabel}
    >
      <Plus className={isMobile ? "h-4 w-4" : "h-[21px] w-[21px]"} />
    </motion.button>
  );

  const voiceButton = (
    <button
      type="button"
      onClick={onVoice}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-all duration-200",
        isMobile ? "h-10 w-10" : "h-[38px] w-[38px]",
        isMobile
          ? mobileGlassIconButtonClass
          : isListening
          ? "text-white"
          : isDark
            ? "text-[var(--bm-text-secondary)] hover:text-white"
            : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)]",
      )}
      style={isListening ? {
        backgroundColor: appColor,
        borderColor: "rgba(255,255,255,0.09)",
        color: "rgba(255,255,255,0.9)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(255,255,255,0.018), inset 1px 0 0 rgba(255,255,255,0.035), inset -1px 0 0 rgba(255,255,255,0.03), 0 12px 28px rgba(0,0,0,0.23)",
      } : isMobile ? mobileGlassIconStyle : undefined}
      aria-label={voiceLabel}
    >
      <Mic className={isMobile ? "h-5 w-5" : "h-[19px] w-[19px]"} />
    </button>
  );

  const sendButton = (
    <BlueMindSendButton
      isBusy={isBusy}
      canSend={canSend}
      onClick={onSendAction}
      appColor={appColor}
      sendLabel={sendLabel}
      stopLabel={stopLabel}
      compact={isMobile}
      className={cn(isMobile ? "ml-0.5" : "ml-1.5 h-[42px] w-[42px]")}
    />
  );

  if (isMobile) {
    const mobileBoxClasses = cn(
      "relative flex min-w-0 flex-1 cursor-text flex-col border transition-all duration-200",
      "rounded-[28px] border-white/[0.055] bg-[rgba(78,78,78,0.18)] px-3 py-2 text-white/90 backdrop-blur-[42px] focus-within:border-white/[0.075] focus-within:bg-[rgba(96,96,96,0.2)]",
      hasAttachments ? "min-h-[140px]" : "min-h-[84px]",
    );

    return (
      <form className="-mx-1 space-y-2" onSubmit={onSubmit} data-composer-state={composerState}>
        {pendingPanel}
        {actionMenu}

        <motion.div
          layout
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <motion.div
            layout
            onPointerDown={focusTextarea}
            onClick={focusTextarea}
            className={mobileBoxClasses}
            style={mobileComposerGlassStyle}
            data-composer-mode={composerState}
            data-testid="unified-composer-box"
          >
            {isListening ? (
              <VoiceRecordingPanel
                audioLevels={voiceAudioLevels}
                onCancel={onCancelVoice}
                onFinish={onFinishVoice}
                isDark={isDark}
                appColor={appColor}
                compact
              />
            ) : (
              <>
                {modePill && (
                  <div className="mb-2 flex items-center gap-2" data-testid="composer-tool-state">
                    <button
                      type="button"
                      onClick={modePill.onClear}
                      className={cn(
                        "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold transition-colors",
                        "border border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white/85 active:bg-[rgba(106,106,106,0.2)]",
                      )}
                      style={mobileGlassIconStyle}
                      aria-label={modePill.clearLabel || `Clear ${modePill.label}`}
                      data-testid="composer-mode-pill"
                    >
                      {modePill.icon && <modePill.icon className="h-3.5 w-3.5" />}
                      <span className="truncate">{modePill.label}</span>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {hasAttachments && (
                  <div
                    className="mb-3 flex max-w-full items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    data-testid="composer-attachment-strip"
                  >
                    {normalizedAttachments.map((attachment) => (
                      <AttachmentPreview
                        key={attachment.id || getAttachmentPreview(attachment) || attachment.name}
                        attachment={attachment}
                        isDark={isDark}
                        isMobile
                        onRemove={onRemoveAttachment}
                      />
                    ))}

                    {isUploading && (
                      <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border", isDark ? "border-white/10 bg-white/[0.06]" : "border-[var(--bm-border)] bg-white/85")}>
                        <BlueMindLoadingDots className="text-[var(--bm-primary)]" />
                      </div>
                    )}

                    {normalizedAttachments.length > 1 && onClearAttachments && (
                      <button
                        type="button"
                        onClick={onClearAttachments}
                      className="h-9 shrink-0 rounded-full border border-white/[0.055] bg-[rgba(78,78,78,0.18)] px-3 text-xs font-bold text-white/85 hover:bg-[rgba(96,96,96,0.2)]"
                        style={mobileGlassIconStyle}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                <textarea
                  ref={setTextareaRef}
                  value={value}
                  onChange={onChange}
                  onInput={onInput}
                  onKeyDown={onKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  rows={1}
                  placeholder={placeholder}
                  className={cn(
                    inputClasses.composer,
                    "relative z-10 block w-full resize-none bg-transparent px-1 pb-1 text-[16px] font-medium leading-6 outline-none",
                    "text-white/90 placeholder:text-[#8F8F8F]",
                  )}
                  style={{
                    ...inputDirectionStyle,
                    letterSpacing: "0",
                    caretColor: "rgba(255,255,255,0.9)",
                    maxHeight: `${maxTextHeight}px`,
                    minHeight: `${textareaMinHeight}px`,
                  }}
                  data-testid={testId}
                />

                <div className="mt-1.5 flex min-h-10 w-full items-center gap-2.5">
                  {addButton}
                  <div className="min-w-0 flex-1" />
                  <div className="flex shrink-0 items-center gap-1.5">
                    {voiceButton}
                    {sendButton}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </form>
    );
  }

  return (
    <form className="space-y-2" onSubmit={onSubmit} data-composer-state={composerState}>
      {pendingPanel}
      {actionMenu}

      <motion.div
        layout
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn("flex w-full items-end", isMobile ? "gap-2.5" : "gap-3")}
      >
        {!isIdleState && addButton}

        <motion.div
          layout
          onPointerDown={focusTextarea}
          onClick={focusTextarea}
          className={cn(
            "relative flex min-w-0 flex-1 cursor-text flex-col border transition-all duration-200",
            isMobile
              ? isAttachmentState ? "rounded-[28px] px-3.5 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.14)]" : isTypingState ? "rounded-[27px] px-3.5 py-2.5 shadow-[0_16px_42px_rgba(15,23,42,0.12)]" : "rounded-[26px] px-2.5 py-2 shadow-[0_14px_38px_rgba(15,23,42,0.10)]"
              : isAttachmentState ? "rounded-[32px] px-4 py-3 sm:px-5" : "rounded-[31px] px-4 py-2.5 sm:px-5",
            isDark
              ? "border-white/[0.09] bg-[var(--bm-bg-card)]/[0.96] focus-within:bg-[var(--bm-bg-elevated)]"
              : "border-[var(--bm-border)] bg-white/95 focus-within:border-[var(--bm-border)] focus-within:shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
          )}
          style={{
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
          data-composer-mode={composerState}
          data-testid="unified-composer-box"
        >
          {isListening ? (
            <VoiceRecordingPanel
              audioLevels={voiceAudioLevels}
              onCancel={onCancelVoice}
              onFinish={onFinishVoice}
              isDark={isDark}
              appColor={appColor}
              compact={isMobile}
            />
          ) : (
            <>
              {modePill && (
                <div className="mb-2 flex items-center gap-2" data-testid="composer-tool-state">
                  <button
                    type="button"
                    onClick={modePill.onClear}
                    className={cn(
                      "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold transition-colors",
                      isDark ? "bg-white/[0.08] text-white active:bg-white/[0.13]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-icon-primary)] active:bg-[var(--bm-active-bg)]",
                    )}
                    aria-label={modePill.clearLabel || `Clear ${modePill.label}`}
                    data-testid="composer-mode-pill"
                  >
                    {modePill.icon && <modePill.icon className="h-3.5 w-3.5" />}
                    <span className="truncate">{modePill.label}</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {hasAttachments && (
                <div
                  className={cn(
                    "mb-3 flex max-w-full items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    isMobile ? "pb-0.5" : "pb-1",
                  )}
                  data-testid="composer-attachment-strip"
                >
                  {normalizedAttachments.map((attachment) => (
                    <AttachmentPreview
                      key={attachment.id || getAttachmentPreview(attachment) || attachment.name}
                      attachment={attachment}
                      isDark={isDark}
                      isMobile={isMobile}
                      onRemove={onRemoveAttachment}
                    />
                  ))}

                  {isUploading && (
                    <div
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-[16px] border",
                        isMobile ? "h-14 w-14" : "h-16 w-16",
                        isDark ? "border-white/10 bg-white/[0.06]" : "border-[var(--bm-border)] bg-white/85",
                      )}
                    >
                      <BlueMindLoadingDots className="text-[var(--bm-primary)]" />
                    </div>
                  )}

                  {normalizedAttachments.length > 1 && onClearAttachments && (
                    <button
                      type="button"
                      onClick={onClearAttachments}
                      className={cn(
                        "h-9 shrink-0 rounded-full px-3 text-xs font-bold",
                        isDark ? "bg-white/[0.07] text-white hover:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-icon-primary)] hover:bg-[var(--bm-active-bg)]",
                      )}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className={cn("flex w-full min-w-0 items-end", isIdleState ? "gap-1.5" : "gap-2")}>
                {isIdleState && addButton}

                <textarea
                  ref={setTextareaRef}
                  value={value}
                  onChange={onChange}
                  onInput={onInput}
                  onKeyDown={onKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  rows={1}
                  placeholder={placeholder}
                  className={cn(
                    inputClasses.composer,
                    "relative z-10 block min-w-0 flex-1 resize-none bg-transparent font-medium outline-none",
                    isMobile ? "text-[16px] leading-6" : "text-[17px] leading-7",
                    isDark ? "text-white placeholder:text-[var(--bm-text-muted)]/80" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-secondary)]/85",
                  )}
                  style={{
                    ...inputDirectionStyle,
                    letterSpacing: "0",
                    caretColor: isDark ? "#FFFFFF" : "var(--bm-text-primary)",
                    maxHeight: `${maxTextHeight}px`,
                    minHeight: `${textareaMinHeight}px`,
                  }}
                  data-testid={testId}
                />

                <div className={cn("flex shrink-0 items-end", isAttachmentState ? "self-end" : "self-end")}>
                  {voiceButton}
                  {sendButton}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </form>
  );
}
