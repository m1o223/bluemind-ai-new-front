import {
  BriefcaseBusiness,
  BookOpen,
  Code2,
  MessageCircle,
  Microscope,
  PenLine,
} from "lucide-react";

export const AI_MODES = [
  {
    id: "general",
    title: "General",
    description: "Everyday questions and normal help",
    status: "Analyzing request...",
    icon: MessageCircle,
  },
  {
    id: "study",
    title: "Study",
    description: "Careful learning and homework support",
    status: "Preparing a careful study answer...",
    icon: BookOpen,
  },
  {
    id: "research",
    title: "Research",
    description: "Deeper analysis and source comparison",
    status: "Researching the request...",
    icon: Microscope,
  },
  {
    id: "work",
    title: "Work",
    description: "Planning, documents, and productivity",
    status: "Organizing the work request...",
    icon: BriefcaseBusiness,
  },
  {
    id: "writing",
    title: "Writing",
    description: "Drafting, rewriting, and polishing text",
    status: "Shaping the writing...",
    icon: PenLine,
  },
  {
    id: "coding",
    title: "Coding",
    description: "Programming, debugging, and software engineering",
    status: "Preparing coding guidance...",
    icon: Code2,
  },
];

export const AI_MODE_IDS = AI_MODES.map((mode) => mode.id);

export function normalizeAiModeId(value) {
  const aliases = {
    fast: "general",
    smart: "general",
    thinking: "research",
    instant: "general",
    default: "general",
    balanced: "general",
    deep_thinking: "research",
    deep_research: "research",
    write_edit: "writing",
    code: "coding",
    programming: "coding",
  };
  const rawValue = String(value || "general").trim().toLowerCase();
  const normalized = aliases[rawValue] || rawValue;
  return AI_MODE_IDS.includes(normalized) ? normalized : "general";
}

export function getAiMode(value) {
  return AI_MODES.find((mode) => mode.id === normalizeAiModeId(value)) || AI_MODES[0];
}
