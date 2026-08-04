import { motion } from "framer-motion";
import { ArrowUp, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";

export default function VoiceRecordingPanel({
  audioLevels = [],
  onCancel,
  onStop,
  onSend,
  transcript = "",
  status = "listening",
  canSend = false,
  isDark = false,
  appColor = "var(--bm-primary)",
  compact = false,
  showSendControl = true,
}) {
  const levels = audioLevels.length ? audioLevels : Array.from({ length: 28 }, () => 0.08);
  const isRequesting = status === "requesting";
  const isTranscribing = status === "transcribing";
  const statusLabel = isRequesting ? "Requesting microphone" : isTranscribing ? "Transcribing..." : "Listening";
  const helperLabel = isRequesting
    ? "Allow microphone access"
    : isTranscribing
      ? "Finalizing your words"
      : (transcript ? transcript : "Speak naturally");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.99 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex w-full items-center gap-2.5",
        compact ? "min-h-[58px]" : "min-h-[96px]",
      )}
      data-testid="voice-recording-panel"
      data-voice-status={status}
    >
      <button
        type="button"
        onClick={onCancel}
        onPointerDown={(event) => event.stopPropagation()}
        className={cn(
          "bm-mobile-glass-control",
          !compact && "h-11 w-11 min-h-11 min-w-11",
        )}
        aria-label="Cancel voice input"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2" aria-label="Live microphone waveform">
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-[13px] font-extrabold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{statusLabel}</p>
          <p
            className={cn(
              "mt-0.5 truncate text-[11px] font-semibold",
              isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]",
            )}
            dir="auto"
          >
            {helperLabel}
          </p>
        </div>
        <div className="flex w-[74px] shrink-0 items-center justify-center gap-[2px]">
          {levels.map((level, index) => {
            const height = Math.max(compact ? 5 : 7, Math.round((compact ? 28 : 44) * level));
            const opacity = 0.36 + Math.min(0.5, level * 0.7);
            return (
              <motion.span
                key={`${index}-${levels.length}`}
                animate={{ height, opacity }}
                transition={{ duration: 0.08, ease: "linear" }}
                className="w-[3px] rounded-full"
                style={{
                  backgroundColor: index > levels.length * 0.36 && index < levels.length * 0.64
                    ? appColor
                    : isDark ? "rgba(255,255,255,0.72)" : "rgba(25,59,104,0.46)",
                }}
              />
            );
          })}
        </div>
      </div>

      {showSendControl ? (
        <>
          <button
            type="button"
            onClick={() => onStop?.(transcript)}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              "bm-mobile-glass-control",
              !compact && "h-11 w-11 min-h-11 min-w-11",
            )}
            disabled={isRequesting || isTranscribing}
            aria-label="Stop voice input"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => onSend?.(transcript)}
            onPointerDown={(event) => event.stopPropagation()}
            className="bm-mobile-glass-control bm-chat-composer-send-control"
            disabled={isRequesting || isTranscribing || !canSend}
            aria-label="Send voice input"
          >
            <ArrowUp className="-translate-y-[1px] scale-y-[1.1]" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onStop?.(transcript)}
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            "bm-mobile-glass-control bm-chat-composer-send-control",
            !compact && "h-11 w-11 min-h-11 min-w-11",
          )}
          disabled={isRequesting || isTranscribing}
          aria-label="Finish voice input"
        >
          <ArrowUp className="-translate-y-[1px] scale-y-[1.1]" />
        </button>
      )}
    </motion.div>
  );
}
