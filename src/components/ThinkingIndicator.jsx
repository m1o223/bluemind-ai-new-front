import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { getAiMode, normalizeAiModeId } from "@/data/aiModes";

export default function ThinkingIndicator({ responseMode = "general", className = "" }) {
  const { resolvedTheme, t } = useApp();
  const isDark = resolvedTheme === "dark";
  const mode = getAiMode(normalizeAiModeId(responseMode));
  const [isLongThinking, setIsLongThinking] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLongThinking(true), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn("mb-8 flex w-full items-start", className)}
    >
      <div className={cn("flex min-h-8 items-center gap-2 text-sm font-medium", isDark ? "text-[var(--bm-border-strong)]" : "text-[var(--bm-text-secondary)]")}>
        <span className={cn("h-2 w-2 rounded-full", isDark ? "bg-white/55" : "bg-[var(--bm-primary)]/55")} />
        <span>{mode.status || (isLongThinking ? t("blueMindThinking") : t("thinking")) || "Analyzing request..."}</span>
        <motion.span
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
          className={cn("h-1.5 w-1.5 rounded-full", isDark ? "bg-[var(--bm-border)]" : "bg-[var(--bm-primary)]")}
        />
        {isLongThinking && (
          <span className="flex items-center gap-0.5">
            {[0, 180, 360].map((delay) => (
              <motion.span
                key={delay}
                animate={{ opacity: [0.25, 1, 0.25], y: [1, -1, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: delay / 1000, ease: "easeInOut" }}
                className="h-1 w-1 rounded-full bg-current"
              />
            ))}
          </span>
        )}
      </div>
    </motion.div>
  );
}
