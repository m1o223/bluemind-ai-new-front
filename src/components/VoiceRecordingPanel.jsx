import { motion } from "framer-motion";
import { ArrowUp, X } from "lucide-react";

import { cn } from "@/lib/utils";

export default function VoiceRecordingPanel({
  audioLevels = [],
  onCancel,
  onFinish,
  isDark = false,
  appColor = "var(--bm-primary)",
  compact = false,
}) {
  const levels = audioLevels.length ? audioLevels : Array.from({ length: 28 }, () => 0.08);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex w-full items-center gap-3",
        compact ? "min-h-[76px]" : "min-h-[118px]",
      )}
      data-testid="voice-recording-panel"
    >
      <button
        type="button"
        onClick={onCancel}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full transition-colors",
          compact ? "h-10 w-10" : "h-11 w-11",
          isDark ? "bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)] hover:bg-[var(--bm-active-bg)]",
        )}
        aria-label="Cancel voice input"
      >
        <X className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-[3px]" aria-label="Live microphone waveform">
        {levels.map((level, index) => {
          const height = Math.max(compact ? 6 : 8, Math.round((compact ? 38 : 58) * level));
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

      <button
        type="button"
        onClick={onFinish}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(25,59,104,0.2)] transition-transform active:scale-95",
          compact ? "h-10 w-10" : "h-11 w-11",
        )}
        style={{ backgroundColor: appColor }}
        aria-label="Finish voice input"
      >
        <ArrowUp className={compact ? "h-[18px] w-[18px] -translate-y-[1px] stroke-[2.8]" : "h-5 w-5 -translate-y-[1px] stroke-[2.8]"} />
      </button>
    </motion.div>
  );
}
