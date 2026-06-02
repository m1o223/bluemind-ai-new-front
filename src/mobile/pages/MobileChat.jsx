import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUp,
  Bell,
  BookOpen,
  Brain,
  Camera,
  ChevronDown,
  Check,
  Clock3,
  Clipboard,
  FileText,
  Image,
  Menu,
  MoreVertical,
  MessageSquare,
  Mic,
  PenLine,
  Pencil,
  Plus,
  Edit3,
  RotateCcw,
  Search,
  Share2,
  Square,
  ThumbsDown,
  ThumbsUp,
  UserCircle,
  X,
} from "lucide-react";

import BrandLogo, { APP_NAME } from "@/components/BrandLogo";
import RotatingChatSuggestion from "@/components/RotatingChatSuggestion";
import { useApp } from "@/context/AppContext";
import {
  buildWriteEditMessage,
  createWriteEditTask,
  getWriteEditAttachmentLabel,
  getWriteEditTemplateById,
  WRITE_EDIT_SECTIONS,
  WRITE_EDIT_UPLOAD_OPTIONS,
} from "@/data/writeEditTemplates";
import { getApiErrorMessage } from "@/services/api";
import { listConversations, searchConversations, streamChatMessage } from "@/services/chatService";
import { analyzeImage, generateImage, getImageUrl, uploadChatImage } from "@/services/imageService";

const AI_RESPONSE_MODES = ["fast", "smart", "thinking"];

const MAX_IMAGE_ATTACHMENTS = 6;

const WRITE_EDIT_ARTWORK_PALETTES = [
  { from: "#3767D8", via: "#75A7FF", to: "#D8E8FF" },
  { from: "#193B68", via: "#3D7EC8", to: "#B9D7F6" },
  { from: "#6B5DD3", via: "#9C8CFF", to: "#E6DFFF" },
  { from: "#0F766E", via: "#34C3AA", to: "#C8F7EC" },
  { from: "#A855F7", via: "#D18BFF", to: "#F1D9FF" },
  { from: "#EA580C", via: "#FDBA74", to: "#FFEDD5" },
  { from: "#BE123C", via: "#FB7185", to: "#FFE4E6" },
  { from: "#0E7490", via: "#67E8F9", to: "#CFFAFE" },
];

function WriteTemplateArtwork({ template, index = 0 }) {
  const artwork = template.artwork || WRITE_EDIT_ARTWORK_PALETTES[index % WRITE_EDIT_ARTWORK_PALETTES.length];
  const from = artwork.from || "#193B68";
  const via = artwork.via || "#4E8EDB";
  const to = artwork.to || "#D8E8FF";

  return (
    <div
      className="relative aspect-[1.35] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${via} 54%, ${to} 100%)`,
      }}
    >
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-sm" />
      <div className="absolute right-3 top-5 h-16 w-24 rotate-[-10deg] rounded-[24px] border border-white/18 bg-white/18" />
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
        <path
          d="M36 35H122"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.48"
        />
        <path
          d="M50 50H154"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.32"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
        {template.sectionTitle || artwork.category || "Write/Edit"}
      </span>
    </div>
  );
}

const DISLIKE_REASONS = [
  "feedbackInaccurate",
  "feedbackBadFormatting",
  "feedbackSlow",
  "feedbackDidNotUnderstand",
  "feedbackOther",
];

