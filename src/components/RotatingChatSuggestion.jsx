import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useApp } from "@/context/AppContext";

export const CHAT_SUGGESTION_KEYS = [
  "mobileChatSuggestionUnderstandLesson",
  "mobileChatSuggestionExplainTopic",
  "mobileChatSuggestionSummarizeDocument",
  "mobileChatSuggestionStudyPlan",
  "mobileChatSuggestionStructuredNotes",
  "mobileChatSuggestionStudyReminder",
  "mobileChatSuggestionWeeklySchedule",
  "mobileChatSuggestionResearchTopic",
  "mobileChatSuggestionGenerateImage",
  "mobileChatSuggestionWriteReport",
  "mobileChatSuggestionLearnSkill",
  "mobileChatSuggestionPersonalizedPlan",
];

const SUGGESTION_INTERVAL_MS = 4200;
const SUGGESTION_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

export default function RotatingChatSuggestion({ className = "", textClassName = "" }) {
  const { t, uiLanguage } = useApp();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [uiLanguage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % CHAT_SUGGESTION_KEYS.length);
    }, SUGGESTION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const suggestionKey = CHAT_SUGGESTION_KEYS[index % CHAT_SUGGESTION_KEYS.length];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${uiLanguage}-${index}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={SUGGESTION_TRANSITION}
        className={className}
      >
        <p className={textClassName}>{t(suggestionKey)}</p>
      </motion.div>
    </AnimatePresence>
  );
}
