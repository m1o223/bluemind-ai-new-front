import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const RESPONSE_MODE_ALIASES = {
  instant: "fast",
  default: "smart",
  balanced: "smart",
  deep_thinking: "thinking",
};

const RESPONSE_MODE_STATUS = {
  fast: {
    statusKey: "responseModeFastStatus",
    fallback: "Analyzing request...",
  },
  smart: {
    statusKey: "responseModeSmartStatus",
    fallback: "Analyzing request...",
  },
  thinking: {
    statusKey: "responseModeThinkingStatus",
    fallback: "Thinking deeply...",
  },
};

function normalizeResponseModeId(value) {
  const rawValue = String(value || "smart").trim().toLowerCase();
  const normalized = RESPONSE_MODE_ALIASES[rawValue] || rawValue;
  return RESPONSE_MODE_STATUS[normalized] ? normalized : "smart";
}

export default function ThinkingIndicator({ responseMode = "smart", className = "" }) {
  const { resolvedTheme, t } = useApp();
  const isDark = resolvedTheme === "dark";
  const mode = RESPONSE_MODE_STATUS[normalizeResponseModeId(responseMode)];
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
      <div className={cn("flex min-h-8 items-center gap-2 text-sm font-medium", isDark ? "text-[#D1D5DB]" : "text-[#4B5563]")}>
        <span className={cn("h-2 w-2 rounded-full", isDark ? "bg-white/55" : "bg-[#193B68]/55")} />
        <span>{mode.statusKey ? t(mode.statusKey) : (isLongThinking ? t("blueMindThinking") : t("thinking")) || mode.fallback}</span>
        <motion.span
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
          className={cn("h-1.5 w-1.5 rounded-full", isDark ? "bg-[#E5E7EB]" : "bg-[#193B68]")}
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