const IMAGE_TEMPLATES = [
  {
    id: "desk-setup",
    title: "Improve Your Desk Setup",
    category: "Workspace",
    requiresImage: true,
    prompt: "Analyze the uploaded desk or workspace photo, then create a polished upgraded desk setup concept. Keep the real room constraints in mind, improve lighting, cable management, ergonomics, monitor placement, storage, decor, and color harmony. Generate a realistic premium workspace visualization with practical improvements, natural materials, clean organization, and a calm BlueMind-inspired modern atmosphere.",
    gradient: "from-[#193B68] via-[#315F9C] to-[#8FB7FF]",
  },
  {
    id: "modern-logo",
    title: "Modern Logo Design",
    category: "Branding",
    prompt: "Create a premium modern logo concept for a refined AI-era brand. Use clean geometry, strong negative space, balanced proportions, scalable vector-like shapes, and a memorable mark. Present it on a simple neutral background with professional spacing, subtle BlueMind-inspired blue accents, and no mockup clutter.",
    gradient: "from-[#102A43] via-[#1D4E89] to-[#7AB8FF]",
  },
  {
    id: "professional-headshot",
    title: "Professional Headshot",
    category: "Portrait",
    requiresImage: true,
    prompt: "Use the uploaded portrait as identity reference and create a professional studio headshot. Preserve recognizable facial features while improving lighting, posture, background, wardrobe polish, and clarity. Make it realistic, confident, approachable, high-resolution, and suitable for LinkedIn or a business profile.",
    gradient: "from-[#243B53] via-[#3B6EA8] to-[#C7D9FF]",
  },
  {
    id: "anime-portrait",
    title: "Anime Portrait",
    category: "Stylized",
    requiresImage: true,
    prompt: "Transform the uploaded portrait into a polished anime-style character portrait. Preserve the person's key identity cues while using expressive eyes, clean linework, soft cinematic lighting, detailed hair, elegant shading, and a tasteful modern background. Avoid exaggerated distortions.",
    gradient: "from-[#16324F] via-[#496C95] to-[#DCE9FF]",
  },
  {
    id: "product-ad",
    title: "Product Advertisement",
    category: "Marketing",
    requiresImage: true,
    prompt: "Use the uploaded product image as the hero product reference and create a premium product advertisement. Improve lighting, composition, reflections, background styling, and visual hierarchy. Make it suitable for a high-end ecommerce campaign with clean copy space and polished commercial photography.",
    gradient: "from-[#1F3A5F] via-[#5077AA] to-[#A9C7EF]",
  },
  {
    id: "instagram-post",
    title: "Instagram Post",
    category: "Social",
    prompt: "Create a premium Instagram post design with a clear visual hook, elegant layout, readable text zones, refined spacing, modern gradients, and BlueMind-inspired accent colors. Make it feel useful, polished, and ready for a high-quality brand account.",
    gradient: "from-[#182B49] via-[#345C8E] to-[#9EBCE3]",
  },
  {
    id: "youtube-thumbnail",
    title: "YouTube Thumbnail",
    category: "Creator",
    prompt: "Create a high-click professional YouTube thumbnail concept with a bold focal point, clean readable title area, strong contrast, cinematic lighting, and modern AI-product polish. Avoid clutter and keep the composition clear on small screens.",
    gradient: "from-[#12355B] via-[#2E6F9E] to-[#9ED8FF]",
  },
  {
    id: "mobile-app-ui",
    title: "Mobile App UI",
    category: "Interface",
    prompt: "Design a premium mobile app UI screen for an intelligent productivity assistant. Use clean hierarchy, elegant typography, tactile controls, subtle depth, rounded components, BlueMind blue accents, and a native iOS-quality layout. Show a realistic app screen, not a marketing poster.",
    gradient: "from-[#172A46] via-[#466E9C] to-[#B8CEF1]",
  },
  {
    id: "website-landing",
    title: "Website Landing Page",
    category: "Web",
    prompt: "Create a modern website landing page concept for a premium AI product. Include a strong hero area, clear product visual, elegant navigation, concise value proposition, refined spacing, and BlueMind-inspired blue accents. Make it polished, minimal, and conversion-focused.",
    gradient: "from-[#0F2B46] via-[#2D5E88] to-[#93BDE6]",
  },
  {
    id: "business-card",
    title: "Business Card",
    category: "Print",
    prompt: "Create a premium business card design with clean typography, generous spacing, subtle BlueMind blue accents, professional front-and-back composition, and print-ready visual clarity. Make it elegant, modern, and credible.",
    gradient: "from-[#19324C] via-[#426B92] to-[#D8E7F8]",
  },
  {
    id: "infographic",
    title: "Infographic Design",
    category: "Education",
    prompt: "Create a clear modern infographic that explains a complex idea with simple sections, icons, charts, hierarchy, and concise visual storytelling. Use a polished BlueMind-inspired palette, excellent readability, and professional editorial spacing.",
    gradient: "from-[#1F3A5F] via-[#5077AA] to-[#A9C7EF]",
  },
  {
    id: "fantasy-character",
    title: "Fantasy Character",
    category: "Concept Art",
    prompt: "Create a cinematic fantasy character concept with detailed costume design, expressive pose, rich materials, dramatic lighting, and a premium concept-art finish. Keep the character original, memorable, and visually balanced.",
    gradient: "from-[#182B49] via-[#345C8E] to-[#9EBCE3]",
  },
  {
    id: "childrens-illustration",
    title: "Children’s Illustration",
    category: "Storybook",
    prompt: "Create a warm children’s book illustration with charming characters, gentle colors, readable composition, soft texture, expressive storytelling, and a friendly magical atmosphere. Make it polished and age-appropriate.",
    gradient: "from-[#264E73] via-[#6A95C2] to-[#D5E8FF]",
  },
  {
    id: "architecture-concept",
    title: "Architecture Concept",
    category: "Architecture",
    prompt: "Create a premium architecture concept visualization for a modern building. Use elegant forms, realistic materials, natural light, thoughtful landscape integration, clean composition, and high-end architectural rendering quality.",
    gradient: "from-[#1A344F] via-[#587FA6] to-[#CADDF2]",
  },
  {
    id: "gaming-wallpaper",
    title: "Gaming Wallpaper",
    category: "Wallpaper",
    prompt: "Create a cinematic gaming wallpaper with a powerful focal subject, atmospheric lighting, dynamic depth, crisp details, and a premium blue-accented color grade. Make it suitable for a mobile lock screen with clean negative space.",
    gradient: "from-[#10213D] via-[#234F87] to-[#76B2FF]",
  },
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

const DESKTOP_IMAGE_IDEAS = [
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

function formatConversationTime(value, language = "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function MobileChat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolvedTheme, t, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [responseModeMenuOpen, setResponseModeMenuOpen] = useState(false);
  const [menuSearchOpen, setMenuSearchOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState({});
  const [dislikeTarget, setDislikeTarget] = useState(null);
  const [responseMode, setResponseMode] = useState(() => {
    const storedMode = localStorage.getItem("bluemind-response-mode");
    return AI_RESPONSE_MODES.includes(storedMode) ? storedMode : "smart";
  });
  const [isImageMode, setIsImageMode] = useState(false);
  const [isWriteEditMode, setIsWriteEditMode] = useState(false);
  const [selectedImageTemplate, setSelectedImageTemplate] = useState(null);
  const [pendingImageTemplate, setPendingImageTemplate] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [activeWriteTask, setActiveWriteTask] = useState(null);
  const [pendingWriteTemplate, setPendingWriteTemplate] = useState(null);
  const [writeAttachments, setWriteAttachments] = useState([]);
  const [writeAttachmentChoiceOpen, setWriteAttachmentChoiceOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageModeError, setImageModeError] = useState("");
  const [imageModeStatus, setImageModeStatus] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [imageSourceSheetOpen, setImageSourceSheetOpen] = useState(false);
  const attachedImagesRef = useRef([]);
  const touchStartXRef = useRef(null);
  const sheetTouchStartYRef = useRef(null);
  const searchInputRef = useRef(null);
  const composerInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamAbortRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const activeAiMessageRef = useRef(null);

  const activeConversationId = searchParams.get("conversation");
  const surfaceColor = isDark ? "#1a1a1a" : "#FAFBFC";
  const panelColor = isDark ? "#202020" : "#FFFFFF";
  const borderColor = isDark ? "border-white/[0.08]" : "border-[#E5E7EB]";
  const mutedText = isDark ? "text-[#D7D7D7]" : "text-[#64748B]";
  const textColor = isDark ? "text-white" : "text-[#111827]";

  const navigationItems = [
    { label: "Smart Hub", path: "/mobile/smart-hub", icon: Brain },
    { label: t("reminders"), path: "/mobile/reminders", icon: Bell },
    { label: t("learning"), path: "/mobile/learning", icon: BookOpen },
    { label: t("profile"), path: "/mobile/profile", icon: UserCircle },
  ];

  const visibleConversations = useMemo(() => {
    const query = menuSearchQuery.trim();
    return query ? searchResults : conversations;
  }, [conversations, menuSearchQuery, searchResults]);

  const writeEditTemplates = useMemo(
    () => WRITE_EDIT_SECTIONS.flatMap((section) => (
      section.items.map((template) => ({
        ...template,
        sectionId: section.id,
        sectionTitle: section.title,
      }))
    )),
    [],
  );

  const hasComposerContent = message.trim().length > 0 || attachedImages.length > 0;
  const isEmptyChat = !isImageMode && !isWriteEditMode && messages.length === 0 && generatedImages.length === 0;
  const showEmptyActions = isEmptyChat && !message.trim() && attachedImages.length === 0;
  const shouldPinComposer = !isEmptyChat;
  const shouldShowImageTemplates = isImageMode && !message.trim() && attachedImages.length === 0 && !isGeneratingImage;
  const shouldShowWriteEditTemplates = isWriteEditMode && !message.trim() && writeAttachments.length === 0 && !activeWriteTask;

  const resizeChatComposer = useCallback((node = composerInputRef.current) => {
    if (!node || isImageMode || isWriteEditMode) return;
    const maxHeight = 128;
    node.style.height = "auto";
    const nextHeight = Math.min(node.scrollHeight, maxHeight);
    node.style.height = `${Math.max(nextHeight, 50)}px`;
    node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [isImageMode, isWriteEditMode]);

  useEffect(() => {
    resizeChatComposer();
  }, [message, resizeChatComposer, shouldPinComposer]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoadingConversations(true);
      setHistoryError("");
      try {
        const data = await listConversations();
        if (!cancelled) {
          setConversations(Array.isArray(data?.items) ? data.items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(error?.message || "Could not load chat history");
          setConversations([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConversations(false);
        }
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuSearchOpen) return undefined;
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return undefined;
  }, [menuSearchOpen]);

  useEffect(() => {
    const query = menuSearchQuery.trim();
    if (!menuSearchOpen || !query) {
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchConversations(query, 20);
        if (!cancelled) {
          setSearchResults(Array.isArray(data?.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [menuSearchOpen, menuSearchQuery]);

  useEffect(() => {
    attachedImagesRef.current = attachedImages;
  }, [attachedImages]);

  useEffect(() => {
    localStorage.setItem("bluemind-response-mode", responseMode);
  }, [responseMode]);

  useEffect(() => {
    if (searchParams.get("mode") === "image") {
      setIsImageMode(true);
      setIsWriteEditMode(false);
    }

    if (searchParams.get("mode") === "write-edit") {
      setIsWriteEditMode(true);
      setIsImageMode(false);
    }

    const requestedWriteTemplate = searchParams.get("writeTemplate");
    if (requestedWriteTemplate && !activeWriteTask && !pendingWriteTemplate) {
      const template = getWriteEditTemplateById(requestedWriteTemplate);
      if (template) {
        setPendingWriteTemplate(template);
        setWriteAttachmentChoiceOpen(true);
      }
    }

    const requestedPrompt = searchParams.get("prompt");
    if (requestedPrompt && !message.trim()) {
      setMessage(requestedPrompt);
    }
  }, [activeWriteTask, message, pendingWriteTemplate, searchParams]);

  useEffect(() => () => {
    streamAbortRef.current?.abort();
    attachedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuSearchOpen(false);
    setMenuSearchQuery("");
  };

  const selectResponseMode = (mode) => {
    setResponseMode(mode);
    setResponseModeMenuOpen(false);
  };

  const goTo = (path) => {
    closeMenu();
    navigate(path);
  };

  const startNewChat = () => {
    closeMenu();
    setMessage("");
    setIsImageMode(false);
    setIsWriteEditMode(false);
    setSelectedImageTemplate(null);
    setGeneratedImages([]);
    setImageModeError("");
    setImageModeStatus("");
    setActiveWriteTask(null);
    setPendingWriteTemplate(null);
    setWriteAttachments((current) => {
      current.forEach((file) => {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      });
      return [];
    });
    setWriteAttachmentChoiceOpen(false);
    setAttachedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setSearchParams({});
  };

  const openConversation = (conversationId) => {
    closeMenu();
    setSearchParams({ conversation: conversationId });
  };

  const clearMobileFlowParams = () => {
    const conversation = searchParams.get("conversation");
    setSearchParams(conversation ? { conversation } : {});
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches?.[0]?.clientX;
    touchStartXRef.current = null;
    if (typeof startX === "number" && typeof endX === "number" && startX - endX > 70) {
      closeMenu();
    }
  };

  const closeAttachmentSheet = () => {
    setAttachmentSheetOpen(false);
  };

  const closeImageSourceSheet = () => {
    setImageSourceSheetOpen(false);
  };

  const enterImageMode = () => {
    setIsImageMode(true);
    setIsWriteEditMode(false);
    setImageModeError("");
    setAttachmentSheetOpen(false);
  };

  const exitImageMode = () => {
    setIsImageMode(false);
    setSelectedImageTemplate(null);
    setPendingImageTemplate(null);
    setImageModeError("");
    setImageModeStatus("");
  };

  const enterWriteEditMode = () => {
    setIsWriteEditMode(true);
    setIsImageMode(false);
    setAttachmentSheetOpen(false);
    setImageModeError("");
    setImageModeStatus("");
  };

  const exitWriteEditMode = () => {
    clearWriteTask();
    setIsWriteEditMode(false);
  };

  const selectImageTemplate = (template) => {
    setPendingImageTemplate(template);
    setImageModeError("");
    setImageModeStatus("");
  };

  const activateWriteTask = (template, files = []) => {
    if (!template) return;
    clearMobileFlowParams();
    setIsWriteEditMode(true);
    setActiveWriteTask(createWriteEditTask(template));
    setWriteAttachments(files);
    setMessage(template.prompt);
    setPendingWriteTemplate(null);
    setWriteAttachmentChoiceOpen(false);
    setIsImageMode(false);
  };

  const clearWriteTask = () => {
    clearMobileFlowParams();
    writeAttachments.forEach((file) => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    });
    setActiveWriteTask(null);
    setPendingWriteTemplate(null);
    setWriteAttachments([]);
    setWriteAttachmentChoiceOpen(false);
    setMessage("");
  };

  const selectWriteEditTemplate = (template) => {
    if (!template) return;
    clearMobileFlowParams();
    setIsWriteEditMode(true);
    setActiveWriteTask(createWriteEditTask(template));
    setPendingWriteTemplate(null);
    setWriteAttachmentChoiceOpen(false);
    setWriteAttachments([]);
    setIsImageMode(false);
    setMessage(template.prompt || "");
    window.setTimeout(() => composerInputRef.current?.focus(), 0);
  };

  const continueWriteTaskWithoutAttachment = () => {
    if (!pendingWriteTemplate) return;
    activateWriteTask(pendingWriteTemplate, []);
  };

  const openWriteAttachmentInput = (optionId) => {
    if (optionId === "upload_image") {
      window.setTimeout(() => imageInputRef.current?.click(), 0);
      return;
    }

    if (optionId === "take_photo") {
      window.setTimeout(() => cameraInputRef.current?.click(), 0);
      return;
    }

    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const removeSelectedImageTemplate = () => {
    setSelectedImageTemplate(null);
    if (attachedImages.length === 0) {
      setIsImageMode(false);
      setMessage("");
    }
  };

  const openSheetDestination = (path) => {
    closeAttachmentSheet();
    navigate(path);
  };

  const openFileInput = (inputRef) => {
    closeAttachmentSheet();
    closeImageSourceSheet();
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const openTemplateImageInput = (inputRef) => {
    closeAttachmentSheet();
    closeImageSourceSheet();
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const handleWriteAttachmentSelection = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length || !pendingWriteTemplate) return;

    const accepted = [];

    for (const file of selectedFiles) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = file.type.startsWith("image/");
      const isText = file.type === "text/plain" || extension === "txt" || extension === "md";
      const isPdf = file.type === "application/pdf" || extension === "pdf";
      const isDoc = ["doc", "docx"].includes(extension);

      if (!isImage && !isText && !isPdf && !isDoc) {
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
        previewUrl = URL.createObjectURL(file);
        try {
          const uploaded = await uploadChatImage(file, activeConversationId);
          imageId = uploaded.id;
        } catch (error) {
          toast.error(error.message || "Image upload failed");
        }
      }

      accepted.push({
        id: imageId || `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: isImage ? "image" : isText ? "text" : isPdf ? "pdf" : "document",
        size: file.size,
        content,
        imageId,
        previewUrl,
      });
    }

    activateWriteTask(pendingWriteTemplate, accepted.slice(0, 6));
  };

  const handleImageSelection = (event) => {
    if (pendingWriteTemplate) {
      void handleWriteAttachmentSelection(event);
      return;
    }

    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) {
      event.target.value = "";
      return;
    }

    const templateForSelection = pendingImageTemplate;
    setIsImageMode(true);
    if (templateForSelection) {
      setSelectedImageTemplate(templateForSelection);
      setMessage(templateForSelection.prompt);
      setPendingImageTemplate(null);
    }
    setImageModeError("");
    setAttachedImages((current) => {
      const availableSlots = Math.max(0, MAX_IMAGE_ATTACHMENTS - current.length);
      const nextImages = files.slice(0, availableSlots).map((file) => ({
        id: `${file.name}-${file.lastModified}-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...current, ...nextImages];
    });
    event.target.value = "";
  };

  const removeAttachedImage = (imageId) => {
    setAttachedImages((current) => {
      const target = current.find((image) => image.id === imageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((image) => image.id !== imageId);
    });
  };

  const handleSheetTouchStart = (event) => {
    sheetTouchStartYRef.current = event.touches?.[0]?.clientY ?? null;
  };

  const handleSheetTouchEnd = (event) => {
    const startY = sheetTouchStartYRef.current;
    const endY = event.changedTouches?.[0]?.clientY;
    sheetTouchStartYRef.current = null;
    if (typeof startY === "number" && typeof endY === "number" && endY - startY > 70) {
      closeAttachmentSheet();
      closeImageSourceSheet();
    }
  };

  const buildGenerationPrompt = (basePrompt, imageAnalyses = []) => {
    const templateContext = selectedImageTemplate
      ? [
          `Template: ${selectedImageTemplate.title}`,
          `Template category: ${selectedImageTemplate.category}`,
          selectedImageTemplate.requiresImage ? "This template should use the uploaded image as a visual reference." : "",
        ].filter(Boolean).join("\n")
      : "";

    const imageContext = imageAnalyses.length
      ? imageAnalyses.map((item, index) => [
          `Reference image ${index + 1}:`,
          item.analysis?.description && `Description: ${item.analysis.description}`,
          item.analysis?.extractedText && `Readable text: ${item.analysis.extractedText}`,
          item.analysis?.objects?.length && `Visible objects: ${item.analysis.objects.join(", ")}`,
          item.analysis?.safetyNotes && `Safety notes: ${item.analysis.safetyNotes}`,
        ].filter(Boolean).join("\n")).join("\n\n")
      : "";

    return [
      templateContext,
      imageContext,
      "Create the final image from this request:",
      basePrompt,
      "Output a polished, production-quality image. Keep the composition mobile-friendly, visually clear, and consistent with BlueMind's refined modern identity.",
    ].filter(Boolean).join("\n\n");
  };

  const stopChatGeneration = () => {
    stopRequestedRef.current = true;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    activeAiMessageRef.current = null;
    setIsChatSending(false);
    setMessages((current) =>
      current.map((item) =>
        item.isStreaming
          ? { ...item, isStreaming: false }
          : item,
      ),
    );
  };

  const sendChatPrompt = useCallback(async ({
    prompt,
    keepComposer = false,
    mode = responseMode,
    metadata = {},
  }) => {
    const visibleMessage = String(prompt || "").trim();
    const currentMessage = activeWriteTask
      ? buildWriteEditMessage(visibleMessage, writeAttachments)
      : visibleMessage;
    if (!currentMessage || isGeneratingImage || isChatSending) return;

    const selectedMode = AI_RESPONSE_MODES.includes(mode) ? mode : responseMode;
    const userMessageId = crypto.randomUUID();
    const aiMessageId = crypto.randomUUID();
    const userMetadata = {
      source: "mobile_chat",
      chatMode: "chat",
      mode: selectedMode,
      responseMode: selectedMode,
      ...metadata,
      chatMode: activeWriteTask ? "write_edit" : metadata.chatMode || "chat",
      writeEditTask: activeWriteTask || undefined,
    };

    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: visibleMessage, attachments: writeAttachments, metadata: userMetadata },
      { id: aiMessageId, role: "ai", content: "", isStreaming: true },
    ]);

    if (!keepComposer) {
      setMessage("");
      setActiveWriteTask(null);
      setPendingWriteTemplate(null);
      setWriteAttachmentChoiceOpen(false);
      setWriteAttachments([]);
      setIsWriteEditMode(false);
    }

    setIsChatSending(true);
    setImageModeError("");
    stopRequestedRef.current = false;
    activeAiMessageRef.current = aiMessageId;
    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      await streamChatMessage({
        message: currentMessage,
        imageIds: activeWriteTask ? writeAttachments.map((file) => file.imageId).filter(Boolean) : [],
        conversationId: activeConversationId,
        mode: selectedMode,
        metadata: userMetadata,
        signal: controller.signal,
        onReady: (payload) => {
          if (payload?.conversation?.conversationId) {
            setSearchParams({ conversation: payload.conversation.conversationId });
          }
        },
        onDelta: (payload) => {
          if (!payload?.token) return;
          setMessages((current) =>
            current.map((item) =>
              item.id === aiMessageId
                ? { ...item, content: `${item.content || ""}${payload.token}` }
                : item,
            ),
          );
        },
        onComplete: (payload) => {
          if (payload?.conversation?.conversationId) {
            setSearchParams({ conversation: payload.conversation.conversationId });
          }
          setMessages((current) =>
            current.map((item) =>
              item.id === aiMessageId
                ? { ...item, content: item.content || payload?.message?.content || "", isStreaming: false }
                : item,
            ),
          );
        },
      });
    } catch (error) {
      if (stopRequestedRef.current || error?.name === "AbortError" || controller.signal.aborted) {
        setMessages((current) =>
          current.map((item) =>
            item.id === aiMessageId
              ? { ...item, isStreaming: false }
              : item,
          ),
        );
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === aiMessageId
            ? { ...item, content: getApiErrorMessage(error, "Chat request failed"), isStreaming: false }
            : item,
        ),
      );
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
      if (activeAiMessageRef.current === aiMessageId) {
        activeAiMessageRef.current = null;
      }
      stopRequestedRef.current = false;
      setIsChatSending(false);
    }
  }, [activeConversationId, activeWriteTask, isChatSending, isGeneratingImage, responseMode, setSearchParams, writeAttachments]);

  const persistMessageFeedback = useCallback((messageId, feedback) => {
    setMessageFeedback((current) => ({
      ...current,
      [messageId]: {
        ...(current[messageId] || {}),
        ...feedback,
      },
    }));

    try {
      const stored = JSON.parse(localStorage.getItem("bluemind_chat_feedback") || "[]");
      stored.push({
        messageId,
        conversationId: activeConversationId,
        ...feedback,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("bluemind_chat_feedback", JSON.stringify(stored.slice(-200)));
    } catch {
      // Feedback storage is best effort until the feedback API is connected.
    }
  }, [activeConversationId]);

  const handleCopyMessage = useCallback(async (item) => {
    try {
      await navigator.clipboard.writeText(item.content || "");
      persistMessageFeedback(item.id, { copied: true });
      window.setTimeout(() => {
        setMessageFeedback((current) => ({
          ...current,
          [item.id]: {
            ...(current[item.id] || {}),
            copied: false,
          },
        }));
      }, 1600);
    } catch {
      toast.error(t("copyFailed"));
    }
  }, [persistMessageFeedback, t]);

  const handleLikeMessage = useCallback((item) => {
    persistMessageFeedback(item.id, { rating: "like" });
    toast.success(t("feedbackSaved"));
  }, [persistMessageFeedback, t]);

  const handleDislikeMessage = useCallback((item) => {
    persistMessageFeedback(item.id, { rating: "dislike" });
    setDislikeTarget(item);
  }, [persistMessageFeedback]);

  const handleDislikeReason = useCallback((reason) => {
    if (!dislikeTarget) return;
    persistMessageFeedback(dislikeTarget.id, { rating: "dislike", reason });
    setDislikeTarget(null);
    toast.success(t("feedbackSaved"));
  }, [dislikeTarget, persistMessageFeedback, t]);

  const handleEditMessage = useCallback((item) => {
    setMessage(item.content || "");
    window.setTimeout(() => composerInputRef.current?.focus(), 0);
    toast.info(t("editInComposer"));
  }, [t]);

  const handleRegenerateMessage = useCallback((item) => {
    if (isChatSending) return;

    const index = messages.findIndex((messageItem) => messageItem.id === item.id);
    const previousUser = [...messages.slice(0, index)].reverse().find((messageItem) => messageItem.role === "user");

    if (!previousUser) {
      toast.error(t("regenerateFailed"));
      return;
    }

    setMessages((current) => current.slice(0, Math.max(0, index)));
    void sendChatPrompt({
      prompt: previousUser.content,
      keepComposer: true,
      mode: previousUser.metadata?.mode || previousUser.metadata?.responseMode || responseMode,
      metadata: previousUser.metadata || {},
    });
  }, [isChatSending, messages, responseMode, sendChatPrompt, t]);

  const handleShareMessage = useCallback(async (item) => {
    const text = item.content || "";

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

  const handleComposerSubmit = async (event) => {
    event.preventDefault();
    if (!hasComposerContent || isGeneratingImage || isChatSending) return;

    if (!isImageMode) {
      const currentMessage = message.trim();
      if (!currentMessage) return;
      await sendChatPrompt({ prompt: currentMessage });
      return;
    }

    if (selectedImageTemplate?.requiresImage && attachedImages.length === 0) {
      setImageModeError("Add a photo for this template before generating.");
      setImageSourceSheetOpen(true);
      return;
    }

    const prompt = message.trim() || selectedImageTemplate?.prompt || "Create a polished BlueMind image.";
    setIsGeneratingImage(true);
    setImageModeError("");
    setImageModeStatus(attachedImages.length ? "Uploading images..." : "Generating image...");

    try {
      const uploadedImages = [];
      for (const attachment of attachedImages) {
        const image = await uploadChatImage(attachment.file, activeConversationId);
        if (image) {
          uploadedImages.push(image);
        }
      }

      const analyses = [];
      if (uploadedImages.length > 0) {
        setImageModeStatus("Reading image context...");
        for (const image of uploadedImages) {
          const analysisPrompt = selectedImageTemplate?.requiresImage
            ? selectedImageTemplate.prompt
            : "Analyze this image as a visual reference for image generation. Describe composition, objects, style, colors, readable text, and details that should influence the generated image.";
          const analysis = await analyzeImage(image.id, analysisPrompt);
          analyses.push(analysis);
        }
      }

      setImageModeStatus("Generating image...");
      const finalPrompt = buildGenerationPrompt(prompt, analyses);
      const result = await generateImage(finalPrompt, activeConversationId, {
        n: 1,
        size: "1024x1024",
        quality: "auto",
        outputFormat: "png",
        metadata: {
          source: "mobile_image_mode",
          templateId: selectedImageTemplate?.id,
          templateTitle: selectedImageTemplate?.title,
          uploadedImageIds: uploadedImages.map((image) => image.id),
        },
      });

      setGeneratedImages((result?.images || []).map((image) => ({
        id: image.id,
        url: getImageUrl(image.id),
        prompt: image.prompt,
        revisedPrompt: image.revisedPrompt,
      })));
      setImageModeStatus("Image generated.");
      setMessage("");
      setSelectedImageTemplate(null);
      setAttachedImages((current) => {
        current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return [];
      });
      setIsImageMode(false);
    } catch (error) {
      setImageModeError(getApiErrorMessage(error, "Image generation failed"));
      setImageModeStatus("");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const renderComposerArea = (centered = false, separatePlus = centered) => (
    <motion.div
      layout
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={
        centered
          ? "mx-auto w-full max-w-[430px] px-1"
          : "px-4 pb-[calc(env(safe-area-inset-bottom)+8px)]"
      }
    >
      {showEmptyActions && (
        <div className={centered ? "mb-4 h-[60px] overflow-hidden text-center" : "hidden"}>
          <RotatingChatSuggestion
            iconClassName="h-[18px] w-[18px]"
            textClassName={`max-w-[360px] text-center text-[17px] font-semibold leading-6 tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}
          />
        </div>
      )}

      {(imageModeError || imageModeStatus) && (
        <div className={`mb-2 rounded-2xl px-3 py-2 text-xs font-bold ${
          imageModeError
            ? isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-600"
            : isDark ? "bg-white/[0.06] text-[#D7D7D7]" : "bg-[#EEF2F7] text-[#193B68]"
        }`}>
          {imageModeError || imageModeStatus}
        </div>
      )}

      <AnimatePresence>
        {writeAttachmentChoiceOpen && pendingWriteTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className={`mx-auto mb-3 w-full max-w-[360px] rounded-[26px] border p-3 text-center shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl ${
              isDark ? "border-white/[0.1] bg-[#202020]/[0.92] text-white" : "border-white/70 bg-white/[0.88] text-[#111827]"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3 text-left">
              <div>
                <p className="text-sm font-bold">{pendingWriteTemplate.title}</p>
                <p className={`mt-1 text-xs font-semibold leading-5 ${isDark ? "text-[#CFCFCF]" : "text-[#64748B]"}`}>
                  Choose an optional attachment or continue manually.
                </p>
              </div>
              <button
                type="button"
                onClick={continueWriteTaskWithoutAttachment}
                className={isDark ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
                aria-label="Continue without attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2">
              {WRITE_EDIT_UPLOAD_OPTIONS.filter((option) => option.id !== "continue").map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => openWriteAttachmentInput(option.id)}
                  className={isDark ? "h-11 rounded-2xl bg-white/[0.08] text-sm font-bold text-white active:bg-white/[0.13]" : "h-11 rounded-2xl bg-[#EEF2F7] text-sm font-bold text-[#193B68] active:bg-[#E2E8F0]"}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        className="space-y-2"
        onSubmit={handleComposerSubmit}
      >
        {(isImageMode || isWriteEditMode) && (
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (isImageMode) {
                  setImageSourceSheetOpen(true);
                  return;
                }
                setAttachmentSheetOpen(true);
              }}
              className={isDark ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)] active:bg-white/[0.12]" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#193B68] shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#E5E7EB] active:bg-[#EEF2F7]"}
              style={{
                backgroundColor: isDark ? "rgba(32,32,32,0.82)" : "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
              aria-label={isImageMode ? "Attach image" : "Add attachment"}
            >
              <Plus className="h-5 w-5" />
            </button>

            <div
              className={`min-w-0 flex-1 rounded-[28px] border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ${borderColor}`}
              style={{
                backgroundColor: isDark ? "rgba(32,32,32,0.82)" : "rgba(255,255,255,0.64)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold" style={{ color: isDark ? "#FFFFFF" : "var(--bluemind-app-color, #193B68)", backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(25,59,104,0.08)" }}>
                <span>{isImageMode ? "Image" : "Write/Edit"}</span>
                <button
                  type="button"
                  onClick={isImageMode ? exitImageMode : exitWriteEditMode}
                  className="flex h-5 w-5 items-center justify-center rounded-full active:bg-current/10"
                  aria-label={isImageMode ? "Exit image mode" : "Exit write edit mode"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {isImageMode && (selectedImageTemplate?.thumbnail || attachedImages.length > 0) && (
                <div
                  className="mb-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
                  data-testid="mobile-image-preview-strip"
                >
                  {selectedImageTemplate?.thumbnail && (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px]">
                      <img
                        src={selectedImageTemplate.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable="false"
                      />
                      <button
                        type="button"
                        onClick={removeSelectedImageTemplate}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-lg"
                        aria-label="Remove template"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {attachedImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px]"
                    >
                      <img
                        src={image.previewUrl}
                        alt={`Attachment ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachedImage(image.id)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-lg"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isWriteEditMode && writeAttachments.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
                  {writeAttachments.map((file) => (
                    <span
                      key={file.id}
                      className={isDark ? "inline-flex max-w-[180px] shrink-0 items-center gap-2 rounded-2xl bg-white/[0.07] px-2.5 py-1.5 text-xs font-bold text-white" : "inline-flex max-w-[180px] shrink-0 items-center gap-2 rounded-2xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-[#111827]"}
                    >
                      {file.type === "image" && file.previewUrl ? (
                        <img src={file.previewUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
                      ) : (
                        <FileText className={isDark ? "h-4 w-4 text-[#D7D7D7]" : "h-4 w-4 text-[#193B68]"} />
                      )}
                      <span className="truncate">{getWriteEditAttachmentLabel(file)}</span>
                    </span>
                  ))}
                </div>
              )}

              <textarea
                ref={composerInputRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder={isImageMode ? "Describe an image..." : "Write, paste, or choose a productivity tool..."}
                className={`max-h-[180px] min-h-[86px] w-full resize-none bg-transparent text-[16px] font-medium leading-6 outline-none placeholder:text-[#9CA3AF] ${textColor}`}
                style={{ caretColor: "var(--bluemind-app-color, #193B68)" }}
              />

              <div className="mt-1 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  className={isDark ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#D7D7D7] active:bg-white/[0.08]" : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#64748B] active:bg-[#EEF2F7]"}
                  aria-label="Voice"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <button
                type="submit"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(25,59,104,0.18)] transition-colors duration-200 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: hasComposerContent || isGeneratingImage || isChatSending
                    ? "var(--bluemind-app-color, #193B68)"
                    : isDark ? "#4B5563" : "#9CA3AF",
                }}
                disabled={!hasComposerContent || isGeneratingImage || isChatSending}
                aria-label="Send"
                >
                  {isGeneratingImage || isChatSending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <ArrowUp className="h-[20px] w-[18px] -translate-y-[2px] stroke-[3]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isImageMode && !isWriteEditMode && attachedImages.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1"
            data-testid="mobile-image-preview-strip"
          >
            {attachedImages.map((image, index) => (
              <div
                key={image.id}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px]"
              >
                <img
                  src={image.previewUrl}
                  alt={`Attachment ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachedImage(image.id)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-lg"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isImageMode && !isWriteEditMode && (
          <div className={separatePlus ? "flex items-center justify-center gap-2" : "flex items-center gap-0"}>
            {separatePlus && (
              <motion.button
                layoutId="mobile-composer-plus"
                type="button"
                onClick={() => setAttachmentSheetOpen(true)}
                className={isDark ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)] active:bg-white/[0.12]" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#193B68] shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#E5E7EB] active:bg-[#EEF2F7]"}
                aria-label="Attach"
              >
                <Plus className="h-5 w-5" />
              </motion.button>
            )}

            <motion.div
              layout
              className={`flex min-h-[52px] rounded-[26px] border shadow-[0_14px_36px_rgba(15,23,42,0.09)] ${borderColor} ${
                activeWriteTask ? "flex-col items-stretch px-3 py-3" : "items-end"
              } ${
                separatePlus ? activeWriteTask ? "w-[84%]" : "w-[84%] pl-4 pr-2" : activeWriteTask ? "w-full" : "w-full pl-2 pr-2"
              }`}
              style={{
                backgroundColor: isDark ? "rgba(32,32,32,0.92)" : "rgba(255,255,255,0.92)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              }}
            >
              {activeWriteTask && (
                <div className="mb-2 space-y-2">
                  <button
                    type="button"
                    onClick={clearWriteTask}
                    className={isDark ? "inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-xs font-bold text-white" : "inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#193B68]"}
                  >
                    <span>Write/Edit</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {writeAttachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {writeAttachments.map((file) => (
                        <span
                          key={file.id}
                          className={isDark ? "inline-flex max-w-[180px] shrink-0 items-center gap-2 rounded-2xl bg-white/[0.07] px-2.5 py-1.5 text-xs font-bold text-white" : "inline-flex max-w-[180px] shrink-0 items-center gap-2 rounded-2xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-[#111827]"}
                        >
                          {file.type === "image" && file.previewUrl ? (
                            <img src={file.previewUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
                          ) : (
                            <FileText className={isDark ? "h-4 w-4 text-[#D7D7D7]" : "h-4 w-4 text-[#193B68]"} />
                          )}
                          <span className="truncate">{getWriteEditAttachmentLabel(file)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex w-full items-end">
                {!separatePlus && (
                  <motion.button
                    layoutId="mobile-composer-plus"
                    type="button"
                    onClick={() => setAttachmentSheetOpen(true)}
                    className={isDark ? "mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/[0.10]" : "mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#193B68] active:bg-[#EEF2F7]"}
                    aria-label="Attach"
                  >
                    <Plus className="h-[18px] w-[18px]" />
                  </motion.button>
                )}

                <textarea
                  ref={composerInputRef}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    resizeChatComposer(event.target);
                  }}
                  onInput={(event) => resizeChatComposer(event.currentTarget)}
                  rows={1}
                  placeholder={activeWriteTask ? activeWriteTask.prompt : "Ask anything..."}
                  className={`max-h-[128px] min-h-[50px] flex-1 resize-none bg-transparent py-[13px] text-[16px] font-medium leading-6 outline-none placeholder:text-[#9CA3AF] ${textColor}`}
                  style={{ caretColor: "var(--bluemind-app-color, #193B68)" }}
                />

                <button
                  type="button"
                  className={isDark ? "flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-[#D7D7D7] active:bg-white/[0.08]" : "flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-[#64748B] active:bg-[#EEF2F7]"}
                  aria-label="Voice"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <button
                  type={isChatSending ? "button" : "submit"}
                  onClick={isChatSending ? stopChatGeneration : undefined}
                  className="ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(25,59,104,0.20)] transition-colors duration-200 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: hasComposerContent || isChatSending
                      ? "var(--bluemind-app-color, #193B68)"
                      : isDark ? "#4B5563" : "#9CA3AF",
                  }}
                  disabled={(!hasComposerContent && !isChatSending) || isGeneratingImage}
                  aria-label={isChatSending ? "Stop generating" : "Send"}
                >
                  {isChatSending ? (
                    <Square className="h-3.5 w-3.5 fill-current stroke-[2.5]" />
                  ) : isGeneratingImage ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <ArrowUp className="h-5 w-5 -translate-y-[2px] stroke-[3.2]" />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </form>
    </motion.div>
  );

  return (
    <main
      className={`fixed inset-0 flex flex-col overflow-hidden ${textColor}`}
      style={{
        backgroundColor: surfaceColor,
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      data-testid="mobile-chat-page"
    >
      <header className={`flex h-14 items-center border-b px-4 ${borderColor}`} style={{ backgroundColor: surfaceColor }}>
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={isDark ? "flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setResponseModeMenuOpen((open) => !open)}
            className={isDark ? "inline-flex h-10 items-center gap-1 rounded-full px-2.5 text-sm font-semibold capitalize text-white active:bg-white/[0.08]" : "inline-flex h-10 items-center gap-1 rounded-full px-2.5 text-sm font-semibold capitalize text-[#111827] active:bg-[#EEF2F7]"}
            aria-label="Select AI mode"
            aria-expanded={responseModeMenuOpen}
          >
            <span>{responseMode}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${responseModeMenuOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {responseModeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className={`absolute left-12 top-12 z-30 w-36 overflow-hidden rounded-2xl border p-1 shadow-xl ${isDark ? "border-white/[0.08] bg-[#202020]" : "border-[#E5E7EB] bg-white"}`}
              >
                {AI_RESPONSE_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => selectResponseMode(mode)}
                    className={`flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-semibold capitalize ${
                      responseMode === mode
                        ? "bg-[#193B68] text-white"
                        : isDark
                          ? "text-[#D7D7D7] active:bg-white/[0.08]"
                          : "text-[#111827] active:bg-[#EEF2F7]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={startNewChat}
          className={isDark ? "ml-auto flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "ml-auto flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
          aria-label="New chat"
        >
          <PenLine className="h-5 w-5" />
        </button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className={isEmptyChat ? "flex min-h-0 flex-1 items-center overflow-y-auto px-4 py-4" : "min-h-0 flex-1 overflow-y-auto px-4 pb-[104px] pt-4"}>
          {generatedImages.length > 0 && (
            <div className="mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Generated image</p>
                <button
                  type="button"
                  onClick={() => setGeneratedImages([])}
                  className={`text-xs font-bold ${mutedText}`}
                >
                  Clear
                </button>
              </div>
              <div className="grid gap-3">
                {generatedImages.map((image) => (
                  <div
                    key={image.id}
                    className={`overflow-hidden rounded-[26px] border ${borderColor}`}
                    style={{ backgroundColor: panelColor }}
                  >
                    <img src={image.url} alt="Generated BlueMind result" className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {isImageMode && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={`text-lg font-bold tracking-tight ${textColor}`}>Create an image</h2>
              <button
                type="button"
                onClick={exitImageMode}
                className={isDark ? "flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
                aria-label="Exit create image mode"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {isWriteEditMode && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={`text-lg font-bold tracking-tight ${textColor}`}>Write/Edit</h2>
              <button
                type="button"
                onClick={exitWriteEditMode}
                className={isDark ? "flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
                aria-label="Exit write edit mode"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {shouldShowImageTemplates && (
            <div className="pt-2">
              <AnimatePresence>
                {pendingImageTemplate && (
                  <motion.div
                    key={pendingImageTemplate.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`mx-auto mb-4 w-full rounded-[26px] border p-4 text-center shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl ${
                      isDark
                        ? "border-white/[0.1] bg-[#202020]/[0.88] text-white"
                        : "border-white/70 bg-white/[0.78] text-[#111827]"
                    }`}
                    style={{
                      backdropFilter: "blur(18px)",
                      WebkitBackdropFilter: "blur(18px)",
                    }}
                  >
                    <h3 className="text-base font-bold tracking-tight">{pendingImageTemplate.title}</h3>
                    <p className={`mx-auto mt-1 max-w-[260px] text-xs font-semibold leading-5 ${isDark ? "text-[#CFCFCF]" : "text-[#64748B]"}`}>
                      {pendingImageTemplate.description || "Create polished image artwork from your photo."}
                    </p>
                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => openTemplateImageInput(imageInputRef)}
                        className={isDark ? "flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.08] text-sm font-bold text-white active:bg-white/[0.13]" : "flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#EEF2F7] text-sm font-bold text-[#193B68] active:bg-[#E2E8F0]"}
                      >
                        <Image className="h-[18px] w-[18px]" />
                        <span>Upload Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTemplateImageInput(cameraInputRef)}
                        className={isDark ? "flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.08] text-sm font-bold text-white active:bg-white/[0.13]" : "flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#EEF2F7] text-sm font-bold text-[#193B68] active:bg-[#E2E8F0]"}
                      >
                        <Camera className="h-[18px] w-[18px]" />
                        <span>Take Photo</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-3">
                {DESKTOP_IMAGE_IDEAS.map((item, index) => (
                  <motion.button
                    key={item.title}
                    type="button"
                    onClick={() => selectImageTemplate(item)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.16) }}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.985 }}
                    className={`group overflow-hidden rounded-[24px] border text-left shadow-sm transition ${
                      isDark
                        ? "border-white/[0.08] bg-white/[0.06] hover:border-white/[0.16] hover:bg-white/[0.1]"
                        : "border-white/75 bg-white/82 shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                    }`}
                  >
                    <div className="relative aspect-[1.35] overflow-hidden">
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        draggable="false"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                        {item.category}
                      </span>
                    </div>
                    <div className="p-3">
                      <span className={`block text-sm font-bold leading-5 ${isDark ? "text-white" : "text-[#111827]"}`}>
                        {item.title}
                      </span>
                      <span className={`mt-1 line-clamp-2 block text-[11px] font-medium leading-4 ${isDark ? "text-[#A7A7A7]" : "text-[#64748B]"}`}>
                        {item.description}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {shouldShowWriteEditTemplates && (
            <div className="pt-2">
              <div className="grid grid-cols-2 gap-3">
                {writeEditTemplates.map((template, index) => (
                  <motion.button
                    key={template.id}
                    type="button"
                    onClick={() => selectWriteEditTemplate(template)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.16) }}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.985 }}
                    className={`group overflow-hidden rounded-[24px] border text-left shadow-sm transition ${
                      isDark
                        ? "border-white/[0.08] bg-white/[0.06] hover:border-white/[0.16] hover:bg-white/[0.1]"
                        : "border-white/75 bg-white/82 shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                    }`}
                  >
                    <WriteTemplateArtwork template={template} index={index} />
                    <div className="p-3">
                      <span className={`block text-sm font-bold leading-5 ${isDark ? "text-white" : "text-[#111827]"}`}>
                        {template.title}
                      </span>
                      <span className={`mt-1 line-clamp-2 block text-[11px] font-medium leading-4 ${isDark ? "text-[#A7A7A7]" : "text-[#64748B]"}`}>
                        {template.description}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4 pb-4">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={item.role === "user" ? "flex justify-end" : "w-full"}
                >
                  <div
                    dir="auto"
                    className={`whitespace-pre-wrap break-words text-sm font-medium leading-6 ${
                      item.role === "user"
                        ? "inline-block w-fit max-w-[78%] rounded-[22px] px-4 py-3 text-white"
                        : isDark
                          ? "w-full px-1 py-1 text-white"
                          : "w-full px-1 py-1 text-[#111827]"
                    }`}
                    style={item.role === "user" ? { backgroundColor: "var(--bluemind-app-color, #193B68)" } : undefined}
                  >
                    {item.content || (item.isStreaming ? "Thinking..." : "")}
                  </div>

                  {item.role !== "user" && !item.isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-2 flex flex-wrap items-center gap-1 px-1 transition-opacity duration-200 ${isDark ? "text-[#9CA3AF]" : "text-[#6B7280]"}`}
                      data-testid={`message-actions-${item.id}`}
                    >
                      {[
                        { id: "copy", icon: messageFeedback[item.id]?.copied ? Check : Clipboard, label: t("copy"), onClick: () => handleCopyMessage(item) },
                        { id: "like", icon: ThumbsUp, label: t("like"), onClick: () => handleLikeMessage(item), active: messageFeedback[item.id]?.rating === "like" },
                        { id: "dislike", icon: ThumbsDown, label: t("dislike"), onClick: () => handleDislikeMessage(item), active: messageFeedback[item.id]?.rating === "dislike" },
                        { id: "edit", icon: Edit3, label: t("edit"), onClick: () => handleEditMessage(item) },
                        { id: "regenerate", icon: RotateCcw, label: t("regenerate"), onClick: () => handleRegenerateMessage(item) },
                        { id: "share", icon: Share2, label: t("share"), onClick: () => handleShareMessage(item) },
                        { id: "more", icon: MoreVertical, label: t("more"), onClick: handleMoreMessage },
                      ].map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={action.onClick}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 transition-all duration-200 active:scale-[0.97] ${
                            action.active
                              ? isDark ? "bg-white/10 text-white" : "bg-[#EEF2FF] text-[#193B68]"
                              : isDark ? "active:bg-white/10 active:text-white" : "active:bg-[#F3F4F6] active:text-[#111827]"
                          }`}
                          title={action.label}
                          aria-label={action.label}
                        >
                          <action.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isEmptyChat && !shouldPinComposer && renderComposerArea(true)}
        </div>

        {shouldPinComposer && (
          <div className="fixed inset-x-0 bottom-0 z-20">
            <div className="mx-auto w-full max-w-[430px] pt-3">
              {renderComposerArea(false, isEmptyChat)}
            </div>
          </div>
        )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelection}
            className="hidden"
            aria-hidden="true"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelection}
            className="hidden"
            aria-hidden="true"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleWriteAttachmentSelection}
            className="hidden"
            aria-hidden="true"
          />
      </section>

      <AnimatePresence>
        {attachmentSheetOpen && (
          <div className="fixed inset-0 z-50">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={closeAttachmentSheet}
              aria-label="Close attachment menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.section
              className={`absolute inset-x-0 bottom-0 rounded-t-[28px] border-t px-4 pb-5 pt-3 shadow-[0_-24px_70px_rgba(15,23,42,0.2)] ${borderColor}`}
              style={{
                backgroundColor: panelColor,
                paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onTouchStart={handleSheetTouchStart}
              onTouchEnd={handleSheetTouchEnd}
              data-testid="mobile-attachment-sheet"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#9CA3AF]/55" />

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={enterImageMode}
                  className={isDark ? "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Image className="h-5 w-5" />
                  </span>
                  <span>Create Image</span>
                </button>

                <button
                  type="button"
                  onClick={enterWriteEditMode}
                  className={isDark ? "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <PenLine className="h-5 w-5" />
                  </span>
                  <span>Write /Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => openSheetDestination("/mobile/search")}
                  className={isDark ? "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Search className="h-5 w-5" />
                  </span>
                  <span>Search</span>
                </button>

                <div className={`my-2 h-px ${isDark ? "bg-white/[0.08]" : "bg-[#E5E7EB]"}`} />

                <button
                  type="button"
                  onClick={() => {
                    enterImageMode();
                    openFileInput(cameraInputRef);
                  }}
                  className={isDark ? "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Camera className="h-5 w-5" />
                  </span>
                  <span>Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    enterImageMode();
                    closeAttachmentSheet();
                    setImageSourceSheetOpen(true);
                  }}
                  className={isDark ? "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Image className="h-5 w-5" />
                  </span>
                  <span>Upload Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => openFileInput(fileInputRef)}
                  className={isDark ? "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[52px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <FileText className="h-5 w-5" />
                  </span>
                  <span>Upload File / PDF</span>
                </button>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imageSourceSheetOpen && (
          <div className="fixed inset-0 z-50">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={closeImageSourceSheet}
              aria-label="Close image source"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.section
              className={`absolute inset-x-0 bottom-0 rounded-t-[28px] border-t px-4 pb-5 pt-3 shadow-[0_-24px_70px_rgba(15,23,42,0.2)] ${borderColor}`}
              style={{
                backgroundColor: panelColor,
                paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onTouchStart={handleSheetTouchStart}
              onTouchEnd={handleSheetTouchEnd}
              data-testid="mobile-image-source-sheet"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#9CA3AF]/55" />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-base font-bold">Add image</p>
                  <p className={`text-xs font-semibold ${mutedText}`}>Attach a photo before sending.</p>
                </div>
                <button
                  type="button"
                  onClick={closeImageSourceSheet}
                  className={isDark ? "flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
                  aria-label="Close image source"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => openFileInput(imageInputRef)}
                  className={isDark ? "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Image className="h-5 w-5" />
                  </span>
                  <span>Choose Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => openFileInput(cameraInputRef)}
                  className={isDark ? "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Camera className="h-5 w-5" />
                  </span>
                  <span>Take Photo</span>
                </button>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dislikeTarget && (
          <div className="fixed inset-0 z-[80]" onClick={() => setDislikeTarget(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className={`absolute left-1/2 top-1/2 w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-3 shadow-2xl backdrop-blur-xl ${
                isDark ? "border-white/10 bg-[#202020]/95 text-white" : "border-[#E5E7EB] bg-white/95 text-[#111827]"
              }`}
              onClick={(event) => event.stopPropagation()}
              data-testid={`dislike-feedback-${dislikeTarget.id}`}
            >
              <div className="px-2 pb-2 pt-1">
                <p className="text-sm font-semibold">{t("tellUsMore")}</p>
                <p className={`mt-1 text-xs ${isDark ? "text-[#aaa]" : "text-[#6B7280]"}`}>{t("feedbackHelps")}</p>
              </div>
              <div className="space-y-1">
                {DISLIKE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleDislikeReason(reason)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                      isDark ? "active:bg-white/10" : "active:bg-[#F3F4F6]"
                    }`}
                  >
                    {t(reason)}
                    <span className={`h-1.5 w-1.5 rounded-full ${isDark ? "bg-white/30" : "bg-[#CBD5E1]"}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {menuOpen && (
        <div className="fixed inset-0 z-40">
          <button type="button" className="absolute inset-0 bg-black/35" onClick={closeMenu} aria-label="Close menu" />
          <aside
            className={`absolute bottom-0 left-0 top-0 flex w-[84vw] max-w-[350px] flex-col border-r shadow-2xl ${borderColor}`}
            style={{
              backgroundColor: panelColor,
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className={`flex h-16 shrink-0 items-center justify-between border-b px-4 ${borderColor}`}>
              <div className="flex items-center gap-2">
                <BrandLogo showName={false} logoClassName="h-9 w-9" />
                <span className="text-lg font-bold tracking-tight">BlueMind AI</span>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className={isDark ? "flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={startNewChat}
                  className={isDark ? "flex h-12 w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.06] px-3 text-left text-sm font-semibold text-white active:bg-white/[0.1]" : "flex h-12 w-full items-center gap-3 rounded-2xl border border-[#D6DEE9] bg-white px-3 text-left text-sm font-semibold text-[#111827] shadow-sm active:bg-[#F8FAFC]"}
                >
                  <Pencil className="h-5 w-5 shrink-0" />
                  <span>{t("newChat")}</span>
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => setMenuSearchOpen((open) => !open)}
                    className={isDark ? "flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#E5E7EB] active:bg-white/[0.08]" : "flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                  >
                    <Clock3 className="h-5 w-5 shrink-0" />
                    <span>{t("search")}</span>
                  </button>

                  {menuSearchOpen && (
                    <label className={`mt-2 flex h-12 items-center gap-2 rounded-2xl border px-3 ${isDark ? "border-white/[0.1] bg-white/[0.06]" : "border-[#E5E7EB] bg-white"}`}>
                      <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                      <input
                        ref={searchInputRef}
                        value={menuSearchQuery}
                        onChange={(event) => setMenuSearchQuery(event.target.value)}
                        placeholder={t("searchConversations")}
                        className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#9CA3AF] ${textColor}`}
                      />
                      {menuSearchQuery && (
                        <button type="button" onClick={() => setMenuSearchQuery("")} className="flex h-7 w-7 items-center justify-center rounded-full">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </label>
                  )}
                </div>
              </div>

              <div className={`mt-5 border-t pt-4 ${borderColor}`}>
                {navigationItems.map(({ label, path, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => goTo(path)}
                    className={isDark ? "mb-1 flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#E5E7EB] active:bg-white/[0.08]" : "mb-1 flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className={`mt-5 border-t pt-4 ${borderColor}`}>
                <p className={`px-3 text-xs font-semibold uppercase tracking-wide ${mutedText}`}>Recent Conversations</p>

                <div className="mt-2 space-y-1">
                  {isLoadingConversations && (
                    <div className={`rounded-2xl px-3 py-3 text-sm font-medium ${mutedText}`}>{t("loadingConversation")}</div>
                  )}

                  {!isLoadingConversations && historyError && (
                    <div className="rounded-2xl px-3 py-3 text-sm font-medium text-red-500">{historyError}</div>
                  )}

                  {!isLoadingConversations && !historyError && visibleConversations.length === 0 && (
                    <div className={`rounded-2xl px-3 py-3 text-sm font-medium ${mutedText}`}>
                      {menuSearchQuery.trim() ? t("noChatsFound") : t("noChatsFound")}
                    </div>
                  )}

                  {isSearching && menuSearchQuery.trim() && (
                    <div className={`rounded-2xl px-3 py-2 text-sm font-medium ${mutedText}`}>{t("searching")}</div>
                  )}

                  {visibleConversations.map((item) => {
                    const isActive = item.conversationId === activeConversationId;
                    return (
                      <button
                        key={item.conversationId}
                        type="button"
                        onClick={() => openConversation(item.conversationId)}
                        className={
                          isActive
                            ? isDark
                              ? "flex w-full items-start gap-3 rounded-2xl border border-[#3F5F8C] bg-[#27384F] px-3 py-3 text-left text-white"
                              : "flex w-full items-start gap-3 rounded-2xl border border-[#B7C7FF] bg-[#EAF0FF] px-3 py-3 text-left text-[#102E5A]"
                            : isDark
                              ? "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-[#D7D7D7] active:bg-white/[0.08]"
                              : "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-[#475569] active:bg-[#EEF2F7]"
                        }
                      >
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.title || t("newChat")}</span>
                          <span className={`mt-1 block truncate text-xs font-medium ${isDark ? "text-[#9CA3AF]" : "text-[#64748B]"}`}>
                            {formatConversationTime(item.lastMessageAt || item.updatedAt, uiLanguage)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>
          </aside>
        </div>
      )}
    </main>
  );
}

