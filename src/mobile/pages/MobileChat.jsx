import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Bell,
  BookOpen,
  Brain,
  Camera,
  Clock3,
  FileText,
  Image,
  Menu,
  MessageSquare,
  PenLine,
  Pencil,
  Plus,
  Search,
  UserCircle,
  X,
} from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { useApp } from "@/context/AppContext";
import { getApiErrorMessage } from "@/services/api";
import { listConversations, searchConversations, streamChatMessage } from "@/services/chatService";
import { analyzeImage, generateImage, getImageUrl, uploadChatImage } from "@/services/imageService";

const QUICK_ACTIONS = [
  { label: "Create Image", path: "/mobile/create-image", icon: Image },
  { label: "Write/Edit", path: "/mobile/write-edit", icon: PenLine },
  { label: "Search", path: "/mobile/search", icon: Search },
];

const AI_RESPONSE_MODES = ["fast", "smart", "thinking"];

const MAX_IMAGE_ATTACHMENTS = 6;

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
  const [responseMode, setResponseMode] = useState(() => {
    const storedMode = localStorage.getItem("bluemind-response-mode");
    return AI_RESPONSE_MODES.includes(storedMode) ? storedMode : "smart";
  });
  const [isImageMode, setIsImageMode] = useState(false);
  const [selectedImageTemplate, setSelectedImageTemplate] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
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

  const hasComposerContent = message.trim().length > 0 || attachedImages.length > 0;
  const isEmptyChat = !isImageMode && messages.length === 0 && generatedImages.length === 0;
  const showEmptyActions = isEmptyChat && !message.trim() && attachedImages.length === 0;
  const shouldShowImageTemplates = isImageMode && !message.trim() && attachedImages.length === 0 && !isGeneratingImage;

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
    }

    const requestedPrompt = searchParams.get("prompt");
    if (requestedPrompt && !message.trim()) {
      setMessage(requestedPrompt);
    }
  }, [message, searchParams]);

  useEffect(() => () => {
    attachedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  useEffect(() => {
    const input = composerInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    const nextHeight = Math.min(input.scrollHeight, 132);
    input.style.height = `${Math.max(nextHeight, 44)}px`;
    input.style.overflowY = input.scrollHeight > 132 ? "auto" : "hidden";
  }, [message]);

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuSearchOpen(false);
    setMenuSearchQuery("");
  };

  const goTo = (path) => {
    closeMenu();
    navigate(path);
  };

  const startNewChat = () => {
    closeMenu();
    setMessage("");
    setIsImageMode(false);
    setSelectedImageTemplate(null);
    setGeneratedImages([]);
    setImageModeError("");
    setImageModeStatus("");
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
    setImageModeError("");
    setAttachmentSheetOpen(false);
  };

  const exitImageMode = () => {
    setIsImageMode(false);
    setSelectedImageTemplate(null);
    setImageModeError("");
    setImageModeStatus("");
  };

  const selectImageTemplate = (template) => {
    setIsImageMode(true);
    setSelectedImageTemplate(template);
    setMessage(template.prompt);
    setImageModeError("");
    setImageModeStatus("");

    if (template.requiresImage && attachedImages.length === 0) {
      window.setTimeout(() => setImageSourceSheetOpen(true), 120);
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

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) {
      event.target.value = "";
      return;
    }

    setIsImageMode(true);
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

  const handleComposerSubmit = async (event) => {
    event.preventDefault();
    if (!hasComposerContent || isGeneratingImage || isChatSending) return;

    if (!isImageMode) {
      const currentMessage = message.trim();
      if (!currentMessage) return;

      const userMessageId = crypto.randomUUID();
      const aiMessageId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        { id: userMessageId, role: "user", content: currentMessage },
        { id: aiMessageId, role: "ai", content: "", isStreaming: true },
      ]);
      setMessage("");
      setIsChatSending(true);
      setImageModeError("");

      try {
        await streamChatMessage({
          message: currentMessage,
          conversationId: activeConversationId,
          mode: responseMode,
          metadata: {
            source: "mobile_chat",
            chatMode: "chat",
            mode: responseMode,
            responseMode,
          },
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
        setMessages((current) =>
          current.map((item) =>
            item.id === aiMessageId
              ? { ...item, content: getApiErrorMessage(error, "Chat request failed"), isStreaming: false }
              : item,
          ),
        );
      } finally {
        setIsChatSending(false);
      }
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

  const renderComposerArea = (centered = false) => (
    <div className={centered ? "mx-auto w-full max-w-[430px] px-1" : "px-4 pb-3"}>
      {showEmptyActions && (
        <div className={centered ? "mx-auto mb-5 flex w-full max-w-[320px] flex-col items-start gap-3" : "mb-3 flex flex-col items-start gap-2"}>
          {QUICK_ACTIONS.map(({ label, path, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (label === "Create Image") {
                  enterImageMode();
                  return;
                }
                navigate(path);
              }}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full px-1 text-sm font-semibold transition-opacity active:opacity-70 ${
                isDark ? "text-[#D7D7D7]" : "text-[#193B68]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {!isImageMode && (
        <div className="mb-3 flex items-center justify-center gap-1">
          {AI_RESPONSE_MODES.map((mode) => {
            const active = responseMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setResponseMode(mode)}
                className={`h-8 rounded-full px-3 text-xs font-semibold capitalize transition ${
                  active
                    ? "bg-[#193B68] text-white shadow-sm"
                    : isDark
                      ? "text-[#BFC6D1] active:bg-white/[0.08]"
                      : "text-[#64748B] active:bg-[#EEF2F7]"
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
      )}

      {isImageMode && (
        <div className="mb-2 flex items-center justify-between">
          <span
            className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: "var(--bluemind-app-color, #193B68)" }}
          >
            <Image className="h-4 w-4" />
            Image
          </span>
          <button
            type="button"
            onClick={exitImageMode}
            className={isDark ? "flex h-8 w-8 items-center justify-center rounded-full text-[#D7D7D7] active:bg-white/[0.08]" : "flex h-8 w-8 items-center justify-center rounded-full text-[#64748B] active:bg-[#EEF2F7]"}
            aria-label="Exit Image Mode"
          >
            <X className="h-4 w-4" />
          </button>
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

      <form className="space-y-2" onSubmit={handleComposerSubmit}>
        {attachedImages.length > 0 && (
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

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (isImageMode) {
                setImageSourceSheetOpen(true);
                return;
              }
              setAttachmentSheetOpen(true);
            }}
            className={isDark ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)] active:bg-white/[0.12]" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#193B68] shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-[#E5E7EB] active:bg-[#EEF2F7]"}
            aria-label="Attach"
          >
            <Plus className="h-5 w-5" />
          </button>

          <div
            className={`flex min-h-[52px] flex-1 items-center rounded-[26px] border pl-4 pr-1 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ${borderColor}`}
            style={{
              backgroundColor: isDark ? "rgba(32,32,32,0.9)" : "rgba(255,255,255,0.88)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <textarea
              ref={composerInputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={1}
              placeholder={isImageMode ? "Describe an image..." : "Ask anything..."}
              className={`max-h-[132px] min-h-[50px] flex-1 resize-none bg-transparent py-[15px] text-[16px] leading-5 outline-none placeholder:text-[#9CA3AF] ${textColor}`}
            />

            <button
              type="submit"
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(25,59,104,0.22)] disabled:opacity-45"
              style={{ backgroundColor: "var(--bluemind-app-color, #193B68)" }}
              disabled={!hasComposerContent || isGeneratingImage || isChatSending}
              aria-label="Send"
            >
              {isGeneratingImage || isChatSending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ArrowUp className="h-5 w-5 stroke-[2.8]" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
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
      <header className={`flex h-14 items-center justify-between border-b px-4 ${borderColor}`} style={{ backgroundColor: surfaceColor }}>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={isDark ? "flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button type="button" onClick={() => navigate("/mobile/chat")} className="flex items-center gap-2">
          <BrandLogo showName={false} logoClassName="h-7 w-7" />
          <span className="text-base font-bold tracking-tight">BlueMind</span>
        </button>

        <button
          type="button"
          onClick={startNewChat}
          className={isDark ? "flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
          aria-label="New chat"
        >
          <PenLine className="h-5 w-5" />
        </button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className={isEmptyChat ? "flex min-h-0 flex-1 items-center overflow-y-auto px-4 py-4" : "min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4"}>
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

          {shouldShowImageTemplates && (
            <div className="pt-2">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "var(--bluemind-app-color, #193B68)" }}>
                  <Image className="h-4 w-4 text-white" />
                </span>
                <div>
                  <p className="text-sm font-bold">Image ideas</p>
                  <p className={`text-xs font-medium ${mutedText}`}>Start with a visual direction.</p>
                </div>
              </div>

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

          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[86%] rounded-[22px] px-4 py-3 text-sm font-medium leading-6 ${
                    item.role === "user"
                      ? "ml-auto text-white"
                      : isDark
                        ? "mr-auto bg-white/[0.07] text-white"
                        : "mr-auto bg-white text-[#111827] shadow-sm"
                  }`}
                  style={item.role === "user" ? { backgroundColor: "var(--bluemind-app-color, #193B68)" } : undefined}
                >
                  {item.content || (item.isStreaming ? "Thinking..." : "")}
                </div>
              ))}
            </div>
          )}

          {isEmptyChat && renderComposerArea(true)}
        </div>

        {!isEmptyChat && renderComposerArea(false)}
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
                  onClick={() => openSheetDestination("/mobile/write-edit")}
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

