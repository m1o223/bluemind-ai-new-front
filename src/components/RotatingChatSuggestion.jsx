import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  PenLine,
  Search,
} from "lucide-react";

import { useApp } from "@/context/AppContext";

export const CHAT_SUGGESTIONS = [
  { key: "mobileChatSuggestionUnderstandLesson", icon: BookOpen },
  { key: "mobileChatSuggestionExplainTopic", icon: Brain },
  { key: "mobileChatSuggestionSummarizeDocument", icon: FileText },
  { key: "mobileChatSuggestionStudyPlan", icon: CalendarDays },
  { key: "mobileChatSuggestionStructuredNotes", icon: FileText },
  { key: "mobileChatSuggestionStudyReminder", icon: Bell },
  { key: "mobileChatSuggestionWeeklySchedule", icon: CalendarDays },
  { key: "mobileChatSuggestionResearchTopic", icon: Search },
  { key: "mobileChatSuggestionGenerateImage", icon: ImageIcon },
  { key: "mobileChatSuggestionWriteReport", icon: PenLine },
  { key: "mobileChatSuggestionLearnSkill", icon: BookOpen },
  { key: "mobileChatSuggestionPersonalizedPlan", icon: Brain },
];

const SUGGESTION_INTERVAL_MS = 4200;
const SUGGESTION_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

export default function RotatingChatSuggestion({ className = "", iconClassName = "", textClassName = "" }) {
  const { t, uiLanguage, resolvedTheme } = useApp();
  const [index, setIndex] = useState(0);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    setIndex(0);
  }, [uiLanguage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % CHAT_SUGGESTIONS.length);
    }, SUGGESTION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const suggestion = CHAT_SUGGESTIONS[index % CHAT_SUGGESTIONS.length];
  const Icon = suggestion.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${uiLanguage}-${index}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={SUGGESTION_TRANSITION}
        className={`flex items-center justify-center gap-2.5 ${className}`}
      >
        <Icon
          aria-hidden="true"
          className={`shrink-0 ${isDark ? "text-white" : "text-[#111827]"} ${iconClassName}`}
        />
        <p className={textClassName}>{t(suggestion.key)}</p>
      </motion.div>
    </AnimatePresence>
  );
}
