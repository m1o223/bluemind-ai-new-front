import { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Home,
  Bell,
  BookOpen,
  CalendarDays,
  Clock,
  UserCircle,
  Plus,
  ArrowUp,
  ChevronDown,
  Mic,
  X,
  PanelLeftClose,
  PanelLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Square,
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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import BrandLogo, { APP_NAME } from "@/components/BrandLogo";
import { getDirectionalStyle } from "@/components/MarkdownText";
import MessageResponse from "@/components/MessageResponse";
import RotatingChatSuggestion from "@/components/RotatingChatSuggestion";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import UnifiedComposer from "@/components/UnifiedComposer";
import BlueMindMediaPicker from "@/components/BlueMindMediaPicker";
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
} from "@/services/chatService";
import { deleteChat, renameChat, shareChat } from "@/services/conversationActions";
import { generateImage, getImageUrl, uploadChatImage } from "@/services/imageService";
import {
  createSuggestedReminder,
  suggestReminder,
} from "@/services/reminderService";
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
const WEBSITE_FAVORITES_STORAGE_KEY = "bluemind_website_favorites";
const WEBSITE_RECENTS_STORAGE_KEY = "bluemind_website_recents";
const WEBSITE_PAGE_SIZE = 10;

const RESPONSE_MODES = {
  fast: {
    id: "fast",
    label: "Fast",
    labelKey: "responseModeFast",
    badge: "⚡",
    status: "Generating quick response...",
    statusKey: "responseModeFastStatus",
    uiDescription: "Fast and light",
    uiDescriptionKey: "responseModeFastDescription",
    description: "سريع وخفيف",
  },
  smart: {
    id: "smart",
    label: "Smart",
    labelKey: "responseModeSmart",
    badge: "🧠",
    status: "Analyzing request...",
    statusKey: "responseModeSmartStatus",
    uiDescription: "Balanced",
    uiDescriptionKey: "responseModeSmartDescription",
    description: "متوازن",
  },
  thinking: {
    id: "thinking",
    label: "Thinking",
    labelKey: "responseModeThinking",
    badge: "🔍",
    status: "Thinking deeply...",
    statusKey: "responseModeThinkingStatus",
    uiDescription: "Smarter and deeper",
    uiDescriptionKey: "responseModeThinkingDescription",
    description: "أذكى وأدق",
  },
};

function normalizeResponseModeId(value) {
  const aliases = {
    instant: "fast",
    default: "smart",
    balanced: "smart",
    deep_thinking: "thinking",
  };
  const mode = String(value || "smart").trim().toLowerCase();
  return RESPONSE_MODES[aliases[mode] || mode] ? aliases[mode] || mode : "smart";
}

function getResponseMode(value) {
  return RESPONSE_MODES[normalizeResponseModeId(value)] || RESPONSE_MODES.smart;
}

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
    thumbnail: createIdeaThumbnail("portrait", "#0F172A", "#475569", "#D8B4FE"),
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
    thumbnail: createIdeaThumbnail("research", "#193B68", "#2563EB", "#22D3EE"),
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
    thumbnail: createIdeaThumbnail("realistic-photo", "#334155", "#64748B", "#F8FAFC"),
  },
  {
    id: "cartoon",
    title: "Cartoon",
    category: "Illustration",
    description: "Make a friendly polished cartoon.",
    prompt: "Create a friendly cartoon character with expressive features, modern colors, clean outlines, and a polished app-style finish.",
    thumbnail: createIdeaThumbnail("cartoon", "#F97316", "#F59E0B", "#38BDF8"),
  },
  {
    id: "logo",
    title: "Logo Design",
    category: "Branding",
    description: "Explore a clean brand mark concept.",
    prompt: "Create a clean modern logo concept with a premium AI brand feeling, simple geometry, blue accent color, and strong scalability.",
    thumbnail: createIdeaThumbnail("logo", "#111827", "#193B68", "#E0F2FE"),
  },
  {
    id: "architecture",
    title: "Architecture",
    category: "Spaces",
    description: "Imagine a premium building or interior.",
    prompt: "Create a modern architectural concept with elegant structure, warm interior lighting, clean materials, dramatic scale, and magazine-quality composition.",
    thumbnail: createIdeaThumbnail("architecture", "#44403C", "#78716C", "#FDE68A"),
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
    thumbnail: createIdeaThumbnail("nature", "#14532D", "#16A34A", "#BAE6FD"),
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
  if (attachment.id) return getImageUrl(attachment.id);
  if (isAbsoluteUrl(attachment.url)) return attachment.url;
  return attachment.url || "";
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
            ? isDark ? "bg-white/10 text-white" : "bg-[#EEF2FF] text-[#193B68]"
            : isDark ? "text-[#BDBDBD] hover:bg-white/[0.08] hover:text-white" : "text-[#64748B] hover:bg-black/[0.05] hover:text-[#111827]"
        )}
        title={item.title || t("newChat")}
      >
        <MessageSquare className="h-[18px] w-[18px]" />
        <span className={cn("pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100", isDark ? "bg-[#2A2A2A] text-white" : "bg-white text-[#111827]")}>
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
          : isDark ? "border-transparent text-[#C7C7C7] hover:border-[#3A3A3A] hover:bg-[#2A2A2A] hover:text-white" : "border-transparent text-[#475569] hover:border-[#CBD5E1] hover:bg-white hover:text-[#0F172A]",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <button type="button" onClick={() => onOpen(item.conversationId)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" data-testid={`history-chat-${item.conversationId}`} title={item.title || t("newChat")}>
          <MessageSquare className={cn("h-[17px] w-[17px] flex-shrink-0", isActive && (isDark ? "text-white" : "text-[#193B68]"))} />
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
              className={cn("min-w-0 flex-1 rounded-md bg-transparent text-sm font-semibold outline-none", isDark ? "text-white" : "text-[#111827]")}
            />
          ) : (
            <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-5" style={getDirectionalStyle(item.title || "")}>
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
            isDark ? "text-[#aaa] hover:bg-[#333] hover:text-white" : "text-[#64748B] hover:bg-[#EEF2F7] hover:text-[#111827]",
          )}
          data-testid={`history-menu-${item.conversationId}`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {menuOpenId === item.conversationId && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => onMenuToggle(null)} />
          <div
            className={cn(
              "absolute right-1 top-9 z-30 w-36 overflow-hidden rounded-xl border py-1 shadow-lg",
              isDark ? "border-[#333] bg-[#222]" : "border-[#E5E7EB] bg-white",
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
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                isDark ? "text-[#ddd] hover:bg-[#2a2a2a]" : "text-[#374151] hover:bg-[#F9FAFB]",
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("renameChat")}
            </button>
            <button
              type="button"
              onClick={() => {
                onShare(item);
                onMenuToggle(null);
              }}
              className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm", isDark ? "text-[#ddd] hover:bg-[#2a2a2a]" : "text-[#374151] hover:bg-[#F9FAFB]")}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                isDark ? "text-red-300 hover:bg-red-950/30" : "text-red-500 hover:bg-red-50",
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("deleteChat")}
            </button>
          </div>
        </>
      )}

      {confirmDelete && (
        <div className={cn("mt-2 rounded-xl border p-2 text-xs", isDark ? "border-red-400/20 bg-red-950/20 text-red-100" : "border-red-200 bg-red-50 text-red-700")}>
          <p className="mb-2 font-semibold">{t("deleteChatShortConfirm")}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg px-2 py-1 hover:bg-black/5">{t("cancel")}</button>
            <button type="button" onClick={() => onDelete(item)} className="flex-1 rounded-lg bg-red-500 px-2 py-1 text-white">{t("delete")}</button>
          </div>
        </div>
      )}

      <p className={cn("ml-[27px] mt-1 truncate text-[10.5px] font-medium leading-4", isDark ? "text-[#8A8A8A]" : "text-[#7C8798]")}>
        {formatHistoryDate(item.lastMessageAt || item.updatedAt, language)}
      </p>
    </div>
  );
});

