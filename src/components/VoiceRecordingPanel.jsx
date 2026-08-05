import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, LoaderCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

function VoiceSpinner() {
  return (
    <motion.span
      className="bm-voice-spinner inline-flex h-4 w-4 items-center justify-center"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.82, ease: "linear", repeat: Infinity }}
      aria-hidden="true"
    >
      <LoaderCircle className="h-4 w-4" />
    </motion.span>
  );
}

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
  minimal = false,
}) {
  const [pendingAction, setPendingAction] = useState(null);
  const fallbackLevels = useMemo(() => Array.from({ length: minimal ? 32 : 28 }, () => 0.08), [minimal]);
  const rawLevels = audioLevels.length ? audioLevels : fallbackLevels;
  const [displayLevels, setDisplayLevels] = useState(rawLevels);
  const levels = displayLevels.length ? displayLevels : rawLevels;
  const isRequesting = status === "requesting";
  const isTranscribing = status === "transcribing";
  const isSending = status === "sending";
  const showStopSpinner = isTranscribing && pendingAction !== "send";
  const showSendSpinner = isSending || pendingAction === "send";
  const statusLabel = isRequesting ? "Requesting microphone" : isTranscribing ? "Transcribing..." : "Listening";
  const helperLabel = isRequesting
    ? "Allow microphone access"
    : isTranscribing
      ? "Finalizing your words"
      : (transcript ? transcript : "Speak naturally");

  useEffect(() => {
    if (!["transcribing", "sending"].includes(status)) {
      setPendingAction(null);
    }
  }, [status]);

  useEffect(() => {
    setDisplayLevels((current) => {
      if (current.length !== rawLevels.length) return rawLevels;

      return rawLevels.map((level, index) => {
        const previous = current[index] ?? level;
        const delta = level - previous;
        const factor = delta > 0 ? 0.42 : 0.24;
        return previous + delta * factor;
      });
    });
  }, [rawLevels]);

  const handleStop = () => {
    setPendingAction("stop");
    onStop?.(transcript);
  };

  const handleSend = () => {
    setPendingAction("send");
    onSend?.(transcript);
  };

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

      <div className={cn("flex min-w-0 flex-1 items-center gap-2", minimal && "justify-center")} aria-label="Live microphone waveform">
        {!minimal && (
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
        )}
        <div className={cn("flex shrink-0 items-center justify-center", minimal ? "h-9 w-full max-w-[168px] gap-[3px]" : "w-[74px] gap-[2px]")}>
          {levels.map((level, index) => {
            const height = Math.max(minimal ? 6 : compact ? 5 : 7, Math.round((minimal ? 34 : compact ? 28 : 44) * level));
            const opacity = minimal ? 0.48 + Math.min(0.46, level * 0.74) : 0.36 + Math.min(0.5, level * 0.7);
            return (
              <motion.span
                key={`${index}-${levels.length}`}
                animate={{ height, opacity }}
                transition={{ duration: minimal ? 0.11 : 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={cn("rounded-full", minimal ? "w-[4px]" : "w-[3px]")}
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
            onClick={handleStop}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              "bm-mobile-glass-control",
              !compact && "h-11 w-11 min-h-11 min-w-11",
            )}
            disabled={isRequesting || isTranscribing}
            aria-label="Stop voice input"
          >
            {showStopSpinner ? (
              <VoiceSpinner />
            ) : (
              <span className="bm-voice-stop-square" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={handleSend}
            onPointerDown={(event) => event.stopPropagation()}
            className="bm-mobile-glass-control bm-chat-composer-send-control"
            disabled={isRequesting || isTranscribing || isSending || !canSend}
            aria-label="Send voice input"
          >
            {showSendSpinner ? (
              <VoiceSpinner />
            ) : (
              <ArrowUp className="-translate-y-[1px] scale-y-[1.1]" />
            )}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleStop}
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            "bm-mobile-glass-control bm-chat-composer-send-control",
            !compact && "h-11 w-11 min-h-11 min-w-11",
          )}
          disabled={isRequesting || isTranscribing}
          aria-label="Finish voice input"
        >
          {showStopSpinner ? (
            <VoiceSpinner />
          ) : (
            <ArrowUp className="-translate-y-[1px] scale-y-[1.1]" />
          )}
        </button>
      )}
    </motion.div>
  );
}
