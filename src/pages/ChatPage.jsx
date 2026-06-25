import { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Lock,
  Glasses,
  Home,
  Bell,
  BookOpen,
  CalendarDays,
  Clock,
  Settings,
  Plus,
  ChevronDown,
  X,
  PanelLeftClose,
  PanelLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Image as ImageIcon,
  FileText,
  File,
  Clipboard,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  RotateCcw,
  Share2,
  Search,
  Palette,
  Brain,
  Globe2,
  Check,
  Star,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { iconClasses, inputClasses, typeClasses } from "@/lib/interactions";
import { useApp } from "@/context/AppContext";
import BrandLogo, { APP_NAME } from "@/components/BrandLogo";
import DesktopSettingsPanel from "@/components/settings/DesktopSettingsPanel";
import { getDirectionalStyle } from "@/components/MarkdownText";
import MessageResponse from "@/components/MessageResponse";
import RotatingChatSuggestion from "@/components/RotatingChatSuggestion";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import DesktopComposer from "@/components/DesktopComposer";
import DesktopPlusMenu from "@/components/DesktopPlusMenu";
import {
  WEBSITE_CATEGORIES,
  WEBSITE_DIRECTORY,
  TRENDING_WEBSITE_IDS,
  createLiveWebsiteResults,
} from "@/data/websiteDirectory";
import {
  SEARCH_DISCOVERY_CATEGORIES,
  getSearchResultsForCategory,
} from "@/data/searchDiscovery";
import { AI_MODES, getAiMode, getAiSpecializationLabel, normalizeAiModeId } from "@/data/aiModes";
import { SEARCH_ARTWORK_COLORS, WRITE_EDIT_ARTWORK_COLORS } from "@/theme/colors";
import {
  buildWriteEditMessage,
  createWriteEditTask,
  getWriteEditAttachmentLabel,
  QUICK_WRITE_TEMPLATES,
  WRITE_EDIT_SECTIONS,
  WRITE_EDIT_UPLOAD_OPTIONS,
  WRITE_UPLOAD_ACTIONS,
} from "@/data/writeEditTemplates";
import {
  getConversation,
  listConversations,
  searchConversations,
  streamChatMessage,
  streamHiddenChatMessage,
} from "@/services/chatService";
import { deleteChat, renameChat, shareChat } from "@/services/conversationActions";
import { generateImage, getImageUrl, uploadChatImage } from "@/services/imageService";
import {
  createPrivateSpace,
  changePrivateSpacePin,
  deletePrivateSpace,
  deletePrivateSpaceChat,
  getPrivateSpaceChat,
  listPrivateSpaceChats,
  listPrivateSpaces,
  streamPrivateSpaceMessage,
  renamePrivateSpace,
  renamePrivateSpaceChat,
  unlockPrivateSpace,
} from "@/services/privateSpaceService";
import {
  createSuggestedReminder,
  suggestReminder,
} from "@/services/reminderService";
import { updatePreferences } from "@/services/profileService";
import useChatAutoScroll from "@/hooks/useChatAutoScroll";

const CHAT_MODES = {
  default: {
    id: "default",
    labelKey: "standardChat",
    shortLabelKey: "standard",
    icon: MessageSquare,
  },
  web_search: {
    id: "web_search",
    labelKey: "webSearch",
    shortLabelKey: "web",
    icon: Globe2,
  },
  write_edit: {
    id: "write_edit",
    labelKey: "writeEdit",
    shortLabelKey: "write",
    icon: Edit3,
  },
  create_image: {
    id: "create_image",
    labelKey: "createImage",
    shortLabelKey: "image",
    icon: Palette,
  },
  deep_research: {
    id: "deep_research",
    labelKey: "deepResearch",
    shortLabelKey: "research",
    icon: Brain,
  },
};

const RESPONSE_MODE_STORAGE_KEY = "bluemind_response_mode";
const THINKING_LEVEL_STORAGE_KEY = "bluemind_desktop_thinking_level";
const DESKTOP_MODEL_STORAGE_KEY = "bluemind_desktop_model";
const WEBSITE_FAVORITES_STORAGE_KEY = "bluemind_website_favorites";
const WEBSITE_RECENTS_STORAGE_KEY = "bluemind_website_recents";
const WEBSITE_PAGE_SIZE = 10;

function uiTextKey(prefix, value, suffix = "") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return suffix ? `${prefix}_${slug}_${suffix}` : `${prefix}_${slug}`;
}

const DISLIKE_REASONS = [
  "feedbackInaccurate",
  "feedbackBadFormatting",
  "feedbackSlow",
  "feedbackDidNotUnderstand",
  "feedbackOther",
];

function createIdeaThumbnail(seed, primary, secondary, accent) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="bg-${seed}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}"/>
          <stop offset="58%" stop-color="${secondary}"/>
          <stop offset="100%" stop-color="${accent}"/>
        </linearGradient>
        <radialGradient id="glow-${seed}" cx="35%" cy="25%" r="60%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.8)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <filter id="blur-${seed}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect width="640" height="420" rx="44" fill="url(#bg-${seed})"/>
      <circle cx="178" cy="92" r="160" fill="url(#glow-${seed})"/>
      <circle cx="512" cy="92" r="92" fill="rgba(255,255,255,0.24)" filter="url(#blur-${seed})"/>
      <rect x="64" y="238" width="236" height="118" rx="34" fill="rgba(255,255,255,0.24)"/>
      <rect x="340" y="186" width="202" height="170" rx="42" fill="rgba(255,255,255,0.18)"/>
      <path d="M84 310 C168 216 226 368 310 260 C390 160 456 314 560 214 L560 356 L84 356 Z" fill="rgba(15,23,42,0.22)"/>
      <path d="M92 306 C170 232 228 348 306 272 C386 192 450 304 548 230" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="9" stroke-linecap="round"/>
      <circle cx="450" cy="126" r="38" fill="rgba(255,255,255,0.78)"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const WRITE_CARD_ARTWORK = [
  WRITE_EDIT_ARTWORK_COLORS.careerBlue,
  WRITE_EDIT_ARTWORK_COLORS.writing,
  WRITE_EDIT_ARTWORK_COLORS.study,
  WRITE_EDIT_ARTWORK_COLORS.business,
  WRITE_EDIT_ARTWORK_COLORS.careerPurple,
  WRITE_EDIT_ARTWORK_COLORS.social,
  WRITE_EDIT_ARTWORK_COLORS.product,
  SEARCH_ARTWORK_COLORS[1],
  { from: "var(--bm-text-secondary)", via: "var(--bm-text-secondary)", to: "var(--bm-active-bg)" },
  SEARCH_ARTWORK_COLORS[7],
];

function getWriteCardArtwork(template, index = 0) {
  return template?.artwork || WRITE_CARD_ARTWORK[index % WRITE_CARD_ARTWORK.length];
}

