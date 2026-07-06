import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const BLUEMIND_MODELS = [
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
    id: "research",
    label: "BlueMind Research",
    description: "Careful research answers",
    responseMode: "research",
    icon: Search,
  },
  {
    id: "vision",
    label: "BlueMind Vision",
    description: "Best with images and files",
    responseMode: "writing",
    icon: Sparkles,
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

export default function BlueMindModelSelector({
  responseMode,
  modelId,
  thinkingLevel = "balanced",
  onResponseModeChange,
  onThinkingLevelChange,
  isDark = false,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [thinkingSubmenuOpen, setThinkingSubmenuOpen] = useState(false);
  const activeModel = BLUEMIND_MODELS.find((model) => model.id === modelId) || getBlueMindModelByResponseMode(responseMode);
  const activeThinkingLevel = THINKING_LEVELS.find((level) => level.id === thinkingLevel) || THINKING_LEVELS[1];
  const selectedRowClass = isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-primary)]/10 text-[var(--bm-primary)]";
  const idleRowClass = isDark ? "text-white hover:bg-white/[0.07]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]";
  const dropdownSurfaceClass = isDark
    ? "bg-[var(--bm-bg-card)] text-white ring-white/[0.08] shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
    : "bg-white text-[var(--bm-text-primary)] ring-[var(--bm-border)] shadow-[0_12px_28px_rgba(15,23,42,0.10)]";

  useEffect(() => {
    if (!open) setThinkingSubmenuOpen(false);
  }, [open]);

  const selectModel = (model) => {
    onResponseModeChange?.(model.responseMode, model);
    setOpen(false);
  };

  const selectThinkingLevel = (level) => {
    onThinkingLevelChange?.(level.id, level);
    setThinkingSubmenuOpen(false);
    setOpen(false);
  };

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-10 max-w-full items-center gap-2 rounded-full text-sm font-bold transition-colors",
          compact ? "px-2.5" : "px-3",
          isDark ? "text-white hover:bg-white/[0.07]" : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${activeModel.label} - ${activeThinkingLevel.label}`}
      >
        <span className="min-w-0 truncate">{activeModel.label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0", isDark ? "text-white/75" : "text-[var(--bm-text-muted)]")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close model menu" />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={cn("absolute bottom-[calc(100%+8px)] left-0 z-50 flex items-end", compact && "max-sm:left-1/2 max-sm:-translate-x-1/2")}
            >
              <div className={cn("w-[248px] rounded-[20px] p-1.5 ring-1", dropdownSurfaceClass)}>
                {BLUEMIND_MODELS.map((model) => {
                  const selected = activeModel.id === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onMouseEnter={() => setThinkingSubmenuOpen(false)}
                      onFocus={() => setThinkingSubmenuOpen(false)}
                      onClick={() => selectModel(model)}
                      className={cn(
                        "flex min-h-[42px] w-full items-center gap-2 rounded-[14px] px-2.5 text-left text-sm font-extrabold transition-colors",
                        selected ? selectedRowClass : idleRowClass,
                      )}
                      title={model.description}
                      role="menuitemradio"
                      aria-checked={selected}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {selected && <Check className="h-5 w-5 stroke-[3] text-[var(--bm-check)]" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{model.label}</span>
                    </button>
                  );
                })}

                <div className={cn("my-1.5 h-px", isDark ? "bg-white/[0.08]" : "bg-[var(--bm-border)]")} />

                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setThinkingSubmenuOpen(true)}
                    onFocus={() => setThinkingSubmenuOpen(true)}
                    onClick={(event) => {
                      event.preventDefault();
                      setThinkingSubmenuOpen((value) => !value);
                    }}
                    className={cn(
                      "flex min-h-[42px] w-full items-center gap-2 rounded-[14px] px-2.5 text-left text-sm font-extrabold transition-colors",
                      thinkingSubmenuOpen ? selectedRowClass : idleRowClass,
                    )}
                    aria-haspopup="menu"
                    aria-expanded={thinkingSubmenuOpen}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center" />
                    <span className="min-w-0 flex-1 truncate">Thinking</span>
                    <ChevronRight className={cn("h-4 w-4 shrink-0", isDark ? "text-white/70" : "text-[var(--bm-text-muted)]")} />
                  </button>

                  <AnimatePresence>
                    {thinkingSubmenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -4, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          "absolute bottom-0 z-50 w-[174px] rounded-[20px] p-1.5 ring-1",
                          compact ? "right-0 sm:left-[calc(100%+8px)] sm:right-auto" : "left-[calc(100%+8px)]",
                          dropdownSurfaceClass,
                        )}
                        onMouseEnter={() => setThinkingSubmenuOpen(true)}
                      >
                        {THINKING_LEVELS.map((level) => {
                          const selected = activeThinkingLevel.id === level.id;
                          return (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => selectThinkingLevel(level)}
                              className={cn(
                                "flex min-h-[40px] w-full items-center gap-2 rounded-[14px] px-2.5 text-left text-sm font-extrabold transition-colors",
                                selected ? selectedRowClass : idleRowClass,
                              )}
                              title={level.description}
                              role="menuitemradio"
                              aria-checked={selected}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                {selected && <Check className="h-5 w-5 stroke-[3] text-[var(--bm-check)]" />}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{level.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
