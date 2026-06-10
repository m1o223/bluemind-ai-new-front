import { useLayoutEffect } from "react";
import { ArrowUp, FileText, Mic, Plus, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";

function getAttachmentPreview(attachment) {
  return attachment.previewUrl || attachment.url || attachment.thumbnail || attachment.src || "";
}

function isImageAttachment(attachment) {
  return attachment.type === "image" || Boolean(getAttachmentPreview(attachment));
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
  isBusy = false,
  canSend = false,
  onSendAction,
  addLabel = "Attach",
  voiceLabel = "Voice",
  sendLabel = "Send",
  stopLabel = "Stop generating",
  isDark = false,
  appColor = "#193B68",
  variant = "desktop",
  minRows = 1,
  maxTextHeight = 180,
  inputDirectionStyle,
  actionMenu,
  pendingPanel,
  testId = "chat-input",
}) {
  const isMobile = variant === "mobile";
  const hasAttachments = attachments.length > 0 || isUploading;
  const isToolMode = hasAttachments || Boolean(modePill);
  const hasTallContent = isToolMode;
  const textareaMinHeight = isMobile ? 44 : 34;
  const addButton = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onAdd?.();
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-colors duration-200",
        isMobile ? "h-10 w-10" : "h-11 w-11",
        isToolMode
          ? isDark ? "text-[#D4D4D4] hover:bg-white/[0.08] hover:text-white" : "text-[#193B68] hover:bg-[#F3F4F6] hover:text-[#111827]"
          : isDark ? "bg-[#202020]/[0.92] text-[#D4D4D4] shadow-sm ring-1 ring-white/[0.08] hover:text-white" : "bg-white/90 text-[#193B68] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F3F4F6] hover:text-[#111827]",
      )}
      style={{
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
      aria-label={addLabel}
    >
      <Plus className={isMobile ? "h-[18px] w-[18px]" : "h-[21px] w-[21px]"} />
    </button>
  );

  useLayoutEffect(() => {
    const element = inputRef?.current;

    if (!element) return;

    element.style.height = "auto";

    if (value) {
      element.style.height = `${Math.min(element.scrollHeight, maxTextHeight)}px`;
    }
  }, [inputRef, maxTextHeight, value]);

  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      {pendingPanel}
      {actionMenu}
      {isToolMode && modePill && (
        <div className="space-y-2" data-testid="composer-tool-state">
          {modePill && (
            <button
              type="button"
              onClick={modePill.onClear}
              className={cn(
                "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold transition-colors",
                isDark ? "bg-white/[0.08] text-white active:bg-white/[0.13]" : "bg-[#EEF2FF] text-[#193B68] active:bg-[#E0E7FF]",
              )}
              aria-label={modePill.clearLabel || `Clear ${modePill.label}`}
              data-testid="composer-mode-pill"
            >
              {modePill.icon && <modePill.icon className="h-3.5 w-3.5" />}
              <span className="truncate">{modePill.label}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      <div className={cn("flex w-full items-end", isMobile ? "gap-2" : "gap-3")}>
        {!isToolMode && addButton}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 flex-col border shadow-sm transition-all duration-200 ease-out",
            isMobile
              ? "rounded-[27px] px-3.5 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
              : hasTallContent
                ? "rounded-[30px] px-4 py-3 sm:px-5"
                : "rounded-[31px] px-4 py-2.5 sm:px-5",
            isDark
              ? "border-white/[0.08] bg-[#202020]/[0.92] focus-within:bg-[#242424]"
              : "border-[#E5E7EB] bg-white/90 focus-within:border-[#D6DEE9] focus-within:shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
          )}
          style={{
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
          data-composer-mode={isToolMode ? "tool" : "normal"}
          data-testid="unified-composer-box"
        >
        {hasAttachments && (
          <div
            className={cn(
              "mb-2 flex max-w-full items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              isMobile ? "pb-0.5" : "pb-1",
            )}
            data-testid="composer-attachment-strip"
          >
            {attachments.map((attachment) => {
              const preview = getAttachmentPreview(attachment);
              const label = attachment.name || attachment.fileName || attachment.title || "Attachment";

              return (
                <div
                  key={attachment.id}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-[14px] border shadow-sm",
                    isMobile ? "h-12 w-12" : "h-14 w-14",
                    isDark ? "border-white/10 bg-white/[0.08]" : "border-[#D6DEE9] bg-[#EEF2FF]/90",
                  )}
                  title={label}
                >
                  {isImageAttachment(attachment) && preview ? (
                    <img
                      src={preview}
                      alt={label}
                      className="h-full w-full object-cover"
                      draggable="false"
                      loading="lazy"
                    />
                  ) : (
                    <div className={cn("flex h-full w-full items-center justify-center px-1", isDark ? "text-white" : "text-[#193B68]")}>
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                  {onRemoveAttachment && (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-transform active:scale-95"
                      aria-label={`Remove ${label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {isUploading && (
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[14px] border",
                  isMobile ? "h-12 w-12" : "h-14 w-14",
                  isDark ? "border-white/10 bg-white/[0.06]" : "border-[#E5E7EB] bg-white/85",
                )}
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#9CA3AF]/30 border-t-[#193B68]" />
              </div>
            )}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onInput={onInput}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder}
          className={cn(
            "block w-full resize-none bg-transparent font-medium outline-none",
            isMobile
              ? "max-h-[180px] min-h-[44px] text-[16px] leading-6"
              : hasTallContent
                ? "max-h-[220px] min-h-[42px] text-[16px] leading-6"
                : "max-h-40 min-h-8 text-[17px] leading-8",
            isDark ? "text-white placeholder:text-[#A7A7A7]/80" : "text-[#111827] placeholder:text-[#64748B]/85",
          )}
          style={{
            ...inputDirectionStyle,
            letterSpacing: "0",
            caretColor: isDark ? "#FFFFFF" : "#111827",
            maxHeight: `${maxTextHeight}px`,
            minHeight: `${textareaMinHeight}px`,
          }}
          data-testid={testId}
        />

        <div className="mt-1 flex items-center">
          {isToolMode && addButton}

          <div className="flex-1" />

          <button
            type="button"
            onClick={onVoice}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full transition-colors duration-200",
              isMobile ? "h-9 w-9" : "h-[38px] w-[38px]",
              isListening
                ? "text-white"
                : isDark
                  ? "text-[#D4D4D4] hover:text-white"
                  : "text-[#4B5563] hover:text-[#111827]",
            )}
            style={isListening ? { backgroundColor: appColor, borderColor: "rgba(255,255,255,0.16)" } : undefined}
            aria-label={voiceLabel}
          >
            <Mic className={isMobile ? "h-5 w-5" : "h-[19px] w-[19px]"} />
          </button>

          <button
            type={isBusy ? "button" : "submit"}
            onClick={onSendAction}
            disabled={!isBusy && !canSend}
            className={cn(
              "ml-1.5 flex shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(25,59,104,0.20)] transition-colors duration-200 disabled:cursor-not-allowed",
              isMobile ? "h-8 w-8" : "h-[42px] w-[42px]",
              isBusy || canSend
                ? "hover:opacity-95"
                : isDark ? "bg-[#4B5563]" : "bg-[#9CA3AF]",
            )}
            style={isBusy || canSend ? { backgroundColor: appColor, borderColor: "rgba(255,255,255,0.16)" } : undefined}
            aria-label={isBusy ? stopLabel : sendLabel}
          >
            {isBusy ? (
              <Square className={isMobile ? "h-3.5 w-3.5 fill-current" : "h-[14px] w-[14px] fill-current"} />
            ) : (
              <ArrowUp className={isMobile ? "h-[19px] w-[18px] -translate-y-[1px] scale-y-[1.06] stroke-[3]" : "h-[20px] w-[20px] -translate-y-[1px] scale-y-[1.08] stroke-[2.5]"} />
            )}
          </button>
        </div>
      </div>
      </div>
    </form>
  );
}