function DesktopWriteArtwork({ template, icon: Icon, index = 0, category }) {
  const artwork = getWriteCardArtwork(template, index);
  const from = artwork.from || "var(--bm-primary)";
  const via = artwork.via || WRITE_EDIT_ARTWORK_COLORS.careerBlue.via;
  const to = artwork.to || WRITE_EDIT_ARTWORK_COLORS.writing.to;

  return (
    <div
      className="relative h-32 overflow-hidden rounded-[24px]"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${via} 56%, ${to} 100%)` }}
    >
      <div className="absolute -left-8 -top-10 h-36 w-36 rounded-full bg-white/28 blur-sm" />
      <div className="absolute right-5 top-5 h-16 w-16 rounded-[24px] bg-white/20 backdrop-blur-sm" />
      <div className="absolute bottom-5 left-6 h-16 w-32 rounded-[28px] bg-white/18 backdrop-blur-sm" />
      <div className="absolute bottom-6 right-7 h-24 w-24 rounded-[30px] bg-slate-950/14" />
      <svg className="absolute inset-x-6 bottom-6 h-20 w-[calc(100%-48px)]" viewBox="0 0 360 120" fill="none" aria-hidden="true">
        <path d="M8 88 C60 20 104 122 160 58 C224 -10 270 108 352 36" stroke="rgba(255,255,255,0.72)" strokeWidth="8" strokeLinecap="round" />
        <path d="M10 92 C62 38 106 112 162 70 C224 24 272 98 350 54 L350 116 L10 116 Z" fill="rgba(15,23,42,0.16)" />
      </svg>
      <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/24 text-white shadow-sm backdrop-blur-sm">
        {Icon && <Icon className="h-6 w-6 stroke-[2]" />}
      </div>
      {category && (
        <span className="absolute bottom-4 left-5 rounded-full bg-white/24 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          {category}
        </span>
      )}
    </div>
  );
}

function DesktopWriteToolCard({
  template,
  title,
  description,
  icon,
  index = 0,
  category,
  onClick,
  isDark,
  compact = false,
  className,
}) {
  const Icon = icon || template?.icon || PenLine;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.018, 0.14) }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[30px] border p-3 text-left shadow-sm transition-all duration-200",
        isDark
          ? "border-white/[0.08] bg-white/[0.055] text-white hover:border-white/[0.16] hover:bg-white/[0.085] hover:shadow-[0_22px_60px_rgba(0,0,0,0.24)]"
          : "border-white/80 bg-white/88 text-[var(--bm-text-primary)] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_24px_60px_rgba(15,23,42,0.13)]",
        className,
      )}
    >
      <DesktopWriteArtwork template={template} icon={Icon} index={index} category={category} />
      <span className={cn("flex flex-1 flex-col px-2 pb-2", compact ? "pt-3" : "pt-4")}>
        <span className={cn("block font-extrabold tracking-tight", compact ? "text-[15px] leading-5" : "text-base leading-6")}>
          {title}
        </span>
        <span className={cn("mt-2 block font-semibold leading-5", compact ? "text-xs" : "text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          {description}
        </span>
      </span>
    </motion.button>
  );
}

const IMAGE_IDEAS = [
  {
    id: "anime",
    title: "Anime",
    category: "Stylized Art",
    description: "Create anime-style artwork from your idea.",
    prompt: "Create a polished anime-style portrait with cinematic lighting, expressive eyes, and a clean BlueMind-inspired blue atmosphere.",
    thumbnail: createIdeaThumbnail("anime", "#7C3AED", "#2563EB", "#F472B6"),
  },
  {
    id: "portrait",
    title: "Portrait",
    category: "People",
    description: "Generate a refined studio portrait.",
    prompt: "Create a refined professional portrait with soft studio lighting, realistic skin texture, sharp details, and a minimal background.",
    thumbnail: createIdeaThumbnail("portrait", "var(--bm-text-primary)", "var(--bm-text-secondary)", "#D8B4FE"),
  },
  {
    id: "mini-me",
    title: "Mini Me",
    category: "Personalized",
    description: "Turn yourself into a playful mini scene.",
    prompt: "Create a realistic mini version of me sitting on my desk, highly detailed, playful scale, premium studio lighting, clean modern background.",
    thumbnail: createIdeaThumbnail("mini-me", "#155E75", "#0E7490", "#FBBF24"),
  },
  {
    id: "research",
    title: "Research",
    category: "Knowledge",
    description: "Visualize notes, data, and discoveries.",
    prompt: "Create a futuristic research board visual with notes, diagrams, data cards, and a calm blue glassmorphism interface.",
    thumbnail: createIdeaThumbnail("research", "var(--bm-primary)", "#2563EB", "#22D3EE"),
  },
  {
    id: "recipe",
    title: "Recipe",
    category: "Food",
    description: "Design an editorial recipe visual.",
    prompt: "Create a premium recipe card image with fresh ingredients, elegant plating, soft natural light, and clean editorial composition.",
    thumbnail: createIdeaThumbnail("recipe", "#166534", "#65A30D", "#FDBA74"),
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk",
    category: "Sci-Fi",
    description: "Build a neon cinematic future scene.",
    prompt: "Create a futuristic cyberpunk city scene with neon blue accents, rain reflections, cinematic depth, and clean high-end detail.",
    thumbnail: createIdeaThumbnail("cyberpunk", "#020617", "#7C2D12", "#06B6D4"),
  },
  {
    id: "fantasy",
    title: "Fantasy",
    category: "Worldbuilding",
    description: "Create magical landscapes and worlds.",
    prompt: "Create a fantasy landscape with glowing blue crystals, misty mountains, cinematic light, and an elegant magical atmosphere.",
    thumbnail: createIdeaThumbnail("fantasy", "#312E81", "#7E22CE", "#A7F3D0"),
  },
  {
    id: "realistic-photo",
    title: "Realistic Photo",
    category: "Photography",
    description: "Make a natural, camera-real image.",
    prompt: "Create a realistic photo with natural light, believable details, true-to-life textures, shallow depth of field, and professional composition.",
    thumbnail: createIdeaThumbnail("realistic-photo", "var(--bm-text-secondary)", "var(--bm-text-secondary)", "var(--bm-bg-elevated)"),
  },
  {
    id: "cartoon",
    title: "Cartoon",
    category: "Illustration",
    description: "Make a friendly polished cartoon.",
    prompt: "Create a friendly cartoon character with expressive features, modern colors, clean outlines, and a polished app-style finish.",
    thumbnail: createIdeaThumbnail("cartoon", "var(--bm-warning)", "var(--bm-warning)", "#38BDF8"),
  },
  {
    id: "logo",
    title: "Logo Design",
    category: "Branding",
    description: "Explore a clean brand mark concept.",
    prompt: "Create a clean modern logo concept with a premium AI brand feeling, simple geometry, blue accent color, and strong scalability.",
    thumbnail: createIdeaThumbnail("logo", "var(--bm-text-primary)", "var(--bm-primary)", "#E0F2FE"),
  },
  {
    id: "architecture",
    title: "Architecture",
    category: "Spaces",
    description: "Imagine a premium building or interior.",
    prompt: "Create a modern architectural concept with elegant structure, warm interior lighting, clean materials, dramatic scale, and magazine-quality composition.",
    thumbnail: createIdeaThumbnail("architecture", "var(--bm-border-strong)03C", "#78716C", "#FDE68A"),
  },
  {
    id: "product-mockup",
    title: "Product Mockup",
    category: "Commerce",
    description: "Stage a product like a launch image.",
    prompt: "Create a premium product mockup on a clean studio set, refined lighting, realistic shadows, high-end materials, and a polished commercial look.",
    thumbnail: createIdeaThumbnail("product-mockup", "#0F766E", "#14B8A6", "#CCFBF1"),
  },
  {
    id: "nature",
    title: "Nature",
    category: "Landscape",
    description: "Generate cinematic natural scenery.",
    prompt: "Create a cinematic nature scene with rich atmosphere, detailed plants, natural light, depth, and a peaceful high-resolution landscape feel.",
    thumbnail: createIdeaThumbnail("nature", "#14532D", "var(--bm-success)", "#BAE6FD"),
  },
  {
    id: "character-design",
    title: "Character Design",
    category: "Characters",
    description: "Design a memorable original character.",
    prompt: "Create an original character design sheet with expressive personality, detailed outfit, strong silhouette, polished lighting, and concept-art quality.",
    thumbnail: createIdeaThumbnail("character-design", "#581C87", "#C026D3", "#FDE68A"),
  },
  {
    id: "concept-art",
    title: "Concept Art",
    category: "Creative Direction",
    description: "Explore a cinematic visual direction.",
    prompt: "Create cinematic concept art with dramatic composition, rich atmosphere, layered depth, premium lighting, and a clear visual story.",
    thumbnail: createIdeaThumbnail("concept-art", "#1E1B4B", "#4338CA", "#FB7185"),
  },
];

function isAbsoluteUrl(url) {
  return /^(https?:|blob:|data:)/i.test(String(url || ""));
}

function resolveAttachmentPreviewUrl(attachment) {
  if (!attachment) return "";
  if (attachment.previewUrl) return attachment.previewUrl;
  if (isAbsoluteUrl(attachment.url)) return attachment.url;
  if (attachment.thumbnail) return attachment.thumbnail;
  if (attachment.src) return attachment.src;
  if (attachment.imageId) return getImageUrl(attachment.imageId);
  if (attachment.id) return getImageUrl(attachment.id);
  return attachment.url || "";
}

function splitUserImageTextMessage(message) {
  const attachments = Array.isArray(message?.attachments) ? message.attachments.filter((attachment) => resolveAttachmentPreviewUrl(attachment)) : [];
  const content = String(message?.content || "").trim();

  if (message?.role !== "user" || !attachments.length || !content) {
    return [message];
  }

  return [
    {
      ...message,
      id: `${message.id}:images`,
      content: "",
      attachments,
      metadata: { ...(message.metadata || {}), splitFromMessageId: message.id, splitKind: "images" },
    },
    {
      ...message,
      id: `${message.id}:text`,
      attachments: [],
      metadata: { ...(message.metadata || {}), splitFromMessageId: message.id, splitKind: "text" },
    },
  ];
}

function formatHistoryDate(value, language) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString(language || "en", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function HighlightedMatch({ text, query }) {
  const value = String(text || "");
  const terms = String(query || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!terms.length) return value;

  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const lowerTerms = terms.map((term) => term.toLowerCase());
  const matcher = new RegExp(`(${escaped.join("|")})`, "ig");
  const parts = value.split(matcher).filter(Boolean);

  return parts.map((part, index) => (
    lowerTerms.includes(part.toLowerCase()) ? (
      <mark key={`${part}-${index}`} className="rounded-md bg-[#FACC15]/25 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  ));
}

const HistoryItem = memo(function HistoryItem({
  item,
  isActive,
  isDark,
  language,
  isSidebarOpen,
  menuOpenId,
  onMenuToggle,
  onOpen,
  onRename,
  onShare,
  onDelete,
  t,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraftTitle(item.title || "");
  }, [item.title]);

  if (!isSidebarOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(item.conversationId)}
        className={cn(
          "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
          isActive
            ? isDark ? "bg-white/10 text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]"
            : isDark ? "text-[var(--bm-text-muted)] hover:bg-white/[0.08] hover:text-white" : "text-[var(--bm-text-secondary)] hover:bg-black/[0.05] hover:text-[var(--bm-text-primary)]"
        )}
        title={item.title || t("newChat")}
      >
        <MessageSquare className={iconClasses.button} />
        <span className={cn("pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg px-2 py-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100", typeClasses.small, isDark ? "bg-[var(--bm-bg-elevated)] text-white" : "bg-white text-[var(--bm-text-primary)]")}>
          {item.title || t("newChat")}
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group/history relative rounded-xl border px-2.5 py-2 transition-all duration-200",
        isActive
          ? isDark ? "border-[#3F5F8C] bg-[#27384F] text-white" : "border-[#B7C7FF] bg-[#EAF0FF] text-[#102E5A]"
          : isDark ? "border-transparent text-[var(--bm-text-secondary)] hover:border-[var(--bm-border-strong)] hover:bg-[var(--bm-bg-elevated)] hover:text-white" : "border-transparent text-[var(--bm-text-secondary)] hover:border-[var(--bm-border-strong)] hover:bg-white hover:text-[var(--bm-text-primary)]",
      )}
    >
      <div className={cn("flex min-w-0 items-center justify-between", iconClasses.iconText)}>
        <button type="button" onClick={() => onOpen(item.conversationId)} className={cn("flex min-w-0 flex-1 items-center text-left", iconClasses.iconText)} data-testid={`history-chat-${item.conversationId}`} title={item.title || t("newChat")}>
          <MessageSquare className={cn("flex-shrink-0", iconClasses.button, isActive && (isDark ? "text-white" : "text-[var(--bm-primary)]"))} />
          {isEditing ? (
            <input
              value={draftTitle}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setDraftTitle(event.target.value.slice(0, 120))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && draftTitle.trim()) {
                  event.preventDefault();
                  onRename(item, draftTitle.trim());
                  setIsEditing(false);
                  onMenuToggle(null);
                }
                if (event.key === "Escape") setIsEditing(false);
              }}
              onBlur={() => {
                if (draftTitle.trim() && draftTitle.trim() !== item.title) onRename(item, draftTitle.trim());
                setIsEditing(false);
              }}
              autoFocus
              className={cn("min-w-0 flex-1 rounded-md bg-transparent font-semibold outline-none", typeClasses.small, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}
            />
          ) : (
            <span className={cn("block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-5", typeClasses.small)} style={getDirectionalStyle(item.title || "")}>
              {item.title || t("newChat")}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMenuToggle(menuOpenId === item.conversationId ? null : item.conversationId);
          }}
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg opacity-0 transition-all duration-200 group-hover/history:opacity-100",
            menuOpenId === item.conversationId && "opacity-100",
            isDark ? "text-[var(--bm-text-secondary)] hover:bg-white/[0.08] hover:text-white" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)] hover:text-[var(--bm-text-primary)]",
          )}
          data-testid={`history-menu-${item.conversationId}`}
        >
          <MoreVertical className={iconClasses.button} />
        </button>
      </div>

      {menuOpenId === item.conversationId && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => onMenuToggle(null)} />
          <div
            className={cn(
              "absolute right-1 top-9 z-30 w-36 overflow-hidden rounded-xl border py-1 shadow-lg",
              isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white",
            )}
            data-testid={`history-dropdown-${item.conversationId}`}
          >
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                onMenuToggle(null);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left",
                iconClasses.iconText,
                typeClasses.small,
                isDark ? "text-[var(--bm-text-primary)] hover:bg-white/[0.08]" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]",
              )}
            >
              <Pencil className={iconClasses.button} />
              {t("renameChat")}
            </button>
            <button
              type="button"
              onClick={() => {
                onShare(item);
                onMenuToggle(null);
              }}
              className={cn("flex w-full items-center px-3 py-2 text-left", iconClasses.iconText, typeClasses.small, isDark ? "text-[var(--bm-text-primary)] hover:bg-white/[0.08]" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]")}
            >
              <Share2 className={iconClasses.button} />
              Share
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left",
                iconClasses.iconText,
                typeClasses.small,
                isDark ? "text-red-300 hover:bg-red-950/30" : "text-red-500 hover:bg-red-50",
              )}
            >
              <Trash2 className={iconClasses.button} />
              {t("deleteChat")}
            </button>
          </div>
        </>
      )}

      {confirmDelete && (
        <div className={cn("mt-2 rounded-xl border p-2", typeClasses.small, isDark ? "border-red-400/20 bg-red-950/20 text-red-100" : "border-red-200 bg-red-50 text-red-700")}>
          <p className="mb-2 font-semibold">{t("deleteChatShortConfirm")}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg px-2 py-1 hover:bg-black/5">{t("cancel")}</button>
            <button type="button" onClick={() => onDelete(item)} className="flex-1 rounded-lg bg-red-500 px-2 py-1 text-white">{t("delete")}</button>
          </div>
        </div>
      )}

      <p className={cn("ml-[27px] mt-1 truncate font-medium leading-4", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>
        {formatHistoryDate(item.lastMessageAt || item.updatedAt, language)}
      </p>
    </div>
  );
});

function Sidebar({
  isHistoryOpen,
  onToggleHistory,
  onNewChat,
  onOpenSettings,
  history,
  activeConversationId,
  onOpenConversation,
  onRenameConversation,
  onShareConversation,
  onDeleteConversation,
  chatSessionMode,
  privateSpaceName,
  onSelectNormalChat,
  onOpenPrivateChat,
  onOpenHiddenChat,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, prefs, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!isHistoryOpen) setMenuOpenId(null);
  }, [isHistoryOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        if (chatSessionMode !== "normal") {
          if (!cancelled) {
            setSearchResults([]);
          }
          return;
        }

        const result = await searchConversations(query, 20);
        if (!cancelled) {
          setSearchResults(Array.isArray(result?.items) ? result.items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          console.warn("Could not search conversations", error);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [chatSessionMode, searchOpen, searchQuery]);

  const openSearchPanel = useCallback(() => {
    setSearchOpen(true);
    setRecentsOpen(false);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const localSearchResults = normalizedSearchQuery
    ? history.filter((item) => {
        const title = String(item.title || t("newChat")).toLowerCase();
        return normalizedSearchQuery.split(/\s+/).every((term) => title.includes(term));
      })
    : history.slice(0, 8);
  const combinedSearchResults = normalizedSearchQuery
    ? [
        ...localSearchResults,
        ...searchResults.filter((item) => !localSearchResults.some((localItem) => localItem.conversationId === item.conversationId)),
      ].slice(0, 10)
    : localSearchResults;
  const searchPanelTitle = normalizedSearchQuery ? "Matching conversations" : "Recent Conversations";

  const chatItems = [
    {
      id: "new_chat",
      icon: Pencil,
      label: t("newChat"),
      action: onNewChat,
      testId: "new-chat-button",
    },
    { id: "search", icon: Search, label: "Search", action: openSearchPanel },
    {
      id: "recent_chats",
      icon: Clock,
      label: "Recent Chats",
      action: () => {
        setSearchOpen(false);
        setRecentsOpen((open) => !open);
      },
    },
  ];

  const chatModeItems = [
    {
      id: "normal_chat",
      icon: MessageSquare,
      label: "Normal Chat",
      action: onSelectNormalChat,
      active: chatSessionMode === "normal",
    },
    {
      id: "private_chat",
      icon: Lock,
      label: "Private Chat",
      action: onOpenPrivateChat,
      active: chatSessionMode === "private",
    },
    {
      id: "hidden_chat",
      icon: Glasses,
      label: "Hidden Chat",
      action: onOpenHiddenChat,
      active: chatSessionMode === "hidden",
    },
  ];

  const bluemindItems = [
    {
      id: "dashboard",
      icon: Home,
      label: "Smart Hub",
      action: () => navigate("/dashboard"),
    },
    {
      id: "reminders",
      icon: Bell,
      label: t("reminders"),
      action: () => navigate("/reminders"),
    },
    {
      id: "learning",
      icon: BookOpen,
      label: t("learning"),
      action: () => navigate("/learning"),
    },
    {
      id: "ai_plans",
      icon: Sparkles,
      label: "AI Plans",
      action: () => navigate("/ai-plans"),
    },
    {
      id: "scheman",
      icon: CalendarDays,
      label: t("scheman"),
      action: () => navigate("/scheman"),
    },
  ];
  const collapsedPrimaryItems = [
    {
      id: "chat",
      icon: MessageSquare,
      label: "Chat",
      action: () => {
        if (chatSessionMode !== "normal") onSelectNormalChat?.();
        navigate("/chat");
      },
      active: location.pathname === "/chat" || location.pathname === "/",
    },
    {
      id: "learning",
      icon: BookOpen,
      label: t("learning"),
      action: () => navigate("/learning"),
      active: location.pathname.startsWith("/learning"),
    },
    {
      id: "ai_plans",
      icon: Sparkles,
      label: "AI Plans",
      action: () => navigate("/ai-plans"),
      active: location.pathname.startsWith("/ai-plans"),
    },
    {
      id: "dashboard",
      icon: Home,
      label: "Smart Hub",
      action: () => navigate("/dashboard"),
      active: location.pathname.startsWith("/dashboard"),
    },
    {
      id: "reminders",
      icon: Bell,
      label: t("reminders"),
      action: () => navigate("/reminders"),
      active: location.pathname.startsWith("/reminders"),
    },
  ];
  const settingsItem = {
    id: "settings",
    icon: Settings,
    label: t("settings"),
    action: onOpenSettings,
  };
  const renderCollapsedRailItem = (item) => (
    <div key={item.id} className="relative">
      <button
        type="button"
        onClick={() => item.action?.()}
        className={cn(
          "group relative flex h-12 w-full items-center justify-center rounded-2xl transition-all duration-200",
          item.active
            ? isDark
              ? "bg-[var(--bm-primary)]/18 text-white shadow-[0_10px_26px_rgba(25,59,104,0.22)]"
              : "bg-[var(--bm-primary)]/12 text-[var(--bm-primary)] shadow-[0_10px_26px_rgba(25,59,104,0.12)]"
            : isDark
              ? "text-[#E4E4E7] hover:bg-white/[0.08] hover:text-white"
              : "text-[var(--bm-text-primary)] hover:bg-black/[0.05] hover:text-[var(--bm-primary)]",
        )}
        data-testid={`nav-${item.id}`}
        title={item.label}
      >
        <item.icon className={cn("flex-shrink-0 stroke-[2.35]", iconClasses.sidebar)} />
        <span className={cn("pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg px-2 py-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100", typeClasses.small, isDark ? "bg-[var(--bm-bg-elevated)] text-white" : "bg-white text-[var(--bm-text-primary)]")}>
          {item.label}
        </span>
      </button>
    </div>
  );
  const renderSidebarSection = (title, items) => (
    <div className="space-y-1">
      {isHistoryOpen && (
        <p className={cn("px-3.5 pb-1 pt-2 font-bold uppercase tracking-[0.14em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          {title}
        </p>
      )}
      {items.map((item) => (
        <div key={item.id} className="relative">
          <button
            onClick={() => {
              item.action?.();
            }}
            className={cn(
              "group flex w-full items-center rounded-xl transition-all duration-200 cursor-pointer",
              iconClasses.iconText,
              isHistoryOpen ? "px-3.5 py-3" : "h-12 justify-center px-0 py-0",
              isDark
                ? "text-[#E4E4E7] hover:bg-white/[0.08] hover:text-white"
                : "text-[var(--bm-text-primary)] hover:bg-black/[0.05] hover:text-[var(--bm-text-primary)]",
              item.active && (isDark ? "bg-white/[0.1] text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]"),
            )}
            data-testid={item.testId || `nav-${item.id}`}
            title={!isHistoryOpen ? item.label : undefined}
          >
            <item.icon className={cn("flex-shrink-0 stroke-[2.35]", iconClasses.sidebar)} />
            {isHistoryOpen && <span className={cn("min-w-0 truncate font-medium", typeClasses.body)}>{item.label}</span>}
            {!isHistoryOpen && (
              <span className={cn("pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg px-2 py-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100", typeClasses.small, isDark ? "bg-[var(--bm-bg-elevated)] text-white" : "bg-white text-[var(--bm-text-primary)]")}>
                {item.label}
              </span>
            )}
          </button>
          {item.id === "recent_chats" && recentsOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setRecentsOpen(false)} />
              <div className={cn("absolute left-full top-0 z-30 ml-3 w-[min(20rem,calc(100vw-6rem))] rounded-3xl border p-3 shadow-[0_24px_70px_rgba(15,23,42,0.25)] backdrop-blur-[18px]", isDark ? "border-white/10 bg-[#232323]/95 text-white" : "border-white/70 bg-white/95 text-[var(--bm-text-primary)]")}>
                <p className={cn("mb-2 px-2 font-semibold uppercase tracking-[0.14em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("recents")}</p>
                <div className="max-h-[420px] space-y-1 overflow-y-auto">
                  {history.slice(0, 12).map((historyItem) => (
                    <HistoryItem
                      key={historyItem.conversationId}
                      item={historyItem}
                      isActive={activeConversationId === historyItem.conversationId}
                      isDark={isDark}
                      isSidebarOpen
                      language={prefs.language}
                      menuOpenId={menuOpenId}
                      onMenuToggle={setMenuOpenId}
                      onOpen={(id) => {
                        setRecentsOpen(false);
                        onOpenConversation(id);
                      }}
                      onRename={(conversation, title) => onRenameConversation(conversation, title)}
                      onShare={onShareConversation}
                      onDelete={onDeleteConversation}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <motion.aside
      animate={{
        x: 0,
        width: isHistoryOpen ? 328 : 84,
      }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "h-full flex flex-col overflow-visible flex-shrink-0",
        isDark ? "bg-[var(--bm-bg-app)]/96" : "bg-[var(--bm-bg-app)]/96",
      )}
      data-testid="sidebar"
    >
      <div
        className={cn(
          "relative flex items-center justify-between p-4 after:absolute after:bottom-0 after:h-px after:content-['']",
          isHistoryOpen ? "after:left-3.5 after:right-3.5" : "after:left-4 after:right-4",
          isDark ? "after:bg-white/[0.08]" : "after:bg-[var(--bm-border)]",
        )}
      >
        {isHistoryOpen ? (
          <>
            <span className={cn("truncate font-semibold tracking-tight", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
              {APP_NAME}
            </span>
            <button
              onClick={onToggleHistory}
              aria-label={t("collapseSidebar")}
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-200 cursor-pointer",
                isDark ? "text-[var(--bm-text-secondary)] hover:bg-white/[0.08] hover:text-white" : "text-[var(--bm-text-secondary)] hover:bg-black/[0.05] hover:text-[var(--bm-text-primary)]",
              )}
              data-testid="sidebar-toggle"
            >
              <PanelLeftClose className={cn("stroke-[2.25]", iconClasses.sidebar)} />
            </button>
          </>
        ) : (
          <button
            onClick={onToggleHistory}
            aria-label={t("openSidebar")}
            className={cn(
              "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200",
              isDark ? "text-white hover:bg-white/[0.08]" : "text-[var(--bm-text-primary)] hover:bg-black/[0.05]",
            )}
            data-testid="sidebar-toggle"
          >
            <BrandLogo showName={false} small logoClassName={cn(iconClasses.sidebarLogo, "transition-opacity duration-150 group-hover:opacity-0")} />
            <PanelLeft className={cn("absolute opacity-0 transition-opacity duration-150 group-hover:opacity-100", iconClasses.sidebar)} />
            <span className={cn("pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg px-2 py-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100", typeClasses.small, isDark ? "bg-[var(--bm-bg-elevated)] text-white" : "bg-white text-[var(--bm-text-primary)]")}>
              Open sidebar
            </span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isHistoryOpen && searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="relative z-30 px-3.5 pt-3"
          >
          {searchOpen && <div className="fixed inset-0 z-20" onClick={() => setSearchOpen(false)} />}
          <div className="relative z-30">
            <label
              className={cn(
                "flex h-12 w-full items-center gap-3 rounded-[18px] border px-4 transition-all duration-200",
                searchOpen
                  ? isDark ? "border-white/15 bg-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.24)]" : "border-[var(--bm-border-strong)] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.12)]"
                  : isDark ? "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.07]" : "border-[var(--bm-border)] bg-white/80 hover:bg-white",
              )}
            >
              <Search className={cn("flex-shrink-0 stroke-[2.25]", iconClasses.button, isDark ? "text-[#D6D6D6]" : "text-[var(--bm-text-secondary)]")} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onClick={() => setSearchOpen(true)}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("searchConversations")}
                className={cn(
                  "min-w-0 flex-1 bg-transparent font-semibold outline-none",
                  typeClasses.small,
                  isDark ? "text-white placeholder:text-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-muted)]",
                )}
                data-testid="conversation-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors", isDark ? "text-[var(--bm-text-muted)] hover:bg-white/10 hover:text-white" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)] hover:text-[var(--bm-text-primary)]")}
                  aria-label={t("clearSearch")}
                >
                  <X className={iconClasses.button} />
                </button>
              )}
            </label>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className={cn(
                    "absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[22px] border p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-[18px]",
                    isDark ? "border-white/10 bg-[#232323]/95 text-white" : "border-white/75 bg-white/95 text-[var(--bm-text-primary)]",
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className={cn("px-2.5 pb-2 pt-1.5 font-bold uppercase tracking-[0.13em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                    {searchPanelTitle}
                  </div>
                  <div className="max-h-[336px] space-y-1 overflow-y-auto pr-0.5">
                    {combinedSearchResults.map((item) => (
                      <button
                        key={item.conversationId}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          onOpenConversation(item.conversationId);
                        }}
                        className={cn("flex w-full items-start rounded-2xl px-3 py-2.5 text-left transition-all duration-150", iconClasses.iconText, isDark ? "hover:bg-white/[0.08]" : "hover:bg-[var(--bm-hover-bg)]")}
                      >
                        <span className={cn("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl", isDark ? "bg-white/[0.07] text-[#DADADA]" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]")}>
                          <Search className={cn("stroke-[2.25]", iconClasses.button)} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-semibold leading-5", typeClasses.small)}>
                            <HighlightedMatch text={item.title || t("newChat")} query={searchQuery} />
                          </span>
                          <span className={cn("mt-0.5 block truncate font-medium leading-4", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                            {formatHistoryDate(item.lastMessageAt || item.updatedAt, prefs.language)}
                          </span>
                        </span>
                      </button>
                    ))}
                    {isSearching && normalizedSearchQuery && (
                      <div className={cn("rounded-2xl px-3 py-3 font-medium", typeClasses.small, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{t("searching")}</div>
                    )}
                    {!isSearching && normalizedSearchQuery && combinedSearchResults.length === 0 && (
                      <div className={cn("rounded-2xl px-3 py-3 font-medium", typeClasses.small, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{t("noChatsFound")}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className={cn(isHistoryOpen ? "space-y-2 px-3.5 pt-4" : "space-y-3 px-4 pt-5")} data-testid="chat-sidebar-nav">
        {isHistoryOpen ? (
          <>
            {renderSidebarSection("CHAT", chatItems)}
            {renderSidebarSection("CHAT MODES", chatModeItems)}
            {renderSidebarSection("BLUEMIND", bluemindItems)}
          </>
        ) : (
          collapsedPrimaryItems.map(renderCollapsedRailItem)
        )}
      </nav>

      <AnimatePresence>
        {searchOpen && !isHistoryOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setSearchOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "absolute z-30 rounded-3xl border p-3 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur-[20px]",
                isHistoryOpen ? "left-[18px] right-[18px] top-[142px]" : "left-full top-[154px] ml-3 w-[min(20rem,calc(100vw-6rem))]",
                isDark ? "border-white/10 bg-[#232323]/95 text-white" : "border-white/70 bg-white/95 text-[var(--bm-text-primary)]",
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={cn("flex items-center rounded-2xl border px-3 py-2.5", iconClasses.iconText, isDark ? "border-white/10 bg-white/[0.06]" : "border-[var(--bm-active-bg)] bg-[var(--bm-bg-elevated)]")}>
                <Search className={cn("flex-shrink-0 opacity-75", iconClasses.button)} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                  placeholder={t("searchChats")}
                  className={cn("min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:opacity-70", typeClasses.small)}
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                  aria-label={t("closeSearch")}
                >
                  <X className={iconClasses.button} />
                </button>
              </div>

              <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                <p className={cn("px-1 pb-2 font-semibold uppercase tracking-[0.12em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{searchPanelTitle}</p>
                {isSearching && (
                  <div className={cn("rounded-2xl px-3 py-4 font-medium", typeClasses.small, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{t("searching")}</div>
                )}
                {!isSearching && normalizedSearchQuery && combinedSearchResults.length === 0 && (
                  <div className={cn("rounded-2xl px-3 py-4 font-medium", typeClasses.small, isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>{t("noChatsFound")}</div>
                )}
                {combinedSearchResults.map((item) => (
                  <button
                    key={item.conversationId}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      onOpenConversation(item.conversationId);
                    }}
                    className={cn("flex w-full flex-col rounded-2xl px-3 py-2.5 text-left transition-colors", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[var(--bm-hover-bg)]")}
                  >
                    <span className={cn("block max-w-full truncate font-semibold", typeClasses.small)}>
                      <HighlightedMatch text={item.title || "New conversation"} query={searchQuery} />
                    </span>
                    <span className={cn("mt-1 block max-w-full truncate font-medium leading-4", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                      {formatHistoryDate(item.lastMessageAt || item.updatedAt, prefs.language)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
        {isHistoryOpen && (
          <div className="px-3.5 pb-2 pt-5">
            <div className={cn("flex items-center justify-between px-1 font-semibold uppercase tracking-[0.12em]", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
              <span className="truncate">{t("history")}</span>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {isHistoryOpen && (
            <motion.div
              key="history-list"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="min-h-0 flex-1 overflow-hidden"
            >
              <div className="h-full max-h-full space-y-2 overflow-y-auto overscroll-contain px-3 pb-4">
                {history.map((item) => (
                  <HistoryItem
                    key={item.conversationId}
                    item={item}
                    isActive={activeConversationId === item.conversationId}
                    isDark={isDark}
                    isSidebarOpen={isHistoryOpen}
                    language={prefs.language}
                    menuOpenId={menuOpenId}
                    onMenuToggle={setMenuOpenId}
                    onOpen={(id) => {
                      onOpenConversation(id);
                    }}
                    onRename={(conversation, title) => {
                      setMenuOpenId(null);
                      onRenameConversation(conversation, title);
                    }}
                    onShare={onShareConversation}
                    onDelete={(conversation) => {
                      setMenuOpenId(null);
                      onDeleteConversation(conversation);
                    }}
                    t={t}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn("border-t pt-4", isHistoryOpen ? "px-3.5 pb-4" : "px-4 pb-4", isDark ? "border-white/[0.08]" : "border-[var(--bm-border)]")}>
        <button
          type="button"
          onClick={() => {
            settingsItem.action?.();
          }}
          className={cn(
            "group relative flex w-full items-center rounded-2xl transition-all duration-200 cursor-pointer",
            iconClasses.iconText,
            isHistoryOpen ? "px-3.5 py-3" : "h-12 justify-center px-0 py-0",
            isDark
              ? "text-[#E4E4E7] hover:bg-white/[0.08] hover:text-white"
              : "text-[var(--bm-text-primary)] hover:bg-black/[0.05] hover:text-[var(--bm-text-primary)]",
          )}
          data-testid="nav-settings"
          title={!isHistoryOpen ? settingsItem.label : undefined}
        >
          <settingsItem.icon className={cn("flex-shrink-0 stroke-[2.35]", iconClasses.sidebar)} />
          {isHistoryOpen && <span className={cn("min-w-0 truncate font-medium", typeClasses.body)}>{settingsItem.label}</span>}
          {!isHistoryOpen && (
            <span className={cn("pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg px-2 py-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100", typeClasses.small, isDark ? "bg-[var(--bm-bg-elevated)] text-white" : "bg-white text-[var(--bm-text-primary)]")}>
              {settingsItem.label}
            </span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

function MessageActionBar({
  message,
  isDark,
  feedback,
  onCopy,
  onLike,
  onDislike,
  onEdit,
  onRegenerate,
  onShare,
  onMore,
  t,
}) {
  const actions = [
    { id: "copy", icon: feedback?.copied ? Check : Clipboard, label: t("copy"), onClick: onCopy },
    { id: "like", icon: ThumbsUp, label: t("like"), onClick: onLike, active: feedback?.rating === "like" },
    { id: "dislike", icon: ThumbsDown, label: t("dislike"), onClick: onDislike, active: feedback?.rating === "dislike" },
    { id: "edit", icon: Edit3, label: t("edit"), onClick: onEdit },
    { id: "regenerate", icon: RotateCcw, label: t("regenerate"), onClick: onRegenerate },
    { id: "share", icon: Share2, label: t("share"), onClick: onShare },
    { id: "more", icon: MoreVertical, label: t("more"), onClick: onMore },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mt-2 flex flex-wrap items-center gap-1 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100",
        isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]",
      )}
      data-testid={`message-actions-${message.id}`}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => action.onClick?.(message)}
          className={cn(
            "flex h-8 min-w-8 items-center justify-center rounded-full px-2 transition-all duration-200 hover:scale-[1.03]",
            action.active
              ? isDark ? "bg-white/10 text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]"
              : isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-[var(--bm-hover-bg)] hover:text-[var(--bm-text-primary)]",
          )}
          title={action.label}
          aria-label={action.label}
        >
          <action.icon className="h-4 w-4" />
        </button>
      ))}
    </motion.div>
  );
}

function DislikeFeedbackPopover({ messageId, isDark, onSelect, onClose, t }) {
  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className={cn(
          "absolute left-1/2 top-1/2 w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-3 shadow-2xl backdrop-blur-xl",
          isDark ? "border-white/10 bg-[var(--bm-bg-card)]/95 text-white" : "border-[var(--bm-border)] bg-white/95 text-[var(--bm-text-primary)]",
        )}
        onClick={(event) => event.stopPropagation()}
        data-testid={`dislike-feedback-${messageId}`}
      >
        <div className="px-2 pb-2 pt-1">
          <p className="text-sm font-semibold">{t("tellUsMore")}</p>
          <p className={cn("mt-1 text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{t("feedbackHelps")}</p>
        </div>
        <div className="space-y-1">
          {DISLIKE_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onSelect(reason)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-[var(--bm-hover-bg)]",
              )}
            >
              {t(reason)}
              <span className={cn("h-1.5 w-1.5 rounded-full", isDark ? "bg-white/30" : "bg-[var(--bm-border-strong)]")} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ChatImage({ attachment, isDark, onExpand }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = resolveAttachmentPreviewUrl(attachment);

  if (!src || failed) return null;

  return (
    <button
      type="button"
      onClick={() => onExpand?.({ src, name: attachment.name || attachment.prompt || "image" })}
      className={cn(
        "group relative block overflow-hidden rounded-3xl text-left shadow-sm transition-transform hover:scale-[1.01]",
        isDark ? "border border-white/10 bg-white/5" : "border border-[var(--bm-border)] bg-white",
      )}
    >
      {!loaded && (
        <div className={cn("absolute inset-0 animate-pulse", isDark ? "bg-white/10" : "bg-[var(--bm-hover-bg)]")} />
      )}
      <img
        src={src}
        alt={attachment.name || "attachment"}
        className="max-h-[360px] w-full max-w-sm object-cover"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true);
          setFailed(true);
        }}
      />
    </button>
  );
}

const ChatMessage = memo(function ChatMessage({
  message,
  isLatestAi,
  feedback,
  onCreateSuggestion,
  onCopy,
  onLike,
  onDislike,
  onEdit,
  onRegenerate,
  onShare,
  onMore,
  onExpandImage,
  previousUserContent,
}) {
  const isUser = message.role === "user";
  const { prefs, t, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor;
  const directionStyle = getDirectionalStyle(message.content);
  const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;
  const hasText = Boolean(String(message.content || "").trim());
  const isImageOnlyUser = isUser && hasAttachments && !hasText;

  if (!isUser && message.isStreaming && !message.content) {
    return <ThinkingIndicator responseMode={message.metadata?.aiMode || message.metadata?.responseMode || message.metadata?.mode || message.responseMode} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group flex w-full mb-9", isUser ? "justify-end" : "justify-start")}
      data-testid={`chat-message-${message.role}`}
    >
      <div className={cn("min-w-0", isUser ? "flex max-w-[min(720px,84vw)] flex-col items-end" : "w-full max-w-[min(820px,88vw)]")}>
        <div
          className={cn(
            "text-[16px] leading-[1.85] transition-colors",
            isImageOnlyUser
              ? "p-0"
              : isUser
              ? "rounded-[24px] rounded-br-lg px-5 py-3.5 text-white shadow-sm"
              : isDark
                ? "text-white"
                : "text-[var(--bm-text-primary)]",
          )}
          style={isUser && !isImageOnlyUser ? { backgroundColor: prefs.chatColor || "var(--bm-primary)", ...directionStyle } : directionStyle}
        >
          {hasAttachments && (
            <div className={cn("grid max-w-sm grid-cols-1 gap-3", hasText ? "mb-4" : "mb-0")}>
              {message.attachments.map((attachment) => (
                <ChatImage
                  key={attachment.id || attachment.previewUrl}
                  attachment={attachment}
                  isDark={isDark}
                  onExpand={onExpandImage}
                />
              ))}
            </div>
          )}

          {hasText && <MessageResponse message={message} previousUserContent={previousUserContent} />}

          {!isUser && isLatestAi && message.isStreaming && (
            <span
              className="ml-0.5 inline-block h-5 w-0.5 animate-pulse align-[-0.15em]"
              style={{ backgroundColor: appColor }}
            />
          )}

          {message.suggestion && (
            <button
              onClick={() => onCreateSuggestion(message.suggestion)}
              className="mt-3 rounded-full bg-[var(--bm-info)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--bm-primary)] transition-colors"
            >
              {t("createReminderCta")}
            </button>
          )}
        </div>

        {!isUser && !message.isStreaming && (
          <MessageActionBar
            message={message}
            isDark={isDark}
            feedback={feedback}
            onCopy={onCopy}
            onLike={onLike}
            onDislike={onDislike}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
            onShare={onShare}
            onMore={onMore}
            t={t}
          />
        )}
      </div>
    </motion.div>
  );
});

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [responseModeMenuOpen, setResponseModeMenuOpen] = useState(false);
  const [responseMode, setResponseMode] = useState(() => normalizeAiModeId(localStorage.getItem(RESPONSE_MODE_STORAGE_KEY)));
  const [desktopModelId, setDesktopModelId] = useState(() => localStorage.getItem(DESKTOP_MODEL_STORAGE_KEY) || "lite");
  const [thinkingLevel, setThinkingLevel] = useState(() => localStorage.getItem(THINKING_LEVEL_STORAGE_KEY) || "balanced");
  const [isListening, setIsListening] = useState(false);
  const [activeMode, setActiveMode] = useState("default");
  const [chatSessionMode, setChatSessionMode] = useState("normal");
  const [privateSpaceModalOpen, setPrivateSpaceModalOpen] = useState(false);
  const [privateSpaceStep, setPrivateSpaceStep] = useState("list");
  const [privateSpaces, setPrivateSpaces] = useState([]);
  const [isLoadingPrivateSpaces, setIsLoadingPrivateSpaces] = useState(false);
  const [privateSpaceError, setPrivateSpaceError] = useState("");
  const [privateSpaceForm, setPrivateSpaceForm] = useState({ name: "", pin: "", confirmPin: "" });
  const [privateSpaceActionMenuId, setPrivateSpaceActionMenuId] = useState(null);
  const [isCreatingPrivateSpace, setIsCreatingPrivateSpace] = useState(false);
  const [privateSpaceRenameName, setPrivateSpaceRenameName] = useState("");
  const [privateSpacePinForm, setPrivateSpacePinForm] = useState({ currentPin: "", newPin: "", confirmNewPin: "" });
  const [privateSpaceDeleteTarget, setPrivateSpaceDeleteTarget] = useState(null);
  const [privatePinInput, setPrivatePinInput] = useState("");
  const [selectedPrivateSpace, setSelectedPrivateSpace] = useState(null);
  const [activePrivateSpace, setActivePrivateSpace] = useState(null);
  const [privateSpaceAccessToken, setPrivateSpaceAccessToken] = useState("");
  const [hiddenChatModalOpen, setHiddenChatModalOpen] = useState(false);
  const [websiteSearchQuery, setWebsiteSearchQuery] = useState("");
  const [activeWebsiteCategory, setActiveWebsiteCategory] = useState("All");
  const [websitePage, setWebsitePage] = useState(0);
  const [liveWebsiteResults, setLiveWebsiteResults] = useState([]);
  const [isWebsiteLiveSearching, setIsWebsiteLiveSearching] = useState(false);
  const [selectedSearchCategory, setSelectedSearchCategory] = useState(null);
  const [openSearchMenuItemId, setOpenSearchMenuItemId] = useState(null);
  const [expandedSearchItemId, setExpandedSearchItemId] = useState(null);
  const [searchConfirm, setSearchConfirm] = useState(null);
  const [websiteFavorites, setWebsiteFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(WEBSITE_FAVORITES_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [recentWebsiteIds, setRecentWebsiteIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(WEBSITE_RECENTS_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [writeFiles, setWriteFiles] = useState([]);
  const [activeWriteTask, setActiveWriteTask] = useState(null);
  const [pendingWriteTemplate, setPendingWriteTemplate] = useState(null);
  const [writeAttachmentChoiceOpen, setWriteAttachmentChoiceOpen] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState({});
  const [dislikeTarget, setDislikeTarget] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [desktopSettingsOpen, setDesktopSettingsOpen] = useState(false);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const writeImageInputRef = useRef(null);
  const writeCameraInputRef = useRef(null);
  const responseModeMenuRef = useRef(null);
  const quickTemplatesRef = useRef(null);
  const websiteCategoryBarRef = useRef(null);
  const streamAbortRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const activeAiMessageRef = useRef(null);
  const sendLockRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const streamBufferRef = useRef({ messageId: null, text: "", timer: null });
  const { prefs, t, resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor;
  const inputDirectionStyle = getDirectionalStyle(input);

  const {
    scrollRef: messagesScrollRef,
    endRef: messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  } = useChatAutoScroll({
    watch: [messages, isAiTyping],
    isStreaming: isAiTyping,
  });

  useEffect(() => () => {
    if (streamBufferRef.current.timer) {
      window.clearTimeout(streamBufferRef.current.timer);
    }
    streamAbortRef.current?.abort();
    speechRecognitionRef.current?.stop?.();
  }, []);

  useEffect(() => {
    if (!responseModeMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (responseModeMenuRef.current?.contains(event.target)) return;
      setResponseModeMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [responseModeMenuOpen]);

  useEffect(() => {
    localStorage.setItem(RESPONSE_MODE_STORAGE_KEY, responseMode);
  }, [responseMode]);

  useEffect(() => {
    localStorage.setItem(THINKING_LEVEL_STORAGE_KEY, thinkingLevel);
  }, [thinkingLevel]);

  useEffect(() => {
    localStorage.setItem(DESKTOP_MODEL_STORAGE_KEY, desktopModelId);
  }, [desktopModelId]);

  useEffect(() => {
    const savedMode = normalizeAiModeId(prefs.aiMode || localStorage.getItem(RESPONSE_MODE_STORAGE_KEY));
    if (savedMode !== responseMode) {
      setResponseMode(savedMode);
    }
  }, [prefs.aiMode, responseMode]);

  useEffect(() => {
    localStorage.setItem(WEBSITE_FAVORITES_STORAGE_KEY, JSON.stringify(websiteFavorites));
  }, [websiteFavorites]);

  useEffect(() => {
    localStorage.setItem(WEBSITE_RECENTS_STORAGE_KEY, JSON.stringify(recentWebsiteIds));
  }, [recentWebsiteIds]);

  useEffect(() => {
    setWebsitePage(0);
  }, [activeWebsiteCategory, websiteSearchQuery]);

  useEffect(() => {
    const query = websiteSearchQuery.trim();

    if (activeMode !== "web_search" || query.length < 2) {
      setLiveWebsiteResults([]);
      setIsWebsiteLiveSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsWebsiteLiveSearching(true);

      try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const results = await response.json();
        const mappedResults = Array.isArray(results)
          ? results.slice(0, 8).map((result) => {
              const domain = String(result.domain || "").trim();
              const name = String(result.name || domain || query).trim();
              const url = domain ? `https://${domain}` : `https://www.google.com/search?q=${encodeURIComponent(query)}`;

              return {
                id: `live-${name}-${domain || query}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                name,
                domain: domain || url.replace(/^https?:\/\//, ""),
                url,
                category: "Live Result",
                primaryCategory: "Technology",
                country: "Global",
                countryBadge: "🌐 Global",
                description: "Live website result fetched from the internet.",
                logo: result.logo || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain || "google.com")}&sz=128`,
                tags: `${name} ${domain} live result internet website`.toLowerCase(),
              };
            })
          : [];

        setLiveWebsiteResults(mappedResults);
      } catch (error) {
        if (error.name !== "AbortError") {
          setLiveWebsiteResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsWebsiteLiveSearching(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeMode, websiteSearchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadConversationHistory() {
      try {
        const data = await listConversations();

        if (!cancelled) {
          setHistory(Array.isArray(data?.items) ? data.items : []);
        }
      } catch (error) {
        console.warn("Could not load chat history", error);
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false);
        }
      }
    }

    loadConversationHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setAttachments([]);
    setConversationId(null);
    setActiveConversationId(null);
    setIsAiTyping(false);
  };

  const loadNormalHistory = async () => {
    const data = await listConversations();
    setHistory(Array.isArray(data?.items) ? data.items : []);
  };

  const handleSelectNormalChat = () => {
    setChatSessionMode("normal");
    setActivePrivateSpace(null);
    setPrivateSpaceAccessToken("");
    setPrivateSpaceModalOpen(false);
    setHiddenChatModalOpen(false);
    handleNewChat();
    loadNormalHistory().catch(() => {});
  };

  const handleExitPrivateSpace = () => {
    setChatSessionMode("normal");
    setActivePrivateSpace(null);
    setPrivateSpaceAccessToken("");
    handleNewChat();
    loadNormalHistory().catch(() => {});
  };

  const handleStartHiddenChat = () => {
    setChatSessionMode("hidden");
    setActivePrivateSpace(null);
    setPrivateSpaceAccessToken("");
    setHiddenChatModalOpen(false);
    setHistory([]);
    handleNewChat();
  };

  const handleExitHiddenMode = () => {
    setChatSessionMode("normal");
    handleNewChat();
    loadNormalHistory().catch(() => {});
  };

  const mapConversationMessages = (conversation) => (
    (conversation?.messages || []).map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "ai" : message.role,
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt,
      attachments: (message.metadata?.attachments || []).map((attachment) => ({
        ...attachment,
        previewUrl: resolveAttachmentPreviewUrl(attachment),
      })),
    })).flatMap(splitUserImageTextMessage)
  );

  const refreshHistory = useCallback(async () => {
    if (chatSessionMode === "hidden") {
      setHistory([]);
      return;
    }

    const data = chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken
      ? await listPrivateSpaceChats(activePrivateSpace.privateSpaceId, privateSpaceAccessToken)
      : await listConversations();
    setHistory(Array.isArray(data?.items) ? data.items : []);
  }, [activePrivateSpace?.privateSpaceId, chatSessionMode, privateSpaceAccessToken]);

  const loadPrivateSpaces = useCallback(async () => {
    setIsLoadingPrivateSpaces(true);
    setPrivateSpaceError("");
    try {
      const data = await listPrivateSpaces();
      const items = Array.isArray(data?.items) ? data.items : [];
      setPrivateSpaces(items);
      return items;
    } catch (error) {
      setPrivateSpaceError(error.message || "Could not load private chats");
      return [];
    } finally {
      setIsLoadingPrivateSpaces(false);
    }
  }, []);

  const openPrivateSpaceModal = useCallback(() => {
    setPrivateSpaceModalOpen(true);
    setPrivateSpaceStep("list");
    setPrivateSpaceError("");
    setPrivatePinInput("");
    setSelectedPrivateSpace(null);
    setPrivateSpaceActionMenuId(null);
    setPrivateSpaceDeleteTarget(null);
    loadPrivateSpaces()
      .then((items) => {
        setPrivateSpaceStep(items.length ? "list" : "create");
      })
      .catch(() => {});
  }, [loadPrivateSpaces]);

  const handleCreatePrivateSpace = async (event) => {
    event.preventDefault();
    setPrivateSpaceError("");
    setIsCreatingPrivateSpace(true);

    try {
      await createPrivateSpace(privateSpaceForm);
      setPrivateSpaceForm({ name: "", pin: "", confirmPin: "" });
      setPrivateSpaceStep("list");
      await loadPrivateSpaces();
      toast.success("Private space created");
    } catch (error) {
      setPrivateSpaceError(error.message || "Could not create private chat");
    } finally {
      setIsCreatingPrivateSpace(false);
    }
  };

  const handleStartCreatePrivateSpace = () => {
    if (privateSpaces.length >= 5) {
      setPrivateSpaceError("Maximum private chats reached. Delete one before creating another.");
      return;
    }

    setPrivateSpaceError("");
    setPrivateSpaceStep("create");
  };

  const handleUnlockPrivateSpace = async (event) => {
    event.preventDefault();
    if (!selectedPrivateSpace?.privateSpaceId) return;

    setPrivateSpaceError("");
    try {
      const data = await unlockPrivateSpace(selectedPrivateSpace.privateSpaceId, privatePinInput);
      const unlockedSpace = data?.privateSpace || selectedPrivateSpace;
      setActivePrivateSpace(unlockedSpace);
      setPrivateSpaceAccessToken(data?.accessToken || "");
      setChatSessionMode("private");
      setPrivateSpaceModalOpen(false);
      setPrivatePinInput("");
      setSelectedPrivateSpace(null);
      setMessages([]);
      setAttachments([]);
      setConversationId(null);
      setActiveConversationId(null);
      const chats = await listPrivateSpaceChats(unlockedSpace.privateSpaceId, data?.accessToken || "");
      setHistory(Array.isArray(chats?.items) ? chats.items : []);
      toast.success(`${unlockedSpace.name} private chat unlocked`);
    } catch (error) {
      setPrivateSpaceError(error.message || "Incorrect PIN. Try again.");
    }
  };

  const handleRenamePrivateSpace = async (event) => {
    event.preventDefault();
    if (!selectedPrivateSpace?.privateSpaceId || !privateSpaceRenameName.trim()) return;

    setPrivateSpaceError("");
    try {
      const data = await renamePrivateSpace(selectedPrivateSpace.privateSpaceId, privateSpaceRenameName.trim());
      const updated = data?.privateSpace;
      if (updated) {
        setPrivateSpaces((items) => items.map((item) => item.privateSpaceId === updated.privateSpaceId ? updated : item));
        if (activePrivateSpace?.privateSpaceId === updated.privateSpaceId) setActivePrivateSpace(updated);
      }
      setSelectedPrivateSpace(null);
      setPrivateSpaceRenameName("");
      setPrivateSpaceStep("list");
    } catch (error) {
      setPrivateSpaceError(error.message || "Could not rename private chat");
    }
  };

  const handleChangePrivateSpacePin = async (event) => {
    event.preventDefault();
    if (!selectedPrivateSpace?.privateSpaceId) return;

    setPrivateSpaceError("");
    try {
      await changePrivateSpacePin(selectedPrivateSpace.privateSpaceId, privateSpacePinForm);
      setPrivateSpacePinForm({ currentPin: "", newPin: "", confirmNewPin: "" });
      setSelectedPrivateSpace(null);
      setPrivateSpaceStep("list");
      toast.success("PIN changed");
    } catch (error) {
      setPrivateSpaceError(error.message || "Could not change PIN");
    }
  };

  const handleDeletePrivateSpace = async () => {
    if (!privateSpaceDeleteTarget?.privateSpaceId) return;

    setPrivateSpaceError("");
    try {
      await deletePrivateSpace(privateSpaceDeleteTarget.privateSpaceId);
      setPrivateSpaces((items) => items.filter((item) => item.privateSpaceId !== privateSpaceDeleteTarget.privateSpaceId));
      if (activePrivateSpace?.privateSpaceId === privateSpaceDeleteTarget.privateSpaceId) {
        handleExitPrivateSpace();
      }
      setPrivateSpaceDeleteTarget(null);
      setSelectedPrivateSpace(null);
      setPrivateSpaceStep("list");
    } catch (error) {
      setPrivateSpaceError(error.message || "Could not delete private chat");
    }
  };

  const renderChatModeModals = () => (
    <AnimatePresence>
      {privateSpaceModalOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPrivateSpaceModalOpen(false)}
        >
          <motion.div
            className={cn(
              "w-full max-w-md rounded-3xl border p-5 shadow-2xl",
              isDark ? "border-white/10 bg-[var(--bm-bg-card)] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]",
            )}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Private Chat</h2>
                <p className={cn("text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Unlock a private chat inside your account.</p>
              </div>
              <button type="button" className={cn("flex h-9 w-9 items-center justify-center rounded-full", isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10")} onClick={() => setPrivateSpaceModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {privateSpaceError && <div className="mb-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{privateSpaceError}</div>}

            {privateSpaceStep === "list" && (
              <div className="space-y-3">
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {isLoadingPrivateSpaces && <p className={cn("text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Loading private chats...</p>}
                  {!isLoadingPrivateSpaces && privateSpaces.length === 0 && (
                    <p className={cn("rounded-2xl border px-3 py-4 text-sm", isDark ? "border-white/10 text-[var(--bm-text-muted)]" : "border-black/10 text-[var(--bm-text-secondary)]")}>No private chats yet.</p>
                  )}
                  {privateSpaces.map((space) => (
                    <div key={space.privateSpaceId} className="relative">
                      <button
                        type="button"
                        className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 pr-12 text-left transition", isDark ? "border-white/10 hover:bg-white/10" : "border-black/10 hover:bg-black/5")}
                        onClick={() => {
                          setSelectedPrivateSpace(space);
                          setPrivatePinInput("");
                          setPrivateSpaceError("");
                          setPrivateSpaceActionMenuId(null);
                          setPrivateSpaceStep("pin");
                        }}
                      >
                        <Lock className="h-5 w-5" />
                        <span className="font-medium">{space.name}</span>
                      </button>
                      <button
                        type="button"
                        className={cn("absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                        onClick={(event) => {
                          event.stopPropagation();
                          setPrivateSpaceActionMenuId((current) => current === space.privateSpaceId ? null : space.privateSpaceId);
                        }}
                        aria-label="Private chat actions"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {privateSpaceActionMenuId === space.privateSpaceId && (
                        <div className={cn("absolute right-2 top-12 z-10 w-36 rounded-2xl border p-1 shadow-xl", isDark ? "border-white/10 bg-[var(--bm-bg-elevated)]" : "border-black/10 bg-white")}>
                          {[
                            ["Rename", () => { setSelectedPrivateSpace(space); setPrivateSpaceRenameName(space.name); setPrivateSpaceStep("rename"); }],
                            ["Change PIN", () => { setSelectedPrivateSpace(space); setPrivateSpacePinForm({ currentPin: "", newPin: "", confirmNewPin: "" }); setPrivateSpaceStep("changePin"); }],
                            ["Delete", () => { setPrivateSpaceDeleteTarget(space); setPrivateSpaceStep("delete"); }],
                          ].map(([label, action]) => (
                            <button key={label} type="button" className={cn("w-full rounded-xl px-3 py-2 text-left text-sm font-medium", label === "Delete" ? "text-red-500" : "")} onClick={() => { setPrivateSpaceActionMenuId(null); action(); }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--bm-primary-hover)]" onClick={handleStartCreatePrivateSpace}>
                  Create Private Chat
                </button>
              </div>
            )}

            {privateSpaceStep === "create" && (
              <form className="space-y-3" onSubmit={handleCreatePrivateSpace}>
                <button type="button" className={cn("text-sm font-medium", isDark ? "text-[var(--bm-primary)]" : "text-[var(--bm-primary)]")} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="Chat Name" value={privateSpaceForm.name} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, name: event.target.value }))} />
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="PIN" inputMode="numeric" type="password" value={privateSpaceForm.pin} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, pin: event.target.value.replace(/\D/g, "") }))} />
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="Confirm PIN" inputMode="numeric" type="password" value={privateSpaceForm.confirmPin} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, confirmPin: event.target.value.replace(/\D/g, "") }))} />
                <button type="submit" disabled={isCreatingPrivateSpace} className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--bm-primary-hover)] disabled:opacity-70">{isCreatingPrivateSpace ? "Creating..." : "Create"}</button>
              </form>
            )}

            {privateSpaceStep === "rename" && selectedPrivateSpace && (
              <form className="space-y-3" onSubmit={handleRenamePrivateSpace}>
                <button type="button" className={cn("text-sm font-medium", isDark ? "text-[var(--bm-primary)]" : "text-[var(--bm-primary)]")} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="Chat Name" value={privateSpaceRenameName} onChange={(event) => setPrivateSpaceRenameName(event.target.value)} />
                <button type="submit" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--bm-primary-hover)]">Save</button>
              </form>
            )}

            {privateSpaceStep === "changePin" && selectedPrivateSpace && (
              <form className="space-y-3" onSubmit={handleChangePrivateSpacePin}>
                <button type="button" className={cn("text-sm font-medium", isDark ? "text-[var(--bm-primary)]" : "text-[var(--bm-primary)]")} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="Current PIN" inputMode="numeric" type="password" value={privateSpacePinForm.currentPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, currentPin: event.target.value.replace(/\D/g, "") }))} />
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="New PIN" inputMode="numeric" type="password" value={privateSpacePinForm.newPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, newPin: event.target.value.replace(/\D/g, "") }))} />
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="Confirm New PIN" inputMode="numeric" type="password" value={privateSpacePinForm.confirmNewPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, confirmNewPin: event.target.value.replace(/\D/g, "") }))} />
                <button type="submit" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--bm-primary-hover)]">Change PIN</button>
              </form>
            )}

            {privateSpaceStep === "delete" && privateSpaceDeleteTarget && (
              <div className="space-y-4">
                <button type="button" className={cn("text-sm font-medium", isDark ? "text-[var(--bm-primary)]" : "text-[var(--bm-primary)]")} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                <p className="text-base font-semibold">Delete this private chat?</p>
                <p className={cn("text-sm", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>All conversations inside it will be permanently deleted.</p>
                <button type="button" className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700" onClick={handleDeletePrivateSpace}>Delete</button>
              </div>
            )}

            {privateSpaceStep === "pin" && selectedPrivateSpace && (
              <form className="space-y-3" onSubmit={handleUnlockPrivateSpace}>
                <button type="button" className={cn("text-sm font-medium", isDark ? "text-[var(--bm-primary)]" : "text-[var(--bm-primary)]")} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                <h3 className="text-base font-semibold">Enter PIN for {selectedPrivateSpace.name}</h3>
                <input className={cn(inputClasses.field, "font-semibold")} placeholder="PIN" inputMode="numeric" type="password" value={privatePinInput} onChange={(event) => setPrivatePinInput(event.target.value.replace(/\D/g, ""))} />
                <button type="submit" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--bm-primary-hover)]">Unlock</button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}

      {hiddenChatModalOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setHiddenChatModalOpen(false)}
        >
          <motion.div
            className={cn("w-full max-w-sm rounded-3xl border p-5 shadow-2xl", isDark ? "border-white/10 bg-[var(--bm-bg-card)] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]")}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hidden Chat</h2>
              <button type="button" className={cn("flex h-9 w-9 items-center justify-center rounded-full", isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10")} onClick={() => setHiddenChatModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className={cn("mb-5 whitespace-pre-line text-sm leading-6", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>
              This chat is temporary.
              Messages are not saved.
              It does not appear in History.
              It does not appear in Search.
              Everything will be deleted when you leave.
            </p>
            <button type="button" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--bm-primary-hover)]" onClick={handleStartHiddenChat}>
              Start Hidden Chat
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const handleOpenConversation = async (id) => {
    if (!id || isAiTyping) return;

    setIsHistoryLoading(true);
    try {
      const data = chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken
        ? await getPrivateSpaceChat(activePrivateSpace.privateSpaceId, id, privateSpaceAccessToken)
        : await getConversation(id);
      const conversation = data?.conversation;

      setConversationId(conversation.conversationId);
      setActiveConversationId(conversation.conversationId);
      setAttachments([]);
      setMessages(mapConversationMessages(conversation));
    } catch (error) {
      toast.error(error.message || t("couldNotOpenChat"));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleRenameConversation = async (conversation, inlineTitle) => {
    if (inlineTitle) {
      const previousHistory = history;
      setHistory((prev) => prev.map((item) => (
        item.conversationId === conversation.conversationId
          ? { ...item, title: inlineTitle }
          : item
      )));

      try {
        if (chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken) {
          await renamePrivateSpaceChat(activePrivateSpace.privateSpaceId, conversation.conversationId, inlineTitle, privateSpaceAccessToken);
        } else {
          await renameChat(conversation.conversationId, inlineTitle);
        }
        refreshHistory().catch(() => {});
      } catch (error) {
        setHistory(previousHistory);
        toast.error(error.message || t("saveFailed"));
      }
      return;
    }

    setRenameTarget(conversation);
    setRenameTitle(conversation.title || "");
  };

  const handleRenameSubmit = async (event) => {
    event.preventDefault();
    if (!renameTarget || !renameTitle.trim()) return;

    const previousHistory = history;
    const nextTitle = renameTitle.trim();

    setHistory((prev) => prev.map((item) => (
      item.conversationId === renameTarget.conversationId
        ? { ...item, title: nextTitle }
        : item
    )));

    try {
      if (chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken) {
        await renamePrivateSpaceChat(activePrivateSpace.privateSpaceId, renameTarget.conversationId, nextTitle, privateSpaceAccessToken);
      } else {
        await renameChat(renameTarget.conversationId, nextTitle);
      }
      setRenameTarget(null);
      setRenameTitle("");
      refreshHistory().catch(() => {});
    } catch (error) {
      setHistory(previousHistory);
      toast.error(error.message || t("saveFailed"));
    }
  };

  const handleDeleteConversation = async (conversation) => {
    const previousHistory = history;
    setHistory((prev) => prev.filter((item) => item.conversationId !== conversation.conversationId));

    if (conversationId === conversation.conversationId) {
      handleNewChat();
    }

    try {
      if (chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken) {
        await deletePrivateSpaceChat(activePrivateSpace.privateSpaceId, conversation.conversationId, privateSpaceAccessToken);
      } else {
        await deleteChat(conversation.conversationId);
      }
    } catch (error) {
      setHistory(previousHistory);
      toast.error(error.message || t("saveFailed"));
    }
  };

  const handleShareConversation = async (conversation) => {
    try {
      const result = await shareChat(conversation, { appName: APP_NAME });
      if (result.method === "clipboard") {
        toast.success("Link copied");
      }
    } catch {
      toast.info("Copy link unavailable");
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const removeWriteFile = (id) => {
    setWriteFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleImageFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const isCameraCapture = event.target === cameraInputRef.current;
    event.target.value = "";
    if (!selectedFiles.length) return;

    for (const file of selectedFiles.slice(0, 10)) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        toast.error(t("invalidImageType"));
        continue;
      }

      if (file.size > 8 * 1024 * 1024) {
        toast.error(t("invalidImageSize"));
        continue;
      }

      setIsUploading(true);
      try {
        const image = await uploadChatImage(file, conversationId);
        const nextAttachment = {
          id: image.id,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
        };
        setAttachments((prev) => (
          isCameraCapture
            ? [nextAttachment, ...prev]
            : [...prev, nextAttachment]
        ).slice(0, 10));
      } catch (error) {
        toast.error(error.message || t("imageUploadFailed"));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleUnsupportedFileSelect = (event) => {
    event.target.value = "";
    toast.info(t("fileUploadComingSoon"));
  };

  const activateWriteTask = useCallback((template, files = []) => {
    if (!template) return;

    setActiveMode("write_edit");
    setActiveWriteTask(createWriteEditTask(template));
    setWriteFiles(files);
    setInput(template.prompt);
    setWriteAttachmentChoiceOpen(false);
    setPendingWriteTemplate(null);
  }, []);

  const beginWriteTemplateFlow = useCallback((template) => {
    if (!template) return;
    setActiveMode("write_edit");
    setPendingWriteTemplate(template);
    setWriteAttachmentChoiceOpen(true);
  }, []);

  const clearWriteTask = useCallback(() => {
    writeFiles.forEach((file) => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    });
    setActiveWriteTask(null);
    setPendingWriteTemplate(null);
    setWriteAttachmentChoiceOpen(false);
    setWriteFiles([]);
    setInput("");
    setActiveMode("default");
  }, [writeFiles]);

  const continueWriteTaskWithoutAttachment = useCallback(() => {
    if (!pendingWriteTemplate) return;
    activateWriteTask(pendingWriteTemplate, []);
  }, [activateWriteTask, pendingWriteTemplate]);

  const openWriteAttachmentInput = useCallback((optionId) => {
    if (optionId === "upload_image") {
      writeImageInputRef.current?.click();
      return;
    }

    if (optionId === "take_photo") {
      writeCameraInputRef.current?.click();
      return;
    }

    fileInputRef.current?.click();
  }, []);

  const handleWriteFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const accepted = [];

    for (const file of selectedFiles) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
      const isText = file.type === "text/plain" || ["txt", "md", "csv", "rtf"].includes(extension);
      const isPdf = file.type === "application/pdf" || extension === "pdf";
      const isDocx = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension);
      const looksLikeCv = /cv|resume|curriculum/i.test(file.name);

      if (!isImage && !isText && !isPdf && !isDocx) {
        toast.error(`${file.name} is not supported here.`);
        continue;
      }

      let content = "";
      let imageId = null;
      let previewUrl = "";

      if (isText) {
        content = await file.text().catch(() => "");
      }

      if (isImage) {
        try {
          setIsUploading(true);
          const image = await uploadChatImage(file, conversationId);
          imageId = image.id;
          previewUrl = URL.createObjectURL(file);
          setAttachments((prev) => [
            ...prev,
            {
              id: image.id,
              name: file.name,
              previewUrl,
            },
          ]);
        } catch (error) {
          toast.error(error.message || t("imageUploadFailed"));
          continue;
        } finally {
          setIsUploading(false);
        }
      }

      accepted.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: isImage ? "image" : isText ? "text" : isPdf ? "pdf" : "document",
        size: file.size,
        content,
        imageId,
        previewUrl,
        isCv: looksLikeCv,
      });
    }

    if (!accepted.length) return;

    if (pendingWriteTemplate) {
      activateWriteTask(pendingWriteTemplate, accepted.slice(0, 8));
      return;
    }

    setWriteFiles((prev) => [...accepted, ...prev].slice(0, 8));
    setActiveMode("write_edit");
  };

  const handleCreateSuggestion = async (suggestion) => {
    try {
      await createSuggestedReminder(suggestion, conversationId);
      toast.success(t("createReminderSuccess"));
    } catch (error) {
      toast.error(error.message || t("createReminderError"));
    }
  };

  const appendAiDelta = useCallback((messageId, token) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, content: `${message.content}${token || ""}` }
          : message,
      ),
    );
  }, []);

  const flushAiDelta = useCallback((messageId = activeAiMessageRef.current) => {
    const buffered = streamBufferRef.current;
    if (buffered.timer) {
      window.clearTimeout(buffered.timer);
    }

    if (buffered.text && (buffered.messageId || messageId)) {
      appendAiDelta(buffered.messageId || messageId, buffered.text);
    }

    streamBufferRef.current = { messageId: null, text: "", timer: null };
  }, [appendAiDelta]);

  const queueAiDelta = useCallback((messageId, token) => {
    if (!token) return;

    const buffered = streamBufferRef.current;
    buffered.messageId = messageId;
    buffered.text += token;

    if (buffered.timer) return;

    buffered.timer = window.setTimeout(() => {
      flushAiDelta(messageId);
    }, 90);
  }, [flushAiDelta]);

  const handleStopStreaming = useCallback(() => {
    if (!isAiTyping) return;

    stopRequestedRef.current = true;
    streamAbortRef.current?.abort();
    flushAiDelta();

    const aiMessageId = activeAiMessageRef.current;
    if (aiMessageId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === aiMessageId
            ? { ...message, isStreaming: false }
            : message,
        ),
      );
    }

    setIsAiTyping(false);
    sendLockRef.current = false;
    streamAbortRef.current = null;
    activeAiMessageRef.current = null;
  }, [flushAiDelta, isAiTyping]);

  const stopVoiceInput = useCallback(() => {
    speechRecognitionRef.current?.stop?.();
    speechRecognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      stopVoiceInput();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = prefs.language || navigator.language || "en-US";

    let committedTranscript = "";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      speechRecognitionRef.current = null;
      setIsListening(false);
      toast.error("Could not capture voice input.");
    };
    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";

        if (event.results[index].isFinal) {
          committedTranscript = `${committedTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const nextText = [input, committedTranscript, interimTranscript]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trimStart();

      setInput(nextText);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  }, [input, isListening, prefs.language, stopVoiceInput]);

  const handleSend = useCallback(async (options = {}) => {
    const mode = options.mode || activeMode;
    const selectedResponseMode = normalizeAiModeId(options.responseMode || responseMode);
    const sourceMessage = options.message;
    const sourceAttachments = options.attachments;
    const visibleInput = String(sourceMessage ?? input).trim();
    const currentInput = mode === "write_edit"
      ? buildWriteEditMessage(visibleInput, writeFiles)
      : visibleInput;
    const currentAttachments = sourceAttachments ?? attachments;
    const requestMetadata = options.metadata || {};
    const isSearchHandoff = String(requestMetadata?.source || requestMetadata?.searchContext?.source || "").toLowerCase() === "search";
    const canStartFromContext = isSearchHandoff && requestMetadata?.intent && (requestMetadata?.category || requestMetadata?.searchContext?.category);

    if ((!currentInput && currentAttachments.length === 0 && !canStartFromContext) || isAiTyping || sendLockRef.current) return;
    sendLockRef.current = true;
    if (isListening) stopVoiceInput();

    const imageIds = currentAttachments.map((item) => item.id);
    const userMetadata = {
      chatMode: mode,
      mode: selectedResponseMode,
      responseMode: selectedResponseMode,
      aiMode: selectedResponseMode,
      blueMindModel: desktopModelId,
      thinkingLevel,
      writeEditTask: mode === "write_edit" ? activeWriteTask : undefined,
    };
    const userDisplayMessages = options.hideUserMessage
      ? []
      : [
          ...(currentAttachments.length ? [{
            id: crypto.randomUUID(),
            role: "user",
            content: "",
            attachments: currentAttachments,
            metadata: { ...userMetadata, splitKind: "images" },
          }] : []),
          ...(visibleInput ? [{
            id: crypto.randomUUID(),
            role: "user",
            content: visibleInput,
            attachments: [],
            metadata: { ...userMetadata, splitKind: "text" },
          }] : []),
        ];
    const aiMessageId = crypto.randomUUID();
    const abortController = new AbortController();

    setMessages((prev) => [
      ...prev,
      ...userDisplayMessages,
      {
        id: aiMessageId,
        role: "ai",
        content: "",
        isStreaming: true,
        metadata: {
          chatMode: mode,
          mode: selectedResponseMode,
          responseMode: selectedResponseMode,
          aiMode: selectedResponseMode,
          blueMindModel: desktopModelId,
          thinkingLevel,
          requestContent: visibleInput,
        },
      },
    ]);
    window.requestAnimationFrame(() => scrollToBottom("smooth"));
    if (!options.keepComposer) {
      setInput("");
      setAttachments([]);
      setActiveWriteTask(null);
      setPendingWriteTemplate(null);
      setWriteAttachmentChoiceOpen(false);
      setWriteFiles([]);
      setActiveMode("default");
      setSelectedSearchCategory(null);
      setOpenSearchMenuItemId(null);
      setExpandedSearchItemId(null);
      setSearchConfirm(null);
    }
    setIsAiTyping(true);
    stopRequestedRef.current = false;
    streamAbortRef.current = abortController;
    activeAiMessageRef.current = aiMessageId;

    try {
      if (mode === "create_image") {
        const generated = await generateImage(currentInput, conversationId);
        const generatedAttachments = (generated?.images || []).map((image) => ({
          id: image.id,
          kind: image.kind,
          name: image.originalName || "generated image",
          previewUrl: resolveAttachmentPreviewUrl(image),
          prompt: image.prompt,
        }));

        setMessages((prev) =>
          prev.map((message) =>
            message.id === aiMessageId
              ? {
                  ...message,
                  content: t("imageGenerated"),
                  attachments: generatedAttachments,
                  isStreaming: false,
                }
              : message,
          ),
        );
        refreshHistory().catch(() => {});
        return;
      }

      const streamMessage = chatSessionMode === "hidden"
        ? streamHiddenChatMessage
        : chatSessionMode === "private"
          ? streamPrivateSpaceMessage
          : streamChatMessage;
      const streamOptions = {
        message: currentInput,
        imageIds,
        conversationId: chatSessionMode === "hidden" ? undefined : conversationId,
        privateSpaceId: activePrivateSpace?.privateSpaceId,
        accessToken: privateSpaceAccessToken,
        mode: selectedResponseMode,
        metadata: {
          ...requestMetadata,
          chatMode: mode,
          chatSessionMode,
          privateSpaceId: chatSessionMode === "private" ? activePrivateSpace?.privateSpaceId : undefined,
          hiddenChat: chatSessionMode === "hidden" || undefined,
          mode: selectedResponseMode,
          responseMode: selectedResponseMode,
          aiMode: selectedResponseMode,
          blueMindModel: desktopModelId,
          thinkingLevel,
          writeEditTask: mode === "write_edit" ? activeWriteTask : undefined,
        },
        signal: abortController.signal,
        onReady: (payload) => {
          if (payload?.conversation?.conversationId) {
            setConversationId(payload.conversation.conversationId);
            setActiveConversationId(payload.conversation.conversationId);
            if (chatSessionMode === "hidden") return;
            setHistory((prev) => {
              const exists = prev.some((item) => item.conversationId === payload.conversation.conversationId);
              if (exists) return prev;
              return [{
                ...payload.conversation,
                updatedAt: new Date().toISOString(),
                lastMessageAt: new Date().toISOString(),
              }, ...prev];
            });
          }
        },
        onDelta: (payload) => {
          queueAiDelta(aiMessageId, payload?.token);
        },
        onComplete: async (payload) => {
          flushAiDelta(aiMessageId);

          if (payload?.conversation?.conversationId) {
            setConversationId(payload.conversation.conversationId);
            setActiveConversationId(payload.conversation.conversationId);
            if (chatSessionMode !== "hidden") setHistory((prev) => {
              const conversation = {
                ...payload.conversation,
                updatedAt: new Date().toISOString(),
                lastMessageAt: new Date().toISOString(),
              };
              const withoutCurrent = prev.filter((item) => item.conversationId !== conversation.conversationId);
              return [conversation, ...withoutCurrent];
            });
            if (chatSessionMode !== "hidden") refreshHistory().catch(() => {});
          }

          setMessages((prev) =>
            prev.map((message) =>
              message.id === aiMessageId
                ? {
                    ...message,
                    content: message.content || payload?.message?.content || "",
                    isStreaming: false,
                  }
                : message,
            ),
          );

          if (currentInput && chatSessionMode !== "hidden") {
            const suggestionResult = await suggestReminder(
              currentInput,
              payload?.conversation?.conversationId || conversationId,
            ).catch(() => null);
            const suggestion = suggestionResult?.suggestions?.[0];

            if (suggestionResult?.hasSuggestion && suggestion) {
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "ai",
                  content:
                    suggestion.askUserText ||
                    t("suggestionFallback"),
                  suggestion,
                },
              ]);
            }
          }
        },
      };

      await streamMessage(streamOptions);
    } catch (error) {
      flushAiDelta(aiMessageId);

      if (stopRequestedRef.current || error?.name === "AbortError") {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === aiMessageId
              ? { ...message, isStreaming: false }
              : message,
          ),
        );
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === aiMessageId
            ? {
                ...message,
                content: error.message || t("aiFailed"),
                isStreaming: false,
              }
            : message,
        ),
      );
    } finally {
      setIsAiTyping(false);
      sendLockRef.current = false;
      streamAbortRef.current = null;
      activeAiMessageRef.current = null;
      stopRequestedRef.current = false;
    }
  }, [
    activeMode,
    activePrivateSpace?.privateSpaceId,
    attachments,
    activeWriteTask,
    chatSessionMode,
    conversationId,
    desktopModelId,
    flushAiDelta,
    input,
    isAiTyping,
    isListening,
    queueAiDelta,
    refreshHistory,
    responseMode,
    scrollToBottom,
    thinkingLevel,
    privateSpaceAccessToken,
    stopVoiceInput,
    t,
    writeFiles,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const persistMessageFeedback = useCallback((messageId, feedback) => {
    setMessageFeedback((prev) => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || {}),
        ...feedback,
      },
    }));

    try {
      const stored = JSON.parse(localStorage.getItem("bluemind_chat_feedback") || "[]");
      stored.push({
        messageId,
        conversationId,
        ...feedback,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("bluemind_chat_feedback", JSON.stringify(stored.slice(-200)));
    } catch {
      // Feedback storage is best effort until the feedback API is connected.
    }
  }, [conversationId]);

  const handleCopyMessage = useCallback(async (message) => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      persistMessageFeedback(message.id, { copied: true });
      window.setTimeout(() => {
        setMessageFeedback((prev) => ({
          ...prev,
          [message.id]: {
            ...(prev[message.id] || {}),
            copied: false,
          },
        }));
      }, 1600);
    } catch {
      toast.error(t("copyFailed"));
    }
  }, [persistMessageFeedback, t]);

  const handleLikeMessage = useCallback((message) => {
    persistMessageFeedback(message.id, { rating: "like" });
    toast.success(t("feedbackSaved"));
  }, [persistMessageFeedback, t]);

  const handleDislikeMessage = useCallback((message) => {
    persistMessageFeedback(message.id, { rating: "dislike" });
    setDislikeTarget(message);
  }, [persistMessageFeedback]);

  const handleDislikeReason = useCallback((reason) => {
    if (!dislikeTarget) return;
    persistMessageFeedback(dislikeTarget.id, { rating: "dislike", reason });
    setDislikeTarget(null);
    toast.success(t("feedbackSaved"));
  }, [dislikeTarget, persistMessageFeedback, t]);

  const handleEditMessage = useCallback((message) => {
    setInput(message.content || "");
    toast.info(t("editInComposer"));
  }, [t]);

  const handleRegenerateMessage = useCallback((message) => {
    if (isAiTyping) return;

    const index = messages.findIndex((item) => item.id === message.id);
    const previousUser = [...messages.slice(0, index)].reverse().find((item) => item.role === "user");

    if (!previousUser) {
      toast.error(t("regenerateFailed"));
      return;
    }

    setMessages((prev) => prev.slice(0, Math.max(0, index)));
    void handleSend({
      message: previousUser.content,
      attachments: previousUser.attachments || [],
      mode: previousUser.metadata?.chatMode || activeMode,
      responseMode: normalizeAiModeId(previousUser.metadata?.aiMode || previousUser.metadata?.mode || previousUser.metadata?.responseMode || responseMode),
      keepComposer: true,
    });
  }, [activeMode, handleSend, isAiTyping, messages, responseMode, t]);

  const handleShareMessage = useCallback(async (message) => {
    const text = message.content || "";

    try {
      if (navigator.share) {
        await navigator.share({ title: APP_NAME, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success(t("copiedToClipboard"));
      }
    } catch {
      // User cancelled native share or clipboard was unavailable.
    }
  }, [t]);

  const handleMoreMessage = useCallback(() => {
    toast.info(t("moreActionsSoon"));
  }, [t]);

  const getPreviousUserContent = useCallback((messageIndex) => {
    const previousUser = [...messages.slice(0, messageIndex)].reverse().find((item) => item.role === "user");
    return previousUser?.content || "";
  }, [messages]);

  const scrollQuickTemplates = useCallback((direction) => {
    const node = quickTemplatesRef.current;
    if (!node) return;
    const cardWidth = node.querySelector("[data-quick-template-card]")?.clientWidth || 240;
    node.scrollBy({ left: direction * (cardWidth + 12), behavior: "smooth" });
  }, []);

  const handleImageIdeaClick = useCallback((idea) => {
    setActiveMode("create_image");

    if (idea.isUpload) {
      imageInputRef.current?.click();
      return;
    }

    setInput(t(`imageIdea_${idea.id.replace(/-/g, "_")}_prompt`));
  }, [t]);

  const handleWriteToolSelect = useCallback((template) => {
    beginWriteTemplateFlow(template);
  }, [beginWriteTemplateFlow]);

  const handleWriteUploadAction = useCallback((template) => {
    beginWriteTemplateFlow(template);
  }, [beginWriteTemplateFlow]);

  const handleWebsiteSelect = useCallback((site) => {
    setActiveMode("web_search");
    setSelectedWebsite(site);
    setRecentWebsiteIds((current) => [site.id, ...current.filter((id) => id !== site.id)].slice(0, 12));
  }, []);

  const handleAddWebsiteToChat = useCallback((site) => {
    setActiveMode("web_search");
    setInput(site.url);
    setSelectedWebsite(null);
    setRecentWebsiteIds((current) => [site.id, ...current.filter((id) => id !== site.id)].slice(0, 12));
  }, []);

  const toggleWebsiteFavorite = useCallback((siteId) => {
    setWebsiteFavorites((current) => (
      current.includes(siteId)
        ? current.filter((id) => id !== siteId)
        : [siteId, ...current]
    ));
  }, []);

  const copySearchItemName = useCallback(async (item) => {
    try {
      await navigator.clipboard.writeText(item.title);
      toast.success("Copied");
    } catch {
      toast.error(t("copyFailed"));
    } finally {
      setOpenSearchMenuItemId(null);
    }
  }, [t]);

  const openSearchAskConfirm = useCallback(({ category, item = null, intent }) => {
    setOpenSearchMenuItemId(null);
    setSearchConfirm({ category, item, intent });
  }, []);

  const continueSearchWithAi = useCallback(async () => {
    if (!searchConfirm?.category) return;

    const { category, item, intent } = searchConfirm;
    const searchContext = {
      source: "search",
      category: category.id,
      categoryTitle: category.title,
      intent,
      ...(item?.title ? { selectedItem: item.title } : {}),
    };

    setSearchConfirm(null);
    setSelectedSearchCategory(null);
    setOpenSearchMenuItemId(null);
    setExpandedSearchItemId(null);
    setActiveMode("default");
    setInput("");

    await handleSend({
      message: "",
      mode: "web_search",
      metadata: {
        source: "search",
        category: category.id,
        categoryTitle: category.title,
        selectedItem: item?.title,
        intent,
        searchContext,
      },
      hideUserMessage: true,
    });
  }, [handleSend, searchConfirm]);

  const scrollWebsiteCategories = useCallback((direction) => {
    const node = websiteCategoryBarRef.current;
    if (!node) return;

    node.scrollBy({ left: direction * Math.max(220, node.clientWidth * 0.7), behavior: "smooth" });
  }, []);

  const renderImageIdeas = () => (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 w-full md:mt-7"
    >
      <div className="mb-3 flex items-end justify-between gap-4 px-1 md:mb-4">
        <div>
          <h3 className={cn("text-[15px] font-semibold md:text-base", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{t("exploreImageIdeas")}</h3>
          <p className={cn("mt-0.5 text-xs md:mt-1 md:text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
            {t("exploreImageIdeasSubtitle")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {IMAGE_IDEAS.map((idea, index) => (
          <motion.button
            key={idea.id}
            type="button"
            onClick={() => handleImageIdeaClick(idea)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.18) }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.985 }}
            className={cn(
              "group overflow-hidden rounded-[24px] border p-1.5 text-left shadow-sm transition-colors duration-200 md:rounded-[28px] md:p-2",
              isDark
                ? "border-white/[0.08] bg-white/[0.06] text-white hover:border-white/[0.16] hover:bg-white/[0.1]"
                : "border-white/75 bg-white/80 text-[var(--bm-text-primary)] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
            )}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[19px] md:rounded-[22px]">
              <img
                src={idea.thumbnail}
                alt={t("imageIdeaPreviewAlt", { title: t(`imageIdea_${idea.id.replace(/-/g, "_")}_title`) })}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
              <span className="absolute left-2 top-2 rounded-full bg-white/82 px-2 py-0.5 text-[10px] font-semibold text-[var(--bm-primary)] shadow-sm backdrop-blur-md md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[11px]">
                {t(`imageIdea_${idea.id.replace(/-/g, "_")}_category`)}
              </span>
            </div>
            <div className="px-2 pb-2.5 pt-2 md:px-2.5 md:pb-3 md:pt-3">
              <span className="block text-[13px] font-semibold leading-4 md:text-[15px] md:leading-5">{t(`imageIdea_${idea.id.replace(/-/g, "_")}_title`)}</span>
              <span className={cn("mt-1 block text-xs leading-4 md:mt-1.5 md:text-sm md:leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                {t(`imageIdea_${idea.id.replace(/-/g, "_")}_description`)}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );

  const renderWebsiteCard = (site, index = 0, compact = false) => {
    const isFavorite = websiteFavorites.includes(site.id);

    return (
      <motion.article
        key={site.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: Math.min(index * 0.018, 0.16) }}
        whileHover={{ y: -5 }}
        className={cn(
          "group relative flex min-h-[188px] flex-col rounded-[30px] border p-4 text-left shadow-sm transition-colors duration-200",
          compact ? "w-full sm:min-w-[245px] sm:max-w-[245px]" : "",
          isDark
            ? "border-white/[0.08] bg-white/[0.06] text-white hover:border-white/[0.16] hover:bg-white/[0.1]"
            : "border-white/75 bg-white/82 text-[var(--bm-text-primary)] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
        )}
      >
        <button
          type="button"
          onClick={() => handleWebsiteSelect(site)}
          className="absolute inset-0 rounded-[30px]"
          aria-label={t("viewWebsiteDetails", { name: site.name })}
        />
        <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-[1.04]",
              isDark ? "border-white/[0.08] bg-white/[0.08]" : "border-[var(--bm-border)] bg-white"
            )}
          >
            <img
              src={site.logo}
              alt={`${site.name} logo`}
              className="h-9 w-9 rounded-lg object-contain"
              loading="lazy"
            />
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleWebsiteFavorite(site.id);
            }}
            className={cn(
              "relative z-20 flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              isFavorite
                ? "border-amber-300/40 bg-amber-300/20 text-amber-500"
                : isDark ? "border-white/[0.08] bg-white/[0.06] text-[var(--bm-text-muted)] hover:text-amber-300" : "border-black/[0.06] bg-white/70 text-[var(--bm-text-secondary)] hover:text-amber-500"
            )}
            aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
          >
            <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </button>
        </div>
        <div className="relative z-10 mb-2 flex flex-wrap items-center gap-2">
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isDark ? "bg-white/[0.08] text-[var(--bm-text-secondary)]" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]"
          )}>
            {site.category}
          </span>
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isDark ? "bg-white/[0.06] text-[var(--bm-text-muted)]" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]"
          )}>
            {site.countryBadge}
          </span>
        </div>
        <span className="relative z-10 block text-[16px] font-semibold leading-5">{site.name}</span>
        <span className={cn("relative z-10 mt-2 block flex-1 text-sm leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          {site.description}
        </span>
        <span className={cn("relative z-10 mt-4 block truncate text-xs font-semibold", isDark ? "text-[var(--bm-primary)]" : "text-[var(--bm-primary)]")}>
          {site.url.replace(/^https?:\/\//, "")}
        </span>
      </motion.article>
    );
  };

  const renderWebsiteRail = (title, sites, emptyText = "") => {
    if (!sites.length) {
      if (!emptyText) return null;
      return (
        <section className="mt-8">
          <h3 className={cn("mb-3 text-base font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{title}</h3>
          <div className={cn("rounded-[28px] border px-5 py-6 text-sm", isDark ? "border-white/[0.08] bg-white/[0.05] text-[var(--bm-text-muted)]" : "border-[var(--bm-border)] bg-white/70 text-[var(--bm-text-secondary)]")}>
            {emptyText}
          </div>
        </section>
      );
    }

    return (
      <section className="mt-8">
        <h3 className={cn("mb-3 px-1 text-base font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{title}</h3>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-4 sm:overflow-x-auto sm:pb-2 sm:pr-2 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
          {sites.map((site, index) => renderWebsiteCard(site, index, true))}
        </div>
      </section>
    );
  };

  const renderSearchArtwork = (item, index = 0) => {
    const artwork = item.artwork || {};
    const from = artwork.from || "var(--bm-primary)";
    const via = artwork.via || "#4E8EDB";
    const to = artwork.to || "#D8E8FF";

    return (
      <div
        className="relative aspect-[1.35] overflow-hidden rounded-[22px]"
        style={{ background: `linear-gradient(135deg, ${from}, ${via} 55%, ${to})` }}
      >
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/18" />
        <div className="absolute bottom-4 left-4 h-16 w-20 rotate-[8deg] rounded-[22px] border border-white/16 bg-white/14" />
        <div className="absolute -bottom-12 right-[-18px] h-28 w-28 rounded-full bg-white/16" />
        <svg
          className="absolute inset-x-0 bottom-2 h-24 w-full text-white/75"
          viewBox="0 0 220 110"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 76C42 32 70 101 103 56C129 20 154 35 181 69C194 85 204 88 216 78"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path d="M36 35H122" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.48" />
          <path d="M50 50H154" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.32" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
          {item.sectionTitle || item.category || "Search"}
        </span>
      </div>
    );
  };

  const renderSearchCategoryCard = (category, index) => (
    <motion.button
      key={category.id}
      type="button"
      onClick={() => {
        setSelectedSearchCategory(category);
        setOpenSearchMenuItemId(null);
        setExpandedSearchItemId(null);
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.018, 0.14) }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group overflow-hidden rounded-[28px] border p-2 text-left shadow-sm transition-colors duration-200",
        isDark
          ? "border-white/[0.08] bg-white/[0.06] text-white hover:border-white/[0.16] hover:bg-white/[0.1]"
          : "border-white/75 bg-white/82 text-[var(--bm-text-primary)] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
      )}
    >
      {renderSearchArtwork(category, index)}
      <div className="px-2.5 pb-3 pt-3">
        <span className="block text-[15px] font-semibold leading-5">{category.title}</span>
        <span className={cn("mt-1.5 line-clamp-2 block text-sm leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          {category.description}
        </span>
      </div>
    </motion.button>
  );

  const renderSearchResultCard = (item, index) => (
    <motion.article
      key={item.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.012, 0.14) }}
      className={cn(
        "group relative overflow-visible rounded-[28px] border p-2 text-left shadow-sm transition-colors duration-200",
        isDark
          ? "border-white/[0.08] bg-white/[0.06] text-white"
          : "border-white/75 bg-white/82 text-[var(--bm-text-primary)] shadow-slate-200/70"
      )}
    >
      {renderSearchArtwork(item, index)}
      <button
        type="button"
        onClick={() => setOpenSearchMenuItemId((current) => current === item.id ? null : item.id)}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
        aria-label={`Open actions for ${item.title}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {openSearchMenuItemId === item.id && (
        <div className={cn(
          "absolute right-4 top-14 z-20 w-40 overflow-hidden rounded-2xl border p-1 shadow-xl",
          isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]"
        )}>
          <button
            type="button"
            onClick={() => {
              setExpandedSearchItemId((current) => current === item.id ? null : item.id);
              setOpenSearchMenuItemId(null);
            }}
            className={cn("h-10 w-full rounded-xl px-3 text-left text-xs font-bold", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[var(--bm-hover-bg)]")}
          >
            Learn More
          </button>
          <button
            type="button"
            onClick={() => copySearchItemName(item)}
            className={cn("h-10 w-full rounded-xl px-3 text-left text-xs font-bold", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[var(--bm-hover-bg)]")}
          >
            Copy Name
          </button>
          <button
            type="button"
            onClick={() => openSearchAskConfirm({
              category: selectedSearchCategory,
              item,
              intent: "learn_more_about_selected_item",
            })}
            className={cn("h-10 w-full rounded-xl px-3 text-left text-xs font-bold", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[var(--bm-hover-bg)]")}
          >
            Ask AI
          </button>
        </div>
      )}

      <div className="px-2.5 pb-3 pt-3">
        <span className="block text-[15px] font-semibold leading-5">{item.title}</span>
        <span className={cn("mt-1.5 line-clamp-2 block text-sm leading-5", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          {item.description}
        </span>
        {expandedSearchItemId === item.id && (
          <div className={cn("mt-3 rounded-2xl px-3 py-2 text-xs font-semibold leading-5", isDark ? "bg-white/[0.07] text-[var(--bm-text-secondary)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]")}>
            {item.details || `More useful details about ${item.title} will appear here as search data is connected.`}
          </div>
        )}
      </div>
    </motion.article>
  );

  const renderSearchDiscovery = () => {
    const activeCategory = selectedSearchCategory;
    const resultCards = getSearchResultsForCategory(activeCategory);

    return (
      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className={cn("text-lg font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>
              {activeCategory?.title || "Search"}
            </h3>
            <p className={cn("mt-1 max-w-2xl text-sm leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
              {activeCategory
                ? "Explore results in this category. If you do not see what you need, Ask AI can help you find it."
                : "Find what you need here. If you cannot find it, Ask AI can help you find it."}
            </p>
          </div>
          {activeCategory && (
            <button
              type="button"
              onClick={() => {
                setSelectedSearchCategory(null);
                setOpenSearchMenuItemId(null);
                setExpandedSearchItemId(null);
              }}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
                isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[var(--bm-primary)] hover:bg-white"
              )}
            >
              All categories
            </button>
          )}
        </div>

        {!activeCategory ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SEARCH_DISCOVERY_CATEGORIES.map((category, index) => renderSearchCategoryCard(category, index))}
          </div>
        ) : (
          <>
            <div className={cn("mb-5 rounded-[28px] border p-4", isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-white/75 bg-white/82 shadow-sm shadow-slate-200/70")}>
              <p className={cn("text-sm font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>Can&apos;t find what you&apos;re looking for?</p>
              <button
                type="button"
                onClick={() => openSearchAskConfirm({
                  category: activeCategory,
                  intent: "item_not_found",
                })}
                className="mt-3 h-11 rounded-2xl bg-[var(--bm-primary)] px-5 text-sm font-bold text-white transition-opacity hover:opacity-95"
              >
                Ask AI
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {resultCards.map((item, index) => renderSearchResultCard(item, index))}
            </div>
          </>
        )}
      </section>
    );
  };

  const renderWebsiteSkeletons = () => (
    <div className="grid min-w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`website-skeleton-${index}`}
          className={cn(
            "min-h-[188px] animate-pulse rounded-[30px] border p-4",
            isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-white/75 bg-white/70"
          )}
        >
          <div className={cn("h-14 w-14 rounded-2xl", isDark ? "bg-white/[0.08]" : "bg-slate-200/80")} />
          <div className={cn("mt-5 h-4 w-24 rounded-full", isDark ? "bg-white/[0.08]" : "bg-slate-200/80")} />
          <div className={cn("mt-4 h-3 w-full rounded-full", isDark ? "bg-white/[0.08]" : "bg-slate-200/80")} />
          <div className={cn("mt-2 h-3 w-3/4 rounded-full", isDark ? "bg-white/[0.08]" : "bg-slate-200/80")} />
        </div>
      ))}
    </div>
  );

  const renderWebsiteDiscovery = () => {
    const normalizedQuery = websiteSearchQuery.trim().toLowerCase();
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const sitesById = new Map(WEBSITE_DIRECTORY.map((site) => [site.id, site]));
    const trendingSites = TRENDING_WEBSITE_IDS.map((id) => sitesById.get(id)).filter(Boolean);
    const recentSites = recentWebsiteIds.map((id) => sitesById.get(id)).filter(Boolean);
    const favoriteSites = websiteFavorites.map((id) => sitesById.get(id)).filter(Boolean);
    const categoryFiltered = WEBSITE_DIRECTORY.filter((site) => (
      activeWebsiteCategory === "All" ||
      site.primaryCategory === activeWebsiteCategory ||
      site.category === activeWebsiteCategory
    ));
    const matchingStatic = normalizedQuery
      ? categoryFiltered.filter((site) => queryTokens.every((token) => {
          const searchable = `${site.tags} ${site.description} ${site.country === "Sweden" ? "swedish svenska sverige bank myndighet nyheter" : ""}`.toLowerCase();
          return searchable.includes(token);
        }))
      : categoryFiltered;
    const externalLiveResults = normalizedQuery
      ? liveWebsiteResults.filter((liveSite) => !matchingStatic.some((site) => site.domain === liveSite.domain))
      : [];
    const fallbackLiveResults = normalizedQuery && matchingStatic.length + externalLiveResults.length < 5
      ? createLiveWebsiteResults(websiteSearchQuery)
      : [];
    const liveResults = [
      ...externalLiveResults,
      ...fallbackLiveResults.filter((liveSite) => (
        !matchingStatic.some((site) => site.domain === liveSite.domain) &&
        !externalLiveResults.some((site) => site.domain === liveSite.domain)
      )),
    ];
    const matchingWebsites = [...matchingStatic, ...liveResults];
    const pageCount = Math.max(1, Math.ceil(matchingWebsites.length / WEBSITE_PAGE_SIZE));
    const safePage = Math.min(websitePage, pageCount - 1);
    const pageSites = matchingWebsites.slice(safePage * WEBSITE_PAGE_SIZE, (safePage + 1) * WEBSITE_PAGE_SIZE);

    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-7 w-full"
      >
        <div className={cn(
          "overflow-hidden rounded-[34px] border p-4 shadow-sm sm:p-5",
          isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-white/80 bg-white/70 shadow-slate-200/70"
        )}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className={cn("text-lg font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{t("discoverWebsites")}</h3>
              <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                {t("discoverWebsitesSubtitle")}
              </p>
            </div>
            <label
              className={cn(
                "flex h-12 w-full items-center gap-2 rounded-full border px-4 transition-colors lg:w-96",
                isDark
                  ? "border-white/[0.08] bg-white/[0.06] text-white focus-within:border-white/[0.18]"
                  : "border-black/[0.06] bg-white/85 text-[var(--bm-text-primary)] shadow-sm shadow-slate-200/60 focus-within:border-[var(--bm-border-strong)]"
              )}
            >
              <Search className={cn("h-4 w-4 flex-shrink-0", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")} />
              <input
                type="search"
                value={websiteSearchQuery}
                onChange={(event) => setWebsiteSearchQuery(event.target.value)}
                placeholder={t("searchForWebsite")}
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-sm font-medium outline-none",
                  isDark ? "placeholder:text-[var(--bm-text-muted)]" : "placeholder:text-[var(--bm-text-muted)]"
                )}
                data-testid="website-search-input"
              />
            </label>
          </div>

          <div className="mb-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollWebsiteCategories(-1)}
              className={cn(
                "hidden h-10 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors sm:inline-flex",
                isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[var(--bm-primary)] hover:bg-white"
              )}
              aria-label="Previous categories"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div
              ref={websiteCategoryBarRef}
              className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {WEBSITE_CATEGORIES.map((category) => {
                const active = activeWebsiteCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveWebsiteCategory(category)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-transparent bg-[var(--bm-primary)] text-white shadow-sm"
                        : isDark ? "border-white/[0.08] bg-white/[0.05] text-[var(--bm-text-secondary)] hover:bg-white/[0.09]" : "border-black/[0.05] bg-white/75 text-[var(--bm-text-secondary)] hover:bg-white"
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollWebsiteCategories(1)}
              className={cn(
                "hidden h-10 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors sm:inline-flex",
                isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[var(--bm-primary)] hover:bg-white"
              )}
              aria-label="Next categories"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {renderSearchDiscovery()}

          {renderWebsiteRail(t("trendingWebsites"), trendingSites)}
          {renderWebsiteRail(t("favoriteWebsites"), favoriteSites, t("favoriteWebsitesEmpty"))}
          {renderWebsiteRail(t("recentlyUsed"), recentSites, t("recentWebsitesEmpty"))}

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <h3 className={cn("text-base font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>
                  {normalizedQuery ? t("searchResults") : t("categoryWebsites", { category: activeWebsiteCategory })}
                </h3>
                <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                  {t("websitesAvailable", { count: matchingWebsites.length })}
                  {liveResults.length ? ` ${t("includingLiveLookupSuggestions")}` : ""}
                  {isWebsiteLiveSearching ? ` ${t("searchingLiveWebDirectory")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWebsitePage((page) => Math.max(0, page - 1))}
                  disabled={safePage === 0}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[var(--bm-text-primary)] hover:bg-white"
                  )}
                  aria-label={t("previousWebsitePage")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className={cn("min-w-[86px] text-center text-sm font-semibold", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>
                  {t("pageOf", { current: safePage + 1, total: pageCount })}
                </span>
                <button
                  type="button"
                  onClick={() => setWebsitePage((page) => Math.min(pageCount - 1, page + 1))}
                  disabled={safePage >= pageCount - 1}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[var(--bm-text-primary)] hover:bg-white"
                  )}
                  aria-label={t("nextWebsitePage")}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="pb-2">
              {isWebsiteLiveSearching && normalizedQuery ? (
                renderWebsiteSkeletons()
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeWebsiteCategory}-${safePage}-${websiteSearchQuery}`}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22 }}
                    className="grid min-w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                  >
                    {pageSites.map((site, index) => renderWebsiteCard(site, index))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </section>
        </div>
      </motion.section>
    );
  };

  const renderWebsiteDetails = () => {
    if (!selectedWebsite) return null;

    const isFavorite = websiteFavorites.includes(selectedWebsite.id);

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[82] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setSelectedWebsite(null)}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative z-10 w-full max-w-xl overflow-hidden rounded-[34px] border p-5 shadow-2xl",
              isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-white bg-white text-[var(--bm-text-primary)]"
            )}
          >
            <button
              type="button"
              onClick={() => setSelectedWebsite(null)}
              className={cn(
                "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                isDark ? "bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)] hover:bg-[var(--bm-active-bg)]"
              )}
              aria-label={t("closeWebsiteDetails")}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4 pr-12">
              <div className={cn("flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[24px] border", isDark ? "border-white/[0.08] bg-white/[0.08]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                <img src={selectedWebsite.logo} alt={`${selectedWebsite.name} logo`} className="h-12 w-12 rounded-xl object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight">{selectedWebsite.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", isDark ? "bg-white/[0.08] text-[var(--bm-text-secondary)]" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]")}>
                    {selectedWebsite.category}
                  </span>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", isDark ? "bg-white/[0.06] text-[var(--bm-text-muted)]" : "bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]")}>
                    {selectedWebsite.countryBadge}
                  </span>
                </div>
              </div>
            </div>

            <p className={cn("mt-5 text-sm leading-6", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>
              {selectedWebsite.description}
            </p>

            <div className={cn("mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold", isDark ? "border-white/[0.08] bg-white/[0.05] text-[var(--bm-primary)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] text-[var(--bm-primary)]")}>
              {selectedWebsite.url}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <a
                href={selectedWebsite.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--bm-primary)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-95"
              >
                <ExternalLink className="h-4 w-4" />
                {t("openWebsite")}
              </a>
              <button
                type="button"
                onClick={() => toggleWebsiteFavorite(selectedWebsite.id)}
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-colors",
                  isFavorite
                    ? "border-amber-300/40 bg-amber-300/20 text-amber-500"
                    : isDark ? "border-white/[0.08] bg-white/[0.06] text-[var(--bm-text-secondary)] hover:bg-white/[0.1]" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]"
                )}
              >
                <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
                {t("favorite")}
              </button>
              <button
                type="button"
                onClick={() => handleAddWebsiteToChat(selectedWebsite)}
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition-colors",
                  isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)] hover:bg-white"
                )}
              >
                {t("addToChat")}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  const renderWriteEditWorkspace = () => {
    const smartSuggestions = writeFiles.length
      ? WRITE_UPLOAD_ACTIONS.filter((template) => {
          const { title } = template;
          const hasCv = writeFiles.some((file) => file.isCv);
          const hasPdf = writeFiles.some((file) => file.type === "pdf");
          const hasImage = writeFiles.some((file) => file.type === "image");

          if (hasCv && title.includes("CV")) return true;
          if (hasPdf && ["Summarize Document", "Rewrite Document", "Translate Document"].includes(title)) return true;
          if (hasImage && ["Summarize Document", "Rewrite Document", "Translate Document"].includes(title)) return true;
          return ["Summarize Document", "Rewrite Document", "Translate Document"].includes(title);
        })
      : WRITE_UPLOAD_ACTIONS.slice(0, 4);

    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-7 w-full"
      >
        <div className={cn(
          "rounded-[34px] border p-4 shadow-sm sm:p-5",
          isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-white/80 bg-white/70 shadow-slate-200/70"
        )}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className={cn("text-lg font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{t("productivityWorkspace")}</h3>
              <p className={cn("mt-1 text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                {t("productivityWorkspaceSubtitle")}
              </p>
            </div>
            <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--bm-primary)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-95">
              <FileText className="h-4 w-4" />
              {t("uploadFiles")}
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.rtf,.csv,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,text/csv,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleWriteFileSelect}
              />
            </label>
          </div>

          {writeFiles.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {writeFiles.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3",
                    isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-[var(--bm-border)] bg-white/80"
                  )}
                >
                  {file.type === "image" && file.previewUrl ? (
                    <img src={file.previewUrl} alt={file.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", isDark ? "bg-white/[0.08]" : "bg-[var(--bm-active-bg)]")}>
                      <FileText className={cn("h-5 w-5", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-primary)]")} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{file.name}</p>
                    <p className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{file.type.toUpperCase()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWriteFiles((files) => files.filter((item) => item.id !== file.id))}
                    className={cn("flex h-8 w-8 items-center justify-center rounded-full", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[var(--bm-hover-bg)]")}
                    aria-label={t("removeFile")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <section className="mb-7">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <h3 className={cn("text-base font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{t("quickTemplates")}</h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollQuickTemplates(-1)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors",
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[var(--bm-border)] bg-white text-[var(--bm-primary)] hover:bg-[var(--bm-bg-elevated)]",
                  )}
                  aria-label="Previous quick template"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollQuickTemplates(1)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors",
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[var(--bm-border)] bg-white text-[var(--bm-primary)] hover:bg-[var(--bm-bg-elevated)]",
                  )}
                  aria-label="Next quick template"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={quickTemplatesRef}
              className="flex snap-x gap-3 overflow-x-auto pb-2 scroll-smooth sm:pb-3 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
            >
              {QUICK_WRITE_TEMPLATES.map((template, index) => {
                const { title, description, icon: Icon } = template;
                return (
                  <DesktopWriteToolCard
                    key={title}
                    template={template}
                    title={title}
                    description={description}
                    icon={Icon}
                    index={index}
                    category={template.artwork?.category || "Quick"}
                    onClick={() => handleWriteToolSelect(template)}
                    isDark={isDark}
                    compact
                    className="min-h-[260px] min-w-[270px] snap-start md:min-w-[292px]"
                    data-quick-template-card
                  />
                );
              })}
            </div>
          </section>

          <section className="mb-7">
            <h3 className={cn("mb-3 px-1 text-base font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{t("smartSuggestions")}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {smartSuggestions.map((template, index) => {
                const { title, icon: Icon } = template;
                return (
                  <DesktopWriteToolCard
                    key={title}
                    template={template}
                    title={t(uiTextKey("writeUploadAction", title, "title"))}
                    description={writeFiles.length ? t("suggestedFromUploadedFiles") : t("uploadFileForSmarterContext")}
                    icon={Icon}
                    index={index + 3}
                    category={writeFiles.length ? "From File" : "Smart"}
                    onClick={() => handleWriteUploadAction(template)}
                    isDark={isDark}
                    compact
                    className="min-h-[250px]"
                  />
                );
              })}
            </div>
          </section>

          <div className="space-y-7">
            {WRITE_EDIT_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              return (
                  <section key={section.title}>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <SectionIcon className={cn("h-5 w-5", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-primary)]")} />
                    <h3 className={cn("text-base font-semibold", isDark ? "text-[var(--bm-hover-bg)]" : "text-[var(--bm-text-primary)]")}>{t(uiTextKey("writeSection", section.title))}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {section.items.map((template, index) => {
                      const { title, description } = template;
                      return (
                        <DesktopWriteToolCard
                          key={`${section.title}-${title}-${index}`}
                          template={template}
                          title={t(uiTextKey("writeTool", title, "title"))}
                          description={t(uiTextKey("writeTool", title, "description")) || description}
                          icon={SectionIcon}
                          index={index + WRITE_EDIT_SECTIONS.findIndex((item) => item.id === section.id) * 3}
                          category={t(uiTextKey("writeSection", section.title))}
                          onClick={() => handleWriteToolSelect(template)}
                          isDark={isDark}
                          className="min-h-[270px]"
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </motion.section>
    );
  };

  const renderHomeTools = () => (
    <div className="mb-0 mt-4 flex flex-row flex-wrap items-center justify-center gap-2">
      {[
        { id: "create_image", labelKey: "createImage", icon: Palette },
        { id: "write_edit", labelKey: "writeEdit", icon: Edit3 },
        { id: "web_search", labelKey: "search", icon: Search },
      ].map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => {
            setActiveMode(tool.id);
          }}
          className={cn(
            "inline-flex min-h-[32px] items-center justify-start gap-2 rounded-xl px-2.5 py-1 text-sm font-medium transition-colors duration-200 md:h-[34px] md:min-w-[104px] md:justify-center md:rounded-full md:px-3 md:py-0",
            activeMode === tool.id
              ? isDark ? "bg-white/[0.075] text-white" : "bg-[var(--bm-primary)]/[0.075] text-[var(--bm-primary)]"
              : isDark ? "text-[var(--bm-text-secondary)] hover:bg-white/[0.045] hover:text-white" : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-primary)]/[0.045] hover:text-[var(--bm-text-primary)]"
          )}
        >
          <tool.icon className="h-[15px] w-[15px] flex-shrink-0 stroke-[2.05]" />
          <span className="whitespace-nowrap">{t(tool.labelKey)}</span>
        </button>
      ))}
    </div>
  );

  const handleResponseModeSelect = async (nextMode, model) => {
    const normalizedMode = normalizeAiModeId(nextMode);
    if (model?.id) setDesktopModelId(model.id);
    setResponseMode(normalizedMode);
    setResponseModeMenuOpen(false);
    try {
      await updatePreferences({ aiMode: normalizedMode });
    } catch (error) {
      toast.error("Could not save BlueMind mode");
    }
  };

  const renderInput = (testSuffix = "") => {
    const composerAttachments = activeMode === "write_edit" ? writeFiles : attachments;
    const removeComposerAttachment = activeMode === "write_edit" ? removeWriteFile : removeAttachment;
    const clearComposerAttachments = () => {
      if (activeMode === "write_edit") {
        writeFiles.forEach((file) => {
          if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
        });
        setWriteFiles([]);
        return;
      }
      setAttachments([]);
    };
    const composerMode = activeMode !== "default" ? (CHAT_MODES[activeMode] || CHAT_MODES.default) : null;
    const modePill = composerMode ? {
      label: t(composerMode.labelKey),
      icon: composerMode.icon,
      onClear: activeMode === "write_edit" ? clearWriteTask : () => {
        setActiveMode("default");
        if (activeMode === "create_image") {
          setInput("");
        }
        if (activeMode === "web_search") {
          setSelectedSearchCategory(null);
          setOpenSearchMenuItemId(null);
          setExpandedSearchItemId(null);
          setSearchConfirm(null);
        }
      },
      clearLabel: activeMode === "web_search" ? t("removeWebSearch") : t("remove"),
    } : null;
    const actionMenu = (
      <DesktopPlusMenu
        open={attachmentMenuOpen}
        onClose={() => setAttachmentMenuOpen(false)}
        isDark={isDark}
        onCamera={() => {
          setAttachmentMenuOpen(false);
          cameraInputRef.current?.click();
        }}
        onFiles={() => {
          setAttachmentMenuOpen(false);
          fileInputRef.current?.click();
        }}
        onCreateImage={() => {
          setAttachmentMenuOpen(false);
          setActiveMode("create_image");
        }}
        onWriteEdit={() => {
          setAttachmentMenuOpen(false);
          setActiveMode("write_edit");
        }}
        onSearch={() => {
          setAttachmentMenuOpen(false);
          setActiveMode("web_search");
        }}
      />
    );

    const pendingPanel = (
      <AnimatePresence>
        {writeAttachmentChoiceOpen && pendingWriteTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className={cn(
              "mb-3 max-w-[420px] rounded-3xl border p-3 shadow-xl backdrop-blur-2xl",
              isDark ? "border-white/10 bg-[var(--bm-bg-card)]/95 text-white" : "border-black/10 bg-white/90 text-[var(--bm-text-primary)]",
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{pendingWriteTemplate.title}</p>
                <p className={cn("mt-1 text-xs font-medium", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                  Choose an optional file or continue writing manually.
                </p>
              </div>
              <button
                type="button"
                onClick={continueWriteTaskWithoutAttachment}
                className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                aria-label="Continue without attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {WRITE_EDIT_UPLOAD_OPTIONS.filter((option) => option.id !== "continue").map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => openWriteAttachmentInput(option.id)}
                  className={cn(
                    "rounded-2xl px-3 py-3 text-left text-xs font-bold transition-colors",
                    isDark ? "bg-white/[0.07] hover:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-primary)] hover:bg-[var(--bm-active-bg)]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );

    return (
      <DesktopComposer
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onSubmit={(event) => {
              event.preventDefault();
              if (isAiTyping) {
                handleStopStreaming();
                return;
              }
              if (isListening) {
                stopVoiceInput();
                return;
              }
              handleSend();
            }}
            placeholder={
              isUploading
                ? t("uploadingImage")
                : activeMode === "create_image"
                  ? t("describeOrEditImage")
                  : activeMode === "web_search"
                    ? t("searchWebOrChooseWebsite")
                    : activeMode === "write_edit"
                      ? t("writePasteOrChooseTool")
                      : attachments.length
                        ? "Ask about these images..."
                      : t("askAnything")
            }
            modePill={modePill}
            attachments={composerAttachments}
            onRemoveAttachment={removeComposerAttachment}
            onClearAttachments={clearComposerAttachments}
            isUploading={isUploading}
            onAdd={() => setAttachmentMenuOpen((open) => !open)}
            onVoice={startVoiceInput}
            isListening={isListening}
            isBusy={isAiTyping || isListening}
            canSend={Boolean(input.trim() || composerAttachments.length)}
            onSendAction={isAiTyping ? handleStopStreaming : isListening ? stopVoiceInput : undefined}
            addLabel={t("addAttachment")}
            voiceLabel={isListening ? t("stopVoiceInput") : t("startVoiceInput")}
            sendLabel={t("sendMessage")}
            stopLabel={t("stopGenerating")}
            isDark={isDark}
            appColor={appColor}
            responseMode={responseMode}
            modelId={desktopModelId}
            onResponseModeChange={handleResponseModeSelect}
            thinkingLevel={thinkingLevel}
            onThinkingLevelChange={setThinkingLevel}
            inputDirectionStyle={inputDirectionStyle}
            actionMenu={actionMenu}
            pendingPanel={pendingPanel}
            testId={testSuffix ? `chat-input-${testSuffix}` : "chat-input"}
          />
    );

  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className={cn("h-screen flex overflow-hidden", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")}
      data-testid="chat-page"
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFileSelect}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleUnsupportedFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.csv,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,text/csv,image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleWriteFileSelect}
      />
      <input
        ref={writeImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleWriteFileSelect}
      />
      <input
        ref={writeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleWriteFileSelect}
      />

      <AnimatePresence>
        {renameTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40"
              onClick={() => setRenameTarget(null)}
            />
            <motion.form
              onSubmit={handleRenameSubmit}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className={cn(
                "relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-xl",
                isDark ? "border-white/[0.08] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white",
              )}
              data-testid="rename-chat-modal"
            >
              <h2 className={cn("mb-4 text-base font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
                {t("renameChat")}
              </h2>
              <input
                value={renameTitle}
                onChange={(event) => setRenameTitle(event.target.value.slice(0, 120))}
                className={cn(
                  inputClasses.field,
                  typeClasses.body,
                  "font-semibold",
                )}
                placeholder={t("chatTitle")}
                autoFocus
                data-testid="rename-chat-input"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className={cn(
                    "flex-1 rounded-xl border py-3 text-sm font-medium",
                    isDark ? "border-white/[0.08] text-[var(--bm-text-primary)] hover:bg-white/[0.08]" : "border-[var(--bm-border)] text-[var(--bm-text-secondary)] hover:bg-[var(--bm-bg-elevated)]",
                  )}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!renameTitle.trim()}
                  className="flex-1 rounded-xl bg-[var(--bm-primary)] py-3 text-sm font-medium text-white disabled:opacity-50"
                  data-testid="rename-chat-save"
                >
                  {t("save")}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dislikeTarget && (
          <DislikeFeedbackPopover
            messageId={dislikeTarget.id}
            isDark={isDark}
            onSelect={handleDislikeReason}
            onClose={() => setDislikeTarget(null)}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedImage(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative max-h-[88vh] max-w-[92vw]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--bm-text-primary)] shadow-lg"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={selectedImage.src}
                alt={selectedImage.name || "image"}
                className="max-h-[88vh] max-w-[92vw] rounded-3xl object-contain shadow-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchConfirm && (
          <div className="fixed inset-0 z-[86] flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Cancel Ask AI"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setSearchConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "relative z-10 w-full max-w-sm rounded-[28px] border p-5 shadow-2xl",
                isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-white bg-white text-[var(--bm-text-primary)]"
              )}
            >
              <h3 className="text-base font-bold tracking-tight">Ask AI?</h3>
              <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]")}>
                {searchConfirm.item
                  ? `Would you like AI to help you learn more about ${searchConfirm.item.title}?`
                  : `Would you like AI to help you find something that is not listed in ${searchConfirm.category.title}?`}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSearchConfirm(null)}
                  className={cn(
                    "h-11 rounded-2xl text-sm font-bold",
                    isDark ? "bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)] hover:bg-[var(--bm-active-bg)]"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void continueSearchWithAi()}
                  className="h-11 rounded-2xl bg-[var(--bm-primary)] text-sm font-bold text-white hover:opacity-95"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderWebsiteDetails()}
      {renderChatModeModals()}

      <AnimatePresence>
        {desktopSettingsOpen && (
          <DesktopSettingsPanel
            open
            modal
            initialSection="account"
            onClose={() => setDesktopSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="h-full flex-shrink-0">
        <Sidebar
          isHistoryOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((value) => !value)}
          onNewChat={handleNewChat}
          onOpenSettings={() => setDesktopSettingsOpen(true)}
          history={history}
          activeConversationId={activeConversationId}
          onOpenConversation={handleOpenConversation}
          onRenameConversation={handleRenameConversation}
          onShareConversation={handleShareConversation}
          onDeleteConversation={handleDeleteConversation}
          chatSessionMode={chatSessionMode}
          privateSpaceName={activePrivateSpace?.name}
          onSelectNormalChat={handleSelectNormalChat}
          onOpenPrivateChat={openPrivateSpaceModal}
          onOpenHiddenChat={() => setHiddenChatModalOpen(true)}
        />
      </div>

      <div className="relative flex-1 flex flex-col h-full min-w-0">
        <header
          className={cn(
            "sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3.5 sm:px-6",
            isDark ? "border-white/[0.08] bg-[var(--bm-bg-app)]" : "border-[var(--bm-border)] bg-[var(--bm-bg-app)]",
          )}
        >
          <div className="flex items-center gap-3">
            <div ref={responseModeMenuRef} className="relative" aria-label="AI specialization selector">
              {(() => {
                const activeAiMode = getAiMode(responseMode);
                const ActiveModeIcon = activeAiMode.icon;
                return (
                  <button
                    type="button"
                    onClick={() => setResponseModeMenuOpen((open) => !open)}
                    className={cn(
                      "inline-flex h-10 min-w-[150px] items-center justify-between gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors",
                      isDark
                        ? "border-white/[0.1] bg-white/[0.055] text-white hover:bg-white/[0.09]"
                        : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)] shadow-sm hover:bg-[var(--bm-hover-bg)]",
                    )}
                    aria-haspopup="menu"
                    aria-expanded={responseModeMenuOpen}
                    title={activeAiMode.description}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ActiveModeIcon className="h-4 w-4 shrink-0 stroke-[2.2]" />
                      <span className="truncate">{getAiSpecializationLabel(activeAiMode)}</span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", responseModeMenuOpen && "rotate-180")} />
                  </button>
                );
              })()}
              <AnimatePresence>
                {responseModeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "absolute left-0 top-[calc(100%+8px)] z-50 w-[260px] overflow-hidden rounded-[18px] border p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]",
                      isDark
                        ? "border-white/[0.1] bg-[#202020] text-white"
                        : "border-black/[0.06] bg-white text-[var(--bm-text-primary)]",
                    )}
                    role="menu"
                  >
                    {AI_MODES.map((mode) => {
                      const ModeIcon = mode.icon;
                      const selected = responseMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => handleResponseModeSelect(mode.id)}
                          className={cn(
                            "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-bold transition-colors",
                            selected
                              ? isDark
                                ? "bg-white/[0.1] text-white"
                                : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]"
                              : isDark
                                ? "text-white hover:bg-white/[0.07]"
                                : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
                          )}
                          title={mode.description}
                          role="menuitemradio"
                          aria-checked={selected}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <ModeIcon className="h-4 w-4 shrink-0 stroke-[2.2]" />
                            <span className="truncate">{getAiSpecializationLabel(mode)}</span>
                          </span>
                          {selected && <Check className={cn("h-[18px] w-[18px] shrink-0 stroke-[2.5]", isDark ? "text-white" : "text-[var(--bm-primary)]")} />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {chatSessionMode === "private" && activePrivateSpace && (
              <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", isDark ? "bg-white/10 text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]")}>
                <Lock className="h-3.5 w-3.5" />
                <span>{activePrivateSpace.name} Chat</span>
                <button type="button" className="ml-1 underline underline-offset-2" onClick={handleExitPrivateSpace}>Exit Private Chat</button>
              </div>
            )}
            {chatSessionMode === "hidden" && (
              <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", isDark ? "bg-white/10 text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>
                <Glasses className="h-3.5 w-3.5" />
                <span>Hidden Mode</span>
                <button type="button" className="ml-1 underline underline-offset-2" onClick={handleExitHiddenMode}>Exit Hidden Chat</button>
              </div>
            )}
          </div>
          <button
            onClick={handleNewChat}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
              isDark
                ? "text-[var(--bm-text-muted)] hover:text-white hover:bg-[var(--bm-bg-elevated)]"
                : "text-[var(--bm-text-secondary)] hover:text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
            )}
            data-testid="header-new-chat"
          >
            <Pencil className="h-5 w-5 shrink-0" />
          </button>
        </header>

        <div ref={messagesScrollRef} className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div
              className={cn(
                "flex min-h-full flex-col items-center px-4 pb-12",
                activeMode === "create_image" || activeMode === "web_search" || activeMode === "write_edit" ? "justify-start pt-8 sm:pt-10" : "justify-center",
              )}
            >
              {activeMode === "default" ? (
                <div className="mb-5 h-[88px] overflow-hidden text-center sm:mb-8 sm:h-[104px]">
                  <RotatingChatSuggestion
                    iconClassName="h-6 w-6 sm:h-8 sm:w-8"
                    textClassName={cn(
                      "max-w-4xl text-center text-[21px] font-semibold leading-tight tracking-tight sm:text-3xl",
                      isDark ? "text-white" : "text-[var(--bm-text-primary)]",
                    )}
                  />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("text-center", activeMode === "create_image" || activeMode === "web_search" || activeMode === "write_edit" ? "mb-6" : "mb-7")}
                >
                  <h2 className={cn("mb-2 text-2xl font-semibold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>
                    {activeMode === "create_image" ? t("whatShouldWeCreate") : activeMode === "web_search" ? t("whereShouldWeSearch") : activeMode === "write_edit" ? t("whatShouldWeProduce") : t("readyWhenYouAre")}
                  </h2>
                  <p className={cn("text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>
                    {isHistoryLoading ? t("loadingConversation") : activeMode === "create_image" ? t("describeImageOrStartIdea") : activeMode === "web_search" ? t("pickWebsiteOrAskSearch") : activeMode === "write_edit" ? t("chooseTemplateUploadOrPaste") : t("askMeAnything")}
                  </p>
                </motion.div>
              )}

              <div className={cn("w-full", activeMode === "create_image" || activeMode === "web_search" || activeMode === "write_edit" ? "max-w-7xl" : "max-w-4xl")}>
                {renderInput()}
                {activeMode === "create_image" ? renderImageIdeas() : activeMode === "web_search" ? renderWebsiteDiscovery() : activeMode === "write_edit" ? renderWriteEditWorkspace() : renderHomeTools()}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLatestAi={message.role === "ai" && index === messages.length - 1}
                    feedback={messageFeedback[message.id]}
                    onCreateSuggestion={handleCreateSuggestion}
                    onCopy={handleCopyMessage}
                    onLike={handleLikeMessage}
                    onDislike={handleDislikeMessage}
                    onEdit={handleEditMessage}
                    onRegenerate={handleRegenerateMessage}
                    onShare={handleShareMessage}
                    onMore={handleMoreMessage}
                    onExpandImage={setSelectedImage}
                    previousUserContent={getPreviousUserContent(index)}
                  />
                ))}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {hasMessages && (
          <div
            className={cn(
              "px-3 pb-5 pt-2 sm:px-6 sm:pb-6",
              isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]",
            )}
          >
            <div className="mx-auto max-w-5xl">{renderInput("bottom")}</div>
          </div>
        )}

        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              type="button"
              onClick={() => scrollToBottom("smooth")}
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              className={cn(
                "fixed left-1/2 z-50 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-colors",
                isDark ? "border-white/[0.12] bg-[var(--bm-bg-elevated)]/90 text-white hover:bg-[#2E2E2E]" : "border-black/[0.06] bg-white/90 text-[var(--bm-primary)] hover:bg-white"
              )}
              style={{ bottom: "8.5rem" }}
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="h-5 w-5 stroke-[2.4]" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