function Sidebar({
  isHistoryOpen,
  onToggleHistory,
  onNewChat,
  history,
  activeConversationId,
  onOpenConversation,
  onRenameConversation,
  onDeleteConversation,
}) {
  const navigate = useNavigate();
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
  }, [searchOpen, searchQuery]);

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

  const navItems = [
    {
      id: "dashboard",
      icon: Home,
      label: "Smart Hub",
      action: () => navigate("/dashboard"),
    },
    {
      id: "chat",
      icon: MessageSquare,
      label: t("chat"),
      action: () => {
        if (isHistoryOpen) {
          onNewChat();
          return;
        }
        setRecentsOpen((open) => !open);
      },
    },
    { id: "search", icon: Search, label: "Search", action: openSearchPanel },
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
      id: "scheman",
      icon: CalendarDays,
      label: t("scheman"),
      action: () => navigate("/scheman"),
    },
  ];
  const profileItem = {
    id: "profile",
    icon: UserCircle,
    label: t("profile"),
    action: () => navigate("/profile"),
  };

  return (
    <motion.aside
      animate={{
        x: 0,
        width: isHistoryOpen ? 328 : 84,
      }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "h-full flex flex-col overflow-visible flex-shrink-0",
        isDark ? "bg-[#1e1e1e]/96" : "bg-[#F7F8FA]/96",
      )}
      data-testid="sidebar"
    >
      <div
        className={cn(
          "flex items-center justify-between border-b p-4",
          isDark ? "border-[#333]" : "border-[#E5E7EB]",
        )}
      >
        {isHistoryOpen ? (
          <>
            <span className={cn("truncate text-xl font-semibold tracking-tight", isDark ? "text-white" : "text-[#111827]")}>
              {APP_NAME}
            </span>
            <button
              onClick={onToggleHistory}
              aria-label={t("collapseSidebar")}
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-200 cursor-pointer",
                isDark ? "text-[#D4D4D4] hover:bg-white/[0.08] hover:text-white" : "text-[#334155] hover:bg-black/[0.05] hover:text-[#0F172A]",
              )}
              data-testid="sidebar-toggle"
            >
              <PanelLeftClose className="h-5 w-5 stroke-[2.25]" />
            </button>
          </>
        ) : (
          <button
            onClick={onToggleHistory}
            aria-label={t("openSidebar")}
            className={cn(
              "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200",
              isDark ? "text-white hover:bg-white/[0.08]" : "text-[#111827] hover:bg-black/[0.05]",
            )}
            data-testid="sidebar-toggle"
          >
            <BrandLogo showName={false} logoClassName="h-9 w-9 transition-opacity duration-150 group-hover:opacity-0" />
            <PanelLeft className="absolute h-6 w-6 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            <span className={cn("pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100", isDark ? "bg-[#2A2A2A] text-white" : "bg-white text-[#111827]")}>
              Open sidebar
            </span>
          </button>
        )}
      </div>

      {isHistoryOpen && (
        <div className="px-3.5 pt-4">
          <button
            onClick={onNewChat}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3.5 transition-all duration-200 cursor-pointer",
              isDark
                ? "border-[#343434] bg-[#252525] text-white hover:border-[#4A4A4A] hover:bg-[#2D2D2D]"
                : "border-[#D6DEE9] bg-white text-[#0F172A] hover:border-[#B8C4D6] hover:bg-[#F8FAFC]",
            )}
            data-testid="new-chat-button"
          >
            <Plus className="w-5 h-5 flex-shrink-0 stroke-[2.35]" />
            <span className="min-w-0 truncate text-sm font-semibold">{t("newChat")}</span>
          </button>
        </div>
      )}

      {isHistoryOpen && (
        <div className="relative z-30 px-3.5 pt-3">
          {searchOpen && <div className="fixed inset-0 z-20" onClick={() => setSearchOpen(false)} />}
          <div className="relative z-30">
            <label
              className={cn(
                "flex h-12 w-full items-center gap-3 rounded-[18px] border px-4 transition-all duration-200",
                searchOpen
                  ? isDark ? "border-white/15 bg-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.24)]" : "border-[#B8C4D6] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.12)]"
                  : isDark ? "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.07]" : "border-[#DCE3EE] bg-white/80 hover:bg-white",
              )}
            >
              <Search className={cn("h-[18px] w-[18px] flex-shrink-0 stroke-[2.25]", isDark ? "text-[#D6D6D6]" : "text-[#64748B]")} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onClick={() => setSearchOpen(true)}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("searchConversations")}
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none",
                  isDark ? "text-white placeholder:text-[#8A8A8A]" : "text-[#0F172A] placeholder:text-[#94A3B8]",
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
                  className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors", isDark ? "text-[#BDBDBD] hover:bg-white/10 hover:text-white" : "text-[#64748B] hover:bg-[#EEF2F7] hover:text-[#0F172A]")}
                  aria-label={t("clearSearch")}
                >
                  <X className="h-4 w-4" />
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
                    isDark ? "border-white/10 bg-[#232323]/95 text-white" : "border-white/75 bg-white/95 text-[#111827]",
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className={cn("px-2.5 pb-2 pt-1.5 text-[11px] font-bold uppercase tracking-[0.13em]", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
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
                        className={cn("flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#F1F5F9]")}
                      >
                        <span className={cn("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl", isDark ? "bg-white/[0.07] text-[#DADADA]" : "bg-[#EEF2FF] text-[#193B68]")}>
                          <Search className="h-4 w-4 stroke-[2.25]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold leading-5">
                            <HighlightedMatch text={item.title || t("newChat")} query={searchQuery} />
                          </span>
                          <span className={cn("mt-0.5 block truncate text-xs font-medium leading-4", isDark ? "text-[#AFAFAF]" : "text-[#64748B]")}>
                            {formatHistoryDate(item.lastMessageAt || item.updatedAt, prefs.language)}
                          </span>
                        </span>
                      </button>
                    ))}
                    {isSearching && normalizedSearchQuery && (
                      <div className={cn("rounded-2xl px-3 py-3 text-sm font-medium", isDark ? "text-[#CFCFCF]" : "text-[#475569]")}>{t("searching")}</div>
                    )}
                    {!isSearching && normalizedSearchQuery && combinedSearchResults.length === 0 && (
                      <div className={cn("rounded-2xl px-3 py-3 text-sm font-medium", isDark ? "text-[#CFCFCF]" : "text-[#475569]")}>{t("noChatsFound")}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <nav className={cn("space-y-2 px-3.5 pt-4", !isHistoryOpen && "px-4")} data-testid="chat-sidebar-nav">
        {navItems.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={() => {
                item.action?.();
              }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer",
                isHistoryOpen ? "px-3.5 py-3" : "h-12 justify-center px-0 py-0",
                isDark
                  ? "text-[#E4E4E7] hover:bg-white/[0.08] hover:text-white"
                  : "text-[#1F2937] hover:bg-black/[0.05] hover:text-[#0F172A]",
              )}
              data-testid={`nav-${item.id}`}
              title={!isHistoryOpen ? item.label : undefined}
            >
              <item.icon className={cn("flex-shrink-0 stroke-[2.35]", isHistoryOpen ? "h-[21px] w-[21px]" : "h-[23px] w-[23px]")} />
              {isHistoryOpen && <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>}
              {!isHistoryOpen && (
                <span className={cn("pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100", isDark ? "bg-[#2A2A2A] text-white" : "bg-white text-[#111827]")}>
                  {item.label}
                </span>
              )}
            </button>
            {!isHistoryOpen && item.id === "chat" && recentsOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setRecentsOpen(false)} />
                <div className={cn("absolute left-full top-0 z-30 ml-3 w-[min(20rem,calc(100vw-6rem))] rounded-3xl border p-3 shadow-[0_24px_70px_rgba(15,23,42,0.25)] backdrop-blur-[18px]", isDark ? "border-white/10 bg-[#232323]/95 text-white" : "border-white/70 bg-white/95 text-[#111827]")}>
                  <p className={cn("mb-2 px-2 text-xs font-semibold uppercase tracking-[0.14em]", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{t("recents")}</p>
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
                        onShare={handleShareConversation}
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
                isDark ? "border-white/10 bg-[#232323]/95 text-white" : "border-white/70 bg-white/95 text-[#111827]",
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2.5", isDark ? "border-white/10 bg-white/[0.06]" : "border-[#E2E8F0] bg-[#F8FAFC]")}>
                <Search className="h-4 w-4 flex-shrink-0 opacity-75" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                  placeholder={t("searchChats")}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                  aria-label={t("closeSearch")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                <p className={cn("px-1 pb-2 text-xs font-semibold uppercase tracking-[0.12em]", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{searchPanelTitle}</p>
                {isSearching && (
                  <div className={cn("rounded-2xl px-3 py-4 text-sm font-medium", isDark ? "text-[#CFCFCF]" : "text-[#475569]")}>{t("searching")}</div>
                )}
                {!isSearching && normalizedSearchQuery && combinedSearchResults.length === 0 && (
                  <div className={cn("rounded-2xl px-3 py-4 text-sm font-medium", isDark ? "text-[#CFCFCF]" : "text-[#475569]")}>{t("noChatsFound")}</div>
                )}
                {combinedSearchResults.map((item) => (
                  <button
                    key={item.conversationId}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      onOpenConversation(item.conversationId);
                    }}
                    className={cn("flex w-full flex-col rounded-2xl px-3 py-2.5 text-left transition-colors", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#F1F5F9]")}
                  >
                    <span className="block max-w-full truncate text-sm font-semibold">
                      <HighlightedMatch text={item.title || "New conversation"} query={searchQuery} />
                    </span>
                    <span className={cn("mt-1 block max-w-full truncate text-xs font-medium leading-4", isDark ? "text-[#B8B8B8]" : "text-[#475569]")}>
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
            <div className={cn("flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-[0.12em]", isDark ? "text-[#A7A7A7]" : "text-[#475569]")}>
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
                    onShare={handleShareConversation}
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

      <div className={cn("pb-4", isHistoryOpen ? "px-3.5" : "px-4")}>
        <button
          type="button"
          onClick={() => {
            profileItem.action?.();
          }}
          className={cn(
            "group relative flex w-full items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer",
            isHistoryOpen ? "px-3.5 py-3" : "h-12 justify-center px-0 py-0",
            isDark
              ? "text-[#E4E4E7] hover:bg-white/[0.08] hover:text-white"
              : "text-[#1F2937] hover:bg-black/[0.05] hover:text-[#0F172A]",
          )}
          data-testid="nav-profile"
          title={!isHistoryOpen ? profileItem.label : undefined}
        >
          <profileItem.icon className={cn("flex-shrink-0 stroke-[2.35]", isHistoryOpen ? "h-[21px] w-[21px]" : "h-[23px] w-[23px]")} />
          {isHistoryOpen && <span className="min-w-0 truncate text-sm font-medium">{profileItem.label}</span>}
          {!isHistoryOpen && (
            <span className={cn("pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100", isDark ? "bg-[#2A2A2A] text-white" : "bg-white text-[#111827]")}>
              {profileItem.label}
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
        isDark ? "text-[#9CA3AF]" : "text-[#6B7280]",
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
              ? isDark ? "bg-white/10 text-white" : "bg-[#EEF2FF] text-[#193B68]"
              : isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-[#F3F4F6] hover:text-[#111827]",
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
          isDark ? "border-white/10 bg-[#202020]/95 text-white" : "border-[#E5E7EB] bg-white/95 text-[#111827]",
        )}
        onClick={(event) => event.stopPropagation()}
        data-testid={`dislike-feedback-${messageId}`}
      >
        <div className="px-2 pb-2 pt-1">
          <p className="text-sm font-semibold">{t("tellUsMore")}</p>
          <p className={cn("mt-1 text-xs", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>{t("feedbackHelps")}</p>
        </div>
        <div className="space-y-1">
          {DISLIKE_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onSelect(reason)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-[#F3F4F6]",
              )}
            >
              {t(reason)}
              <span className={cn("h-1.5 w-1.5 rounded-full", isDark ? "bg-white/30" : "bg-[#CBD5E1]")} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ChatImage({ attachment, isDark, onExpand }) {
  const [loaded, setLoaded] = useState(false);
  const src = resolveAttachmentPreviewUrl(attachment);

  return (
    <button
      type="button"
      onClick={() => onExpand?.({ src, name: attachment.name || attachment.prompt || "image" })}
      className={cn(
        "group relative block overflow-hidden rounded-3xl text-left shadow-sm transition-transform hover:scale-[1.01]",
        isDark ? "border border-white/10 bg-white/5" : "border border-[#E5E7EB] bg-white",
      )}
    >
      {!loaded && (
        <div className={cn("absolute inset-0 animate-pulse", isDark ? "bg-white/10" : "bg-[#EEF2F7]")} />
      )}
      <img
        src={src}
        alt={attachment.name || "attachment"}
        className="max-h-[360px] w-full max-w-sm object-cover"
        loading="lazy"
        onLoad={() => setLoaded(true)}
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

  if (!isUser && message.isStreaming && !message.content) {
    return <ThinkingIndicator responseMode={message.metadata?.responseMode || message.metadata?.mode || message.responseMode} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={cn("group flex w-full mb-9", isUser ? "justify-end" : "justify-start")}
      data-testid={`chat-message-${message.role}`}
    >
      <div className={cn("min-w-0", isUser ? "flex max-w-[min(720px,84vw)] flex-col items-end" : "w-full max-w-[min(820px,88vw)]")}>
        <div
          className={cn(
            "text-[16px] leading-[1.85] transition-colors",
            isUser
              ? "rounded-[24px] rounded-br-lg px-5 py-3.5 text-white shadow-sm"
              : isDark
                ? "text-[#F3F4F6]"
                : "text-[#1F2937]",
          )}
          style={isUser ? { backgroundColor: prefs.chatColor, ...directionStyle } : directionStyle}
        >
          {message.attachments?.length > 0 && (
            <div className="mb-4 grid max-w-sm grid-cols-1 gap-3">
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

          <MessageResponse message={message} previousUserContent={previousUserContent} />

          {!isUser && isLatestAi && message.isStreaming && (
            <span
              className="ml-0.5 inline-block h-5 w-0.5 animate-pulse align-[-0.15em]"
              style={{ backgroundColor: appColor }}
            />
          )}

          {message.suggestion && (
            <button
              onClick={() => onCreateSuggestion(message.suggestion)}
              className="mt-3 rounded-full bg-[#01D5DE] px-4 py-2 text-sm font-medium text-white hover:bg-[#14B2F5] transition-colors"
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

function AttachmentTray({ attachments, onRemove, isDark, isUploading }) {
  if (!attachments.length && !isUploading) return null;

  return (
    <div
      className={cn(
        "mb-2 flex max-w-full gap-2 overflow-x-auto rounded-[22px] border p-2 md:mb-3 md:flex-wrap md:gap-3",
        isDark ? "border-[#3a3a3a] bg-[#222]/90" : "border-[#E5E7EB] bg-white/90",
      )}
    >
      {attachments.map((attachment) => (
        <div key={attachment.id} className="group relative flex-shrink-0">
          <img
            src={resolveAttachmentPreviewUrl(attachment)}
            alt={attachment.name}
            className={cn(
              "h-16 w-16 rounded-[18px] object-cover shadow-sm transition-transform group-hover:scale-[1.02] md:h-20 md:w-20 md:rounded-2xl",
              isDark ? "border border-white/10" : "border border-[#E5E7EB]",
            )}
            loading="lazy"
          />
          <button
            onClick={() => onRemove(attachment.id)}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#111827] text-white shadow-sm transition-transform hover:scale-105"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="mt-1 max-w-16 truncate text-[10px] text-[#9CA3AF] md:max-w-20 md:text-[11px]">
            {attachment.name}
          </div>
        </div>
      ))}
      {isUploading && (
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-2xl border",
            isDark ? "border-white/10 bg-white/5" : "border-[#E5E7EB] bg-white",
          )}
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#9CA3AF]/30 border-t-[#193B68]" />
        </div>
      )}
    </div>
  );
}

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
  const [responseMode, setResponseMode] = useState(() => normalizeResponseModeId(localStorage.getItem(RESPONSE_MODE_STORAGE_KEY)));
  const [responseModeMenuOpen, setResponseModeMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeMode, setActiveMode] = useState("default");
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
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const writeImageInputRef = useRef(null);
  const writeCameraInputRef = useRef(null);
  const quickTemplatesRef = useRef(null);
  const websiteCategoryBarRef = useRef(null);
  const streamAbortRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const activeAiMessageRef = useRef(null);
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

  useEffect(() => {
    if (!attachmentMenuOpen) return undefined;
    setAttachmentMenuOpen(false);
    return undefined;
  }, [input, attachmentMenuOpen]);

  useEffect(() => () => {
    if (streamBufferRef.current.timer) {
      window.clearTimeout(streamBufferRef.current.timer);
    }
    streamAbortRef.current?.abort();
    speechRecognitionRef.current?.stop?.();
  }, []);

  useEffect(() => {
    localStorage.setItem(RESPONSE_MODE_STORAGE_KEY, responseMode);
  }, [responseMode]);

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
    }))
  );

  const refreshHistory = useCallback(async () => {
    const data = await listConversations();
    setHistory(Array.isArray(data?.items) ? data.items : []);
  }, []);

  const handleOpenConversation = async (id) => {
    if (!id || isAiTyping) return;

    setIsHistoryLoading(true);
    try {
      const data = await getConversation(id);
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
        await renameChat(conversation.conversationId, inlineTitle);
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
      await renameChat(renameTarget.conversationId, nextTitle);
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
      await deleteChat(conversation.conversationId);
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
      const isText = file.type === "text/plain" || extension === "txt";
      const isPdf = file.type === "application/pdf" || extension === "pdf";
      const isDocx = extension === "docx" || extension === "doc";
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
    }, 32);
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
    const selectedResponseMode = normalizeResponseModeId(options.responseMode || responseMode);
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

    if ((!currentInput && currentAttachments.length === 0 && !canStartFromContext) || isAiTyping) return;
    if (isListening) stopVoiceInput();

    const imageIds = currentAttachments.map((item) => item.id);
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: visibleInput || "Please analyze the attached image.",
      attachments: currentAttachments,
      metadata: {
        chatMode: mode,
        mode: selectedResponseMode,
        responseMode: selectedResponseMode,
        writeEditTask: mode === "write_edit" ? activeWriteTask : undefined,
      },
    };
    const aiMessageId = crypto.randomUUID();
    const abortController = new AbortController();

    setMessages((prev) => [
      ...prev,
      ...(!options.hideUserMessage ? [userMessage] : []),
      {
        id: aiMessageId,
        role: "ai",
        content: "",
        isStreaming: true,
        metadata: {
          chatMode: mode,
          mode: selectedResponseMode,
          responseMode: selectedResponseMode,
          requestContent: visibleInput,
        },
      },
    ]);
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

      await streamChatMessage({
        message: currentInput,
        imageIds,
        conversationId,
        mode: selectedResponseMode,
        metadata: {
          chatMode: mode,
          mode: selectedResponseMode,
          responseMode: selectedResponseMode,
          writeEditTask: mode === "write_edit" ? activeWriteTask : undefined,
          ...requestMetadata,
        },
        signal: abortController.signal,
        onReady: (payload) => {
          if (payload?.conversation?.conversationId) {
            setConversationId(payload.conversation.conversationId);
            setActiveConversationId(payload.conversation.conversationId);
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
            setHistory((prev) => {
              const conversation = {
                ...payload.conversation,
                updatedAt: new Date().toISOString(),
                lastMessageAt: new Date().toISOString(),
              };
              const withoutCurrent = prev.filter((item) => item.conversationId !== conversation.conversationId);
              return [conversation, ...withoutCurrent];
            });
            refreshHistory().catch(() => {});
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

          if (currentInput) {
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
      });
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
      streamAbortRef.current = null;
      activeAiMessageRef.current = null;
      stopRequestedRef.current = false;
    }
  }, [
    activeMode,
    attachments,
    activeWriteTask,
    conversationId,
    flushAiDelta,
    input,
    isAiTyping,
    isListening,
    queueAiDelta,
    refreshHistory,
    responseMode,
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
      responseMode: normalizeResponseModeId(previousUser.metadata?.mode || previousUser.metadata?.responseMode || responseMode),
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
          <h3 className={cn("text-[15px] font-semibold md:text-base", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{t("exploreImageIdeas")}</h3>
          <p className={cn("mt-0.5 text-xs md:mt-1 md:text-sm", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
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
                : "border-white/75 bg-white/80 text-[#111827] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
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
              <span className="absolute left-2 top-2 rounded-full bg-white/82 px-2 py-0.5 text-[10px] font-semibold text-[#193B68] shadow-sm backdrop-blur-md md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[11px]">
                {t(`imageIdea_${idea.id.replace(/-/g, "_")}_category`)}
              </span>
            </div>
            <div className="px-2 pb-2.5 pt-2 md:px-2.5 md:pb-3 md:pt-3">
              <span className="block text-[13px] font-semibold leading-4 md:text-[15px] md:leading-5">{t(`imageIdea_${idea.id.replace(/-/g, "_")}_title`)}</span>
              <span className={cn("mt-1 block text-xs leading-4 md:mt-1.5 md:text-sm md:leading-5", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
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
            : "border-white/75 bg-white/82 text-[#111827] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
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
              isDark ? "border-white/[0.08] bg-white/[0.08]" : "border-[#E5E7EB] bg-white"
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
                : isDark ? "border-white/[0.08] bg-white/[0.06] text-[#A7A7A7] hover:text-amber-300" : "border-black/[0.06] bg-white/70 text-[#64748B] hover:text-amber-500"
            )}
            aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
          >
            <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </button>
        </div>
        <div className="relative z-10 mb-2 flex flex-wrap items-center gap-2">
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isDark ? "bg-white/[0.08] text-[#D7D7D7]" : "bg-[#EEF2FF] text-[#193B68]"
          )}>
            {site.category}
          </span>
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isDark ? "bg-white/[0.06] text-[#B8B8B8]" : "bg-[#F8FAFC] text-[#64748B]"
          )}>
            {site.countryBadge}
          </span>
        </div>
        <span className="relative z-10 block text-[16px] font-semibold leading-5">{site.name}</span>
        <span className={cn("relative z-10 mt-2 block flex-1 text-sm leading-5", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
          {site.description}
        </span>
        <span className={cn("relative z-10 mt-4 block truncate text-xs font-semibold", isDark ? "text-[#8FB9FF]" : "text-[#193B68]")}>
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
          <h3 className={cn("mb-3 text-base font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{title}</h3>
          <div className={cn("rounded-[28px] border px-5 py-6 text-sm", isDark ? "border-white/[0.08] bg-white/[0.05] text-[#A7A7A7]" : "border-[#E5E7EB] bg-white/70 text-[#64748B]")}>
            {emptyText}
          </div>
        </section>
      );
    }

    return (
      <section className="mt-8">
        <h3 className={cn("mb-3 px-1 text-base font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{title}</h3>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-4 sm:overflow-x-auto sm:pb-2 sm:pr-2 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
          {sites.map((site, index) => renderWebsiteCard(site, index, true))}
        </div>
      </section>
    );
  };

  const renderSearchArtwork = (item, index = 0) => {
    const artwork = item.artwork || {};
    const from = artwork.from || "#193B68";
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
          : "border-white/75 bg-white/82 text-[#111827] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
      )}
    >
      {renderSearchArtwork(category, index)}
      <div className="px-2.5 pb-3 pt-3">
        <span className="block text-[15px] font-semibold leading-5">{category.title}</span>
        <span className={cn("mt-1.5 line-clamp-2 block text-sm leading-5", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
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
          : "border-white/75 bg-white/82 text-[#111827] shadow-slate-200/70"
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
          isDark ? "border-white/[0.08] bg-[#202020] text-white" : "border-[#E5E7EB] bg-white text-[#111827]"
        )}>
          <button
            type="button"
            onClick={() => {
              setExpandedSearchItemId((current) => current === item.id ? null : item.id);
              setOpenSearchMenuItemId(null);
            }}
            className={cn("h-10 w-full rounded-xl px-3 text-left text-xs font-bold", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#EEF2F7]")}
          >
            Learn More
          </button>
          <button
            type="button"
            onClick={() => copySearchItemName(item)}
            className={cn("h-10 w-full rounded-xl px-3 text-left text-xs font-bold", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#EEF2F7]")}
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
            className={cn("h-10 w-full rounded-xl px-3 text-left text-xs font-bold", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#EEF2F7]")}
          >
            Ask AI
          </button>
        </div>
      )}

      <div className="px-2.5 pb-3 pt-3">
        <span className="block text-[15px] font-semibold leading-5">{item.title}</span>
        <span className={cn("mt-1.5 line-clamp-2 block text-sm leading-5", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
          {item.description}
        </span>
        {expandedSearchItemId === item.id && (
          <div className={cn("mt-3 rounded-2xl px-3 py-2 text-xs font-semibold leading-5", isDark ? "bg-white/[0.07] text-[#D7D7D7]" : "bg-[#EEF2F7] text-[#475569]")}>
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
            <h3 className={cn("text-lg font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>
              {activeCategory?.title || "Search"}
            </h3>
            <p className={cn("mt-1 max-w-2xl text-sm leading-6", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
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
                isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[#193B68] hover:bg-white"
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
              <p className={cn("text-sm font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>Can&apos;t find what you&apos;re looking for?</p>
              <button
                type="button"
                onClick={() => openSearchAskConfirm({
                  category: activeCategory,
                  intent: "item_not_found",
                })}
                className="mt-3 h-11 rounded-2xl bg-[#193B68] px-5 text-sm font-bold text-white transition-opacity hover:opacity-95"
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
              <h3 className={cn("text-lg font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{t("discoverWebsites")}</h3>
              <p className={cn("mt-1 text-sm", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
                {t("discoverWebsitesSubtitle")}
              </p>
            </div>
            <label
              className={cn(
                "flex h-12 w-full items-center gap-2 rounded-full border px-4 transition-colors lg:w-96",
                isDark
                  ? "border-white/[0.08] bg-white/[0.06] text-white focus-within:border-white/[0.18]"
                  : "border-black/[0.06] bg-white/85 text-[#111827] shadow-sm shadow-slate-200/60 focus-within:border-[#CBD5E1]"
              )}
            >
              <Search className={cn("h-4 w-4 flex-shrink-0", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")} />
              <input
                type="search"
                value={websiteSearchQuery}
                onChange={(event) => setWebsiteSearchQuery(event.target.value)}
                placeholder={t("searchForWebsite")}
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-sm font-medium outline-none",
                  isDark ? "placeholder:text-[#8A8A8A]" : "placeholder:text-[#94A3B8]"
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
                isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[#193B68] hover:bg-white"
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
                        ? "border-transparent bg-[#193B68] text-white shadow-sm"
                        : isDark ? "border-white/[0.08] bg-white/[0.05] text-[#D7D7D7] hover:bg-white/[0.09]" : "border-black/[0.05] bg-white/75 text-[#475569] hover:bg-white"
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
                isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[#193B68] hover:bg-white"
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
                <h3 className={cn("text-base font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>
                  {normalizedQuery ? t("searchResults") : t("categoryWebsites", { category: activeWebsiteCategory })}
                </h3>
                <p className={cn("mt-1 text-sm", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
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
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[#111827] hover:bg-white"
                  )}
                  aria-label={t("previousWebsitePage")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className={cn("min-w-[86px] text-center text-sm font-semibold", isDark ? "text-[#D7D7D7]" : "text-[#475569]")}>
                  {t("pageOf", { current: safePage + 1, total: pageCount })}
                </span>
                <button
                  type="button"
                  onClick={() => setWebsitePage((page) => Math.min(pageCount - 1, page + 1))}
                  disabled={safePage >= pageCount - 1}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-black/[0.06] bg-white/80 text-[#111827] hover:bg-white"
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
              isDark ? "border-white/[0.1] bg-[#202020] text-white" : "border-white bg-white text-[#111827]"
            )}
          >
            <button
              type="button"
              onClick={() => setSelectedWebsite(null)}
              className={cn(
                "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                isDark ? "bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-[#F1F5F9] text-[#111827] hover:bg-[#E2E8F0]"
              )}
              aria-label={t("closeWebsiteDetails")}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4 pr-12">
              <div className={cn("flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[24px] border", isDark ? "border-white/[0.08] bg-white/[0.08]" : "border-[#E5E7EB] bg-[#F8FAFC]")}>
                <img src={selectedWebsite.logo} alt={`${selectedWebsite.name} logo`} className="h-12 w-12 rounded-xl object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight">{selectedWebsite.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", isDark ? "bg-white/[0.08] text-[#D7D7D7]" : "bg-[#EEF2FF] text-[#193B68]")}>
                    {selectedWebsite.category}
                  </span>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", isDark ? "bg-white/[0.06] text-[#B8B8B8]" : "bg-[#F8FAFC] text-[#64748B]")}>
                    {selectedWebsite.countryBadge}
                  </span>
                </div>
              </div>
            </div>

            <p className={cn("mt-5 text-sm leading-6", isDark ? "text-[#C7C7C7]" : "text-[#475569]")}>
              {selectedWebsite.description}
            </p>

            <div className={cn("mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold", isDark ? "border-white/[0.08] bg-white/[0.05] text-[#8FB9FF]" : "border-[#E5E7EB] bg-[#F8FAFC] text-[#193B68]")}>
              {selectedWebsite.url}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <a
                href={selectedWebsite.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#193B68] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-95"
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
                    : isDark ? "border-white/[0.08] bg-white/[0.06] text-[#D7D7D7] hover:bg-white/[0.1]" : "border-[#E5E7EB] bg-white text-[#475569] hover:bg-[#F8FAFC]"
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
                  isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[#E5E7EB] bg-[#F8FAFC] text-[#111827] hover:bg-white"
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
              <h3 className={cn("text-lg font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{t("productivityWorkspace")}</h3>
              <p className={cn("mt-1 text-sm", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
                {t("productivityWorkspaceSubtitle")}
              </p>
            </div>
            <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#193B68] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-95">
              <FileText className="h-4 w-4" />
              {t("uploadFiles")}
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/png,image/jpeg,image/webp"
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
                    isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-[#E5E7EB] bg-white/80"
                  )}
                >
                  {file.type === "image" && file.previewUrl ? (
                    <img src={file.previewUrl} alt={file.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", isDark ? "bg-white/[0.08]" : "bg-[#EEF2FF]")}>
                      <FileText className={cn("h-5 w-5", isDark ? "text-[#D7D7D7]" : "text-[#193B68]")} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-[#111827]")}>{file.name}</p>
                    <p className={cn("text-xs", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{file.type.toUpperCase()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWriteFiles((files) => files.filter((item) => item.id !== file.id))}
                    className={cn("flex h-8 w-8 items-center justify-center rounded-full", isDark ? "hover:bg-white/[0.08]" : "hover:bg-[#F1F5F9]")}
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
              <h3 className={cn("text-base font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{t("quickTemplates")}</h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollQuickTemplates(-1)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors",
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[#E5E7EB] bg-white text-[#193B68] hover:bg-[#F8FAFC]",
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
                    isDark ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[#E5E7EB] bg-white text-[#193B68] hover:bg-[#F8FAFC]",
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
                <motion.button
                  key={title}
                  type="button"
                  onClick={() => handleWriteToolSelect(template)}
                  data-quick-template-card
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.14) }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.985 }}
                  className={cn(
                    "relative min-h-[170px] min-w-[calc(50%-0.375rem)] snap-start overflow-hidden rounded-[26px] border p-4 text-left shadow-sm transition-colors sm:min-w-[240px] md:min-w-[250px]",
                    isDark
                      ? "border-white/[0.08] bg-white/[0.055] text-white hover:bg-white/[0.09]"
                      : "border-white/80 bg-white/90 text-[#111827] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                  )}
                >
                  <span className={cn("absolute -right-6 -top-5 flex h-28 w-28 items-center justify-center rounded-[32px]", isDark ? "bg-white/[0.055] text-white/10" : "bg-[#EEF2FF] text-[#193B68]/12")}>
                    <Icon className="h-16 w-16 stroke-[1.65]" />
                  </span>
                  <span className={cn("relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.08] text-[#D7D7D7]" : "bg-[#EEF2FF] text-[#193B68]")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="relative z-10 block text-[15px] font-bold leading-5">{title}</span>
                  <span className={cn("relative z-10 mt-2 block text-xs font-medium leading-5", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
                    {description}
                  </span>
                </motion.button>
                );
              })}
            </div>
          </section>

          <section className="mb-7">
            <h3 className={cn("mb-3 px-1 text-base font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{t("smartSuggestions")}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {smartSuggestions.map((template, index) => {
                const { title, icon: Icon } = template;
                return (
                <motion.button
                  key={title}
                  type="button"
                  onClick={() => handleWriteUploadAction(template)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.14) }}
                  whileHover={{ y: -4 }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    isDark ? "border-white/[0.08] bg-white/[0.05] text-white hover:bg-white/[0.09]" : "border-white/75 bg-white/82 text-[#111827] hover:bg-white"
                  )}
                >
                  <Icon className={cn("mb-3 h-5 w-5", isDark ? "text-[#D7D7D7]" : "text-[#193B68]")} />
                  <span className="block text-sm font-semibold">{t(uiTextKey("writeUploadAction", title, "title"))}</span>
                  <span className={cn("mt-1 block text-xs leading-5", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
                    {writeFiles.length ? t("suggestedFromUploadedFiles") : t("uploadFileForSmarterContext")}
                  </span>
                </motion.button>
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
                    <SectionIcon className={cn("h-5 w-5", isDark ? "text-[#D7D7D7]" : "text-[#193B68]")} />
                    <h3 className={cn("text-base font-semibold", isDark ? "text-[#F3F4F6]" : "text-[#111827]")}>{t(uiTextKey("writeSection", section.title))}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {section.items.map((template, index) => {
                      const { title, description } = template;
                      return (
                      <motion.button
                        key={`${section.title}-${title}-${index}`}
                        type="button"
                        onClick={() => handleWriteToolSelect(template)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.018, 0.12) }}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          "group min-h-[150px] rounded-[28px] border p-4 text-left shadow-sm transition-colors duration-200",
                          isDark
                            ? "border-white/[0.08] bg-white/[0.06] text-white hover:border-white/[0.16] hover:bg-white/[0.1]"
                            : "border-white/75 bg-white/82 text-[#111827] shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                        )}
                      >
                        <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-[1.04]", isDark ? "bg-white/[0.08]" : "bg-[#EEF2FF]")}>
                          <SectionIcon className={cn("h-5 w-5", isDark ? "text-[#D7D7D7]" : "text-[#193B68]")} />
                        </div>
                        <span className="block text-[15px] font-semibold leading-5">{t(uiTextKey("writeTool", title, "title"))}</span>
                        <span className={cn("mt-2 block text-sm leading-5", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
                          {t(uiTextKey("writeTool", title, "description"))}
                        </span>
                      </motion.button>
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
              ? isDark ? "bg-white/[0.075] text-white" : "bg-[#193B68]/[0.075] text-[#193B68]"
              : isDark ? "text-[#D4D4D4] hover:bg-white/[0.045] hover:text-white" : "text-[#4B5563] hover:bg-[#193B68]/[0.045] hover:text-[#111827]"
          )}
        >
          <tool.icon className="h-[15px] w-[15px] flex-shrink-0 stroke-[2.05]" />
          <span className="whitespace-nowrap">{t(tool.labelKey)}</span>
        </button>
      ))}
    </div>
  );

  const renderResponseModeSelector = () => {
    const selectedMode = getResponseMode(responseMode);

    return (
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setResponseModeMenuOpen((open) => !open)}
          className={cn(
            "inline-flex h-[38px] min-w-[118px] items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold backdrop-blur-[10px] transition-colors duration-200",
            isDark ? "border-white/[0.08] bg-white/[0.06] text-[#F3F4F6] hover:bg-white/[0.1]" : "border-black/[0.05] bg-white/50 text-[#193B68] hover:bg-white/75"
          )}
          data-testid="response-mode-selector"
        >
          <span>{t(selectedMode.labelKey)}</span>
          <ChevronDown className="h-4 w-4 stroke-[2.1]" />
        </button>
        <AnimatePresence>
          {responseModeMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setResponseModeMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className={cn(
                  "absolute left-0 top-[calc(100%+8px)] z-40 w-60 overflow-hidden rounded-2xl border p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-[20px]",
                  isDark ? "border-white/[0.08] bg-[#242424]/92 text-white" : "border-black/[0.06] bg-white/90 text-[#111827]"
                )}
              >
                {Object.values(RESPONSE_MODES).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setResponseMode(normalizeResponseModeId(mode.id));
                      setResponseModeMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-colors duration-200",
                      responseMode === mode.id
                        ? isDark ? "bg-white/[0.08] text-white" : "bg-[#F8FAFC] text-[#111827]"
                        : isDark ? "text-[#DADADA] hover:bg-white/[0.055]" : "text-[#334155] hover:bg-[#F8FAFC]"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold leading-5">{t(mode.labelKey)}</span>
                      <span className={cn("mt-1 block text-xs font-medium", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>{t(mode.uiDescriptionKey)}</span>
                    </span>
                    {responseMode === mode.id && <Check className="h-[18px] w-[18px] flex-shrink-0 stroke-[2.1]" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderInput = (testSuffix = "") => {
    const usesLargeComposer = ["create_image", "web_search", "write_edit"].includes(activeMode) && !testSuffix;
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
      <BlueMindMediaPicker
        open={attachmentMenuOpen}
        onClose={() => setAttachmentMenuOpen(false)}
        isDark={isDark}
        variant="desktop"
        selectedImages={attachments}
        onToggleImage={(item) => removeAttachment(item.id)}
        onCamera={() => {
          setAttachmentMenuOpen(false);
          cameraInputRef.current?.click();
        }}
        onAllPhotos={() => {
          setAttachmentMenuOpen(false);
          imageInputRef.current?.click();
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
              isDark ? "border-white/10 bg-[#181818]/95 text-white" : "border-black/10 bg-white/90 text-[#111827]",
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{pendingWriteTemplate.title}</p>
                <p className={cn("mt-1 text-xs font-medium", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
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
                    isDark ? "bg-white/[0.07] hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#193B68] hover:bg-[#E2E8F0]",
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
      <div className="chat-composer-shell">
        <div className="chat-composer-row w-full">
          <UnifiedComposer
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onInput={(event) => {
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, usesLargeComposer ? 220 : 160)}px`;
            }}
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
            variant="desktop"
            minRows={usesLargeComposer ? 3 : 1}
            maxTextHeight={usesLargeComposer ? 220 : 160}
            inputDirectionStyle={inputDirectionStyle}
            actionMenu={actionMenu}
            pendingPanel={pendingPanel}
            testId={testSuffix ? `chat-input-${testSuffix}` : "chat-input"}
          />
        </div>
      </div>
    );

    return (
    <div className="chat-composer-shell">
      <AttachmentTray
        attachments={attachments}
        onRemove={removeAttachment}
        isDark={isDark}
        isUploading={isUploading}
      />
      <div className="chat-composer-row w-full">
      <div
        className={cn(
          "relative flex max-w-full flex-1 border shadow-sm transition-all duration-200 ease-out",
          usesLargeComposer
            ? "min-h-[132px] items-end gap-3 rounded-[34px] px-4 py-4 sm:px-6 sm:py-5"
            : "min-h-[62px] items-center gap-3 rounded-[31px] px-4 py-2.5 sm:gap-3.5 sm:px-5",
          isDark
            ? "border-[#333] bg-[#252525] focus-within:bg-[#272727] focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
            : "border-[#E5E7EB] bg-white focus-within:border-[#D6DEE9] focus-within:shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
        )}
      >
        <button
          type="button"
          onClick={() => setAttachmentMenuOpen((open) => !open)}
          disabled={isUploading}
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 cursor-pointer",
            isDark
              ? "text-[#D4D4D4] hover:bg-[#333] hover:text-white"
              : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]",
          )}
        >
          <Plus className="h-[23px] w-[23px] stroke-[2.1]" />
        </button>
        <AnimatePresence>
          {attachmentMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setAttachmentMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className={cn(
                  "absolute bottom-full left-0 z-40 mb-3 max-h-[min(420px,70vh)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border p-2.5 shadow-2xl backdrop-blur-2xl",
                  isDark ? "border-white/10 bg-[#141414]/96 text-white" : "border-black/10 bg-white/96 text-[#111827]",
                )}
              >
                {[
                  {
                    label: t("createImage"),
                    icon: Palette,
                    mode: "create_image",
                    action: () => setActiveMode("create_image"),
                  },
                  {
                    label: t("writeEdit"),
                    icon: Edit3,
                    mode: "write_edit",
                    action: () => setActiveMode("write_edit"),
                  },
                  {
                    label: t("search"),
                    icon: Search,
                    mode: "web_search",
                    action: () => setActiveMode("web_search"),
                  },
                  { divider: true, label: "divider" },
                  {
                    label: t("uploadImage"),
                    icon: ImageIcon,
                    action: () => imageInputRef.current?.click(),
                  },
                  {
                    label: t("uploadFile"),
                    icon: File,
                    action: () => fileInputRef.current?.click(),
                  },
                  {
                    label: t("uploadPdf"),
                    icon: FileText,
                    action: () => pdfInputRef.current?.click(),
                  },
                ].map((item) => item.divider ? (
                  <div key={item.label} className={cn("my-1 h-px", isDark ? "bg-white/10" : "bg-slate-200")} />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setAttachmentMenuOpen(false);
                      item.action();
                    }}
                    className={cn(
                      "flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition-all duration-200 hover:translate-x-0.5",
                      item.mode === activeMode
                        ? isDark ? "bg-white/12 text-white" : "bg-[#EEF2FF] text-[#193B68]"
                        : isDark ? "text-[#e5e5e5] hover:bg-white/[0.08]" : "text-[#111827] hover:bg-[#F8FAFC]",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", isDark ? "bg-white/[0.07]" : "bg-[#EEF2FF]")}>
                      <item.icon className="h-5 w-5 stroke-[2.1]" />
                    </span>
                    {item.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <div className="min-w-0 flex-1">
          <AnimatePresence>
            {writeAttachmentChoiceOpen && pendingWriteTemplate && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                className={cn(
                  "mb-3 max-w-[420px] rounded-3xl border p-3 shadow-xl backdrop-blur-2xl",
                  isDark ? "border-white/10 bg-[#181818]/95 text-white" : "border-black/10 bg-white/90 text-[#111827]",
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{pendingWriteTemplate.title}</p>
                    <p className={cn("mt-1 text-xs font-medium", isDark ? "text-[#A7A7A7]" : "text-[#64748B]")}>
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
                        isDark ? "bg-white/[0.07] hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#193B68] hover:bg-[#E2E8F0]",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {activeMode !== "default" && (
            activeMode === "web_search" ? (
              <div
                className={cn(
                  "group mb-2 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-colors duration-200",
                  isDark
                    ? "border-white/[0.1] bg-white/[0.1] text-white"
                    : "border-[#CBD5E1] bg-white/85 text-[#0F172A]",
                )}
              >
                <Globe2 className={cn("h-4 w-4 flex-shrink-0 stroke-[2.1]", isDark ? "text-[#E5E7EB]" : "text-[#334155]")} />
                <span className="truncate">{t(CHAT_MODES.web_search.labelKey)}</span>
                <button
                  type="button"
                  onClick={() => setActiveMode("default")}
                  className={cn(
                    "ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full opacity-0 transition-all duration-150 group-hover:opacity-100",
                    isDark ? "text-[#D1D5DB] hover:bg-white/[0.12] hover:text-white" : "text-[#475569] hover:bg-black/[0.06] hover:text-[#0F172A]",
                  )}
                  aria-label={t("removeWebSearch")}
                >
                  <X className="h-3.5 w-3.5 stroke-[2.2]" />
                </button>
              </div>
            ) : activeMode === "write_edit" && activeWriteTask ? (
              <div className="mb-2 space-y-2">
                <button
                  type="button"
                  onClick={clearWriteTask}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                    isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-[#EEF2FF] text-[#193B68] hover:bg-[#E0E7FF]",
                  )}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span className="truncate">{t("writeEdit")}</span>
                  <X className="h-3 w-3 opacity-70" />
                </button>
                {writeFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {writeFiles.map((file) => (
                      <span
                        key={file.id}
                        className={cn(
                          "inline-flex max-w-full items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-xs font-semibold",
                          isDark ? "border-white/10 bg-white/[0.07] text-white" : "border-[#E5E7EB] bg-white/85 text-[#111827]",
                        )}
                      >
                        {file.type === "image" && file.previewUrl ? (
                          <img src={file.previewUrl} alt="" className="h-6 w-6 rounded-lg object-cover" />
                        ) : (
                          <FileText className={cn("h-4 w-4", isDark ? "text-[#D7D7D7]" : "text-[#193B68]")} />
                        )}
                        <span className="truncate">{getWriteEditAttachmentLabel(file)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveMode("default")}
                className={cn(
                  "mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-[#EEF2FF] text-[#193B68] hover:bg-[#E0E7FF]",
                )}
              >
                {(() => {
                  const mode = CHAT_MODES[activeMode] || CHAT_MODES.default;
                  const ModeIcon = mode.icon;
                  return (
                    <>
                      <ModeIcon className="h-3.5 w-3.5" />
                      <span className="truncate">{t(mode.labelKey)}</span>
                      <X className="h-3 w-3 opacity-70" />
                    </>
                  );
                })()}
              </button>
            )
          )}
          <textarea
          value={input}
          rows={usesLargeComposer ? 3 : 1}
          onChange={(e) => setInput(e.target.value)}
          onInput={(event) => {
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, usesLargeComposer ? 220 : 160)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isUploading
              ? t("uploadingImage")
              : activeMode === "create_image"
                ? t("describeOrEditImage")
                : activeMode === "web_search"
                  ? t("searchWebOrChooseWebsite")
                  : activeMode === "write_edit"
                    ? t("writePasteOrChooseTool")
                  : t("askAnything")
          }
          className={cn(
            "block w-full resize-none bg-transparent font-medium outline-none",
            usesLargeComposer
              ? "max-h-[220px] min-h-[92px] text-[16px] leading-7"
              : "max-h-40 min-h-8 text-[17px] leading-8",
            isDark
              ? "text-white placeholder:text-[#A7A7A7]/80"
              : "text-[#111827] placeholder:text-[#64748B]/85",
          )}
          style={{ ...inputDirectionStyle, letterSpacing: "-0.01em", caretColor: appColor }}
          data-testid={testSuffix ? `chat-input-${testSuffix}` : "chat-input"}
          />
        </div>
        <button
          type="button"
          onClick={startVoiceInput}
          className={cn(
            "flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
            isListening
              ? "text-white"
              : isDark
                ? "border-[#333] bg-[#2a2a2a] text-[#D4D4D4] hover:bg-[#333] hover:text-white"
                : "border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]",
          )}
          style={isListening ? { backgroundColor: appColor, borderColor: "rgba(255,255,255,0.16)" } : undefined}
          aria-label={isListening ? t("stopVoiceInput") : t("startVoiceInput")}
        >
          {isListening ? (
            <span className="relative flex h-[19px] w-[19px] items-center justify-center">
              <Mic className="h-[18px] w-[18px] stroke-[2.1]" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-white" />
            </span>
          ) : (
            <Mic className="h-[19px] w-[19px] stroke-[2.1]" />
          )}
        </button>
        <button
          onClick={isAiTyping ? handleStopStreaming : isListening ? stopVoiceInput : handleSend}
          disabled={!isAiTyping && !isListening && (!input.trim() && attachments.length === 0)}
          className={cn(
            "send-btn flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ease-out",
            isAiTyping || isListening
              ? "text-white"
            : (input.trim() || attachments.length > 0)
              ? "text-white hover:opacity-95"
              : isDark
                ? "border-transparent bg-[#4B5563] text-white cursor-not-allowed"
                : "border-transparent bg-[#9CA3AF] text-white cursor-not-allowed",
          )}
          style={
            isAiTyping || isListening || input.trim() || attachments.length > 0
              ? {
                  backgroundColor: appColor,
                  borderColor: "rgba(255,255,255,0.16)",
                }
              : {}
          }
          data-testid={
            testSuffix ? `chat-send-button-${testSuffix}` : "chat-send-button"
          }
          aria-label={isAiTyping || isListening ? t("stopGenerating") : t("sendMessage")}
        >
          {isAiTyping || isListening ? (
            <Square className="h-[14px] w-[14px] fill-current text-white" />
          ) : (
            <ArrowUp className="h-[24px] w-[24px] scale-y-[1.08] stroke-[2.2] text-white" />
          )}
        </button>
      </div>
      </div>
    </div>
    );
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className={cn("h-screen flex overflow-hidden", isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]")}
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
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/png,image/jpeg,image/webp"
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
                isDark ? "border-[#333] bg-[#222]" : "border-[#E5E7EB] bg-white",
              )}
              data-testid="rename-chat-modal"
            >
              <h2 className={cn("mb-4 text-base font-semibold", isDark ? "text-white" : "text-[#111827]")}>
                {t("renameChat")}
              </h2>
              <input
                value={renameTitle}
                onChange={(event) => setRenameTitle(event.target.value.slice(0, 120))}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-sm outline-none",
                  isDark ? "border-[#333] bg-[#1a1a1a] text-white placeholder-[#777]" : "border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF]",
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
                    isDark ? "border-[#333] text-[#ddd] hover:bg-[#2a2a2a]" : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]",
                  )}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!renameTitle.trim()}
                  className="flex-1 rounded-xl bg-[#193B68] py-3 text-sm font-medium text-white disabled:opacity-50"
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
                className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111827] shadow-lg"
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
                isDark ? "border-white/[0.1] bg-[#202020] text-white" : "border-white bg-white text-[#111827]"
              )}
            >
              <h3 className="text-base font-bold tracking-tight">Ask AI?</h3>
              <p className={cn("mt-2 text-sm font-medium leading-6", isDark ? "text-[#CFCFCF]" : "text-[#64748B]")}>
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
                    isDark ? "bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-[#EEF2F7] text-[#111827] hover:bg-[#E2E8F0]"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void continueSearchWithAi()}
                  className="h-11 rounded-2xl bg-[#193B68] text-sm font-bold text-white hover:opacity-95"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderWebsiteDetails()}

      <div className="h-full flex-shrink-0">
        <Sidebar
          isHistoryOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((value) => !value)}
          onNewChat={handleNewChat}
          history={history}
          activeConversationId={activeConversationId}
          onOpenConversation={handleOpenConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      <div className="relative flex-1 flex flex-col h-full min-w-0">
        <header
          className={cn(
            "sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3.5 sm:px-6",
            isDark ? "border-[#333] bg-[#222]" : "border-[#E5E7EB] bg-white",
          )}
        >
          <div className="flex items-center gap-3">
            {renderResponseModeSelector()}
          </div>
          <button
            onClick={handleNewChat}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
              isDark
                ? "text-[#999] hover:text-white hover:bg-[#333]"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]",
            )}
            data-testid="header-new-chat"
          >
            <Plus className="w-5 h-5" />
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
                      isDark ? "text-white" : "text-[#111827]",
                    )}
                  />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("text-center", activeMode === "create_image" || activeMode === "web_search" || activeMode === "write_edit" ? "mb-6" : "mb-7")}
                >
                  <h2 className={cn("mb-2 text-2xl font-semibold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-[#111827]")}>
                    {activeMode === "create_image" ? t("whatShouldWeCreate") : activeMode === "web_search" ? t("whereShouldWeSearch") : activeMode === "write_edit" ? t("whatShouldWeProduce") : t("readyWhenYouAre")}
                  </h2>
                  <p className={cn("text-sm", isDark ? "text-[#888]" : "text-[#9CA3AF]")}>
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
              isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]",
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
                isDark ? "border-white/[0.12] bg-[#242424]/90 text-white hover:bg-[#2E2E2E]" : "border-black/[0.06] bg-white/90 text-[#193B68] hover:bg-white"
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
