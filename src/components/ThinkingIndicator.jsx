import { motion } from "framer-motion";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export default function ThinkingIndicator({ className = "" }) {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mb-8 flex w-full items-start", className)}
    >
      <div className={cn("inline-flex min-h-8 items-center gap-2 rounded-full text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
        <motion.span
          animate={{ opacity: [0.72, 1, 0.72] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="whitespace-nowrap"
        >
          BlueMind is thinking
        </motion.span>
        <span className="inline-flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              animate={{
                opacity: [0.32, 1, 0.32],
                scale: [0.86, 1.12, 0.86],
              }}
              transition={{
                duration: 1.05,
                repeat: Infinity,
                delay: index * 0.18,
                ease: "easeInOut",
              }}
              className={cn("h-1.5 w-1.5 rounded-full", isDark ? "bg-white" : "bg-[var(--bm-primary)]")}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
