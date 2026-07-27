import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, animate, motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  Brain,
  Camera,
  ChevronDown,
  ChevronRight,
  Check,
  Clipboard,
  FileText,
  Image,
  Lock,
  Glasses,
  Menu,
  MoreVertical,
  MessageSquare,
  Mic,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";

import { APP_NAME } from "@/components/BrandLogo";
import ChatImageAttachments, { resolveAttachmentPreviewUrl } from "@/components/ChatImageAttachments";
import MessageResponse from "@/components/MessageResponse";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import UnifiedComposer from "@/components/UnifiedComposer";
import SettingsSheet from "@/components/settings/SettingsSheet";
import { useApp } from "@/context/AppContext";
import { iconClasses, typeClasses } from "@/lib/interactions";
import {
  buildWriteEditMessage,
  createWriteEditTask,
  getWriteEditAttachmentLabel,
  getWriteEditTemplateById,
  WRITE_EDIT_SECTIONS,
  WRITE_EDIT_UPLOAD_OPTIONS,
} from "@/data/writeEditTemplates";
import {
  SEARCH_DISCOVERY_CATEGORIES,
  getSearchResultsForCategory,
} from "@/data/searchDiscovery";
import { AI_MODES, getAiMode, getAiSpecializationLabel, normalizeAiModeId } from "@/data/aiModes";
import { getApiErrorMessage } from "@/services/api";
import { restoreExistingSession } from "@/services/authService";
import { getConversation, listConversations, searchConversations, streamChatMessage, streamHiddenChatMessage } from "@/services/chatService";
import { deleteChat, renameChat, shareChat } from "@/services/conversationActions";
import { analyzeImage, generateImage, getImageUrl, uploadChatImage } from "@/services/imageService";
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
import { AUTH_SESSION_CLEARED_EVENT, readStoredUser } from "@/services/storageKeys";
import { updatePreferences } from "@/services/profileService";
import useChatAutoScroll from "@/hooks/useChatAutoScroll";
import useVoiceInput from "@/hooks/useVoiceInput";
import { SEARCH_ARTWORK_COLORS, WRITE_EDIT_ARTWORK_COLORS } from "@/theme/colors";

const MAX_IMAGE_ATTACHMENTS = 6;
const MOBILE_THINKING_LEVEL_STORAGE_KEY = "bluemind_mobile_thinking_level";
const MOBILE_HEADER_MODEL_STORAGE_KEY = "bluemind_mobile_header_model";
const MOBILE_HEADER_THINKING_STORAGE_KEY = "bluemind_mobile_header_thinking";

const MOBILE_HEADER_MODELS = [
  { id: "bluemind-3-0", label: "BlueMind 3.0" },
  { id: "bluemind-3-5", label: "BlueMind 3.5" },
  { id: "bluemind-4-0", label: "BlueMind 4.0" },
  { id: "bluemind-4-5", label: "BlueMind 4.5" },
  { id: "bluemind-5-0", label: "BlueMind 5.0", badge: "NEW" },
];

const WRITE_EDIT_ARTWORK_PALETTES = [
  WRITE_EDIT_ARTWORK_COLORS.writing,
  WRITE_EDIT_ARTWORK_COLORS.careerBlue,
  WRITE_EDIT_ARTWORK_COLORS.study,
  WRITE_EDIT_ARTWORK_COLORS.business,
  WRITE_EDIT_ARTWORK_COLORS.careerPurple,
  WRITE_EDIT_ARTWORK_COLORS.social,
  WRITE_EDIT_ARTWORK_COLORS.product,
  SEARCH_ARTWORK_COLORS[1],
];

function WriteTemplateArtwork({ template, index = 0 }) {
  const artwork = template.artwork || WRITE_EDIT_ARTWORK_PALETTES[index % WRITE_EDIT_ARTWORK_PALETTES.length];
  const from = artwork.from || "var(--bm-primary)";
  const via = artwork.via || WRITE_EDIT_ARTWORK_COLORS.careerBlue.via;
  const to = artwork.to || WRITE_EDIT_ARTWORK_COLORS.writing.to;

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
    gradient: "from-[var(--bm-primary)] via-[#315F9C] to-[#8FB7FF]",
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
  {
    id: "action-figure",
    title: "Action Figure",
    category: "Collectibles",
    description: "Turn an idea into a collectible toy render.",
    prompt: "Create a premium action figure product render with detailed packaging, dramatic studio lighting, polished plastic materials, and a collectible display feel.",
    thumbnail: createIdeaThumbnail("action-figure", "#172554", "#2563EB", "#F97316"),
  },
  {
    id: "pixel-art",
    title: "Pixel Art",
    category: "Game Art",
    description: "Create crisp retro-inspired game visuals.",
    prompt: "Create polished pixel art with a clear silhouette, charming details, limited palette, clean lighting, and a premium retro game aesthetic.",
    thumbnail: createIdeaThumbnail("pixel-art", "#111827", "#1D4ED8", "#FACC15"),
  },
  {
    id: "fashion",
    title: "Fashion",
    category: "Style",
    description: "Explore editorial outfits and looks.",
    prompt: "Create a high-end fashion editorial image with refined styling, elegant fabrics, confident pose, premium lighting, and a modern BlueMind-inspired mood.",
    thumbnail: createIdeaThumbnail("fashion", "#0F172A", "#475569", "#93C5FD"),
  },
  {
    id: "interior-design",
    title: "Interior Design",
    category: "Home",
    description: "Design calm premium living spaces.",
    prompt: "Create a premium interior design concept with calm materials, soft natural light, clean furniture, thoughtful spacing, and elegant blue-gray accents.",
    thumbnail: createIdeaThumbnail("interior-design", "#1E3A5F", "#64748B", "#BFDBFE"),
  },
  {
    id: "icons",
    title: "Icons",
    category: "UI Assets",
    description: "Create a consistent icon set.",
    prompt: "Create a professional app icon set with consistent stroke, rounded geometry, clean spacing, subtle blue accents, and a premium UI product feel.",
    thumbnail: createIdeaThumbnail("icons", "#0B1220", "#2563EB", "#E0F2FE"),
  },
  {
    id: "sticker-style",
    title: "Sticker Style",
    category: "Social",
    description: "Make expressive sticker artwork.",
    prompt: "Create a playful premium sticker-style illustration with clean outlines, expressive shape language, soft shading, and a transparent-background-ready composition.",
    thumbnail: createIdeaThumbnail("sticker-style", "#075985", "#38BDF8", "#FDE68A"),
  },
  {
    id: "food-photography",
    title: "Food",
    category: "Photography",
    description: "Create appetizing food visuals.",
    prompt: "Create premium food photography with natural texture, appetizing composition, soft restaurant lighting, realistic ingredients, and editorial polish.",
    thumbnail: createIdeaThumbnail("food-photography", "#7C2D12", "#EA580C", "#FED7AA"),
  },
  {
    id: "landscape",
    title: "Landscape",
    category: "Scenery",
    description: "Build cinematic outdoor worlds.",
    prompt: "Create a cinematic landscape with atmospheric depth, elegant light, realistic terrain, balanced composition, and a premium calm visual tone.",
    thumbnail: createIdeaThumbnail("landscape", "#0F3A4A", "#2563EB", "#BAE6FD"),
  },
  {
    id: "poster-design",
    title: "Poster Design",
    category: "Graphic Design",
    description: "Compose bold visual posters.",
    prompt: "Create a premium poster design with strong hierarchy, clean typography zones, cinematic focal image, refined spacing, and BlueMind blue accents.",
    thumbnail: createIdeaThumbnail("poster-design", "#111827", "#1E40AF", "#F8FAFC"),
  },
  {
    id: "album-cover",
    title: "Album Cover",
    category: "Music",
    description: "Create atmospheric cover art.",
    prompt: "Create premium album cover artwork with strong mood, clean composition, memorable visual symbol, refined lighting, and elegant modern typography space.",
    thumbnail: createIdeaThumbnail("album-cover", "#020617", "#334155", "#60A5FA"),
  },
];

const IMAGE_GALLERY_TILE_HEIGHTS = [198, 252, 224, 286, 214, 264, 236, 304, 220, 274];

function MobileImageGalleryTile({ item, index, selected, onSelect, loopHidden = false }) {
  const tileRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: tileRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [14, -14]);
  const height = IMAGE_GALLERY_TILE_HEIGHTS[index % IMAGE_GALLERY_TILE_HEIGHTS.length];

  return (
    <motion.button
      ref={tileRef}
      type="button"
      onClick={() => onSelect(item)}
      tabIndex={loopHidden ? -1 : undefined}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.018, 0.18), ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.975 }}
      className="group mb-1 block w-full break-inside-avoid overflow-visible text-left"
      aria-pressed={selected}
    >
      <motion.div
        animate={{
          scale: selected ? 1.018 : 1,
          boxShadow: selected
            ? "0 0 0 2px rgba(37,99,235,0.88)"
            : "0 0 0 1px rgba(255,255,255,0.04)",
        }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full overflow-hidden rounded-[14px]"
        style={{ height }}
      >
        <motion.img
          src={item.thumbnail}
          alt=""
          className="absolute inset-x-0 -top-4 h-[calc(100%+32px)] w-full object-cover transition-transform duration-500 group-active:scale-[1.03]"
          style={{ y: imageY }}
          draggable="false"
        />

        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.72 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bm-primary)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.34)]"
              aria-hidden="true"
            >
              <Check className="h-4 w-4 stroke-[3]" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="px-1 pb-2 pt-1">
        <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/48">
          {item.category}
        </span>
        <span className="block truncate text-[13px] font-black leading-4 text-white/88">
          {item.title}
        </span>
      </div>
    </motion.button>
  );
}

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

function mapMobileConversationMessages(conversation) {
  return (conversation?.messages || []).map((item) => ({
    id: item.id,
    role: item.role === "assistant" ? "ai" : item.role,
    content: item.content || "",
    metadata: item.metadata || {},
    createdAt: item.createdAt,
    attachments: (item.metadata?.attachments || item.attachments || []).map((attachment) => ({
      ...attachment,
      previewUrl: resolveAttachmentPreviewUrl(attachment),
    })),
  }));
}

export default function MobileChat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { prefs, resolvedTheme, t, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuUser = readStoredUser() || {};
  const menuUserName = menuUser.name || menuUser.fullName || menuUser.displayName || menuUser.email || "Profile";
  const menuUserInitial = String(menuUserName).trim().charAt(0).toUpperCase() || "B";
  const menuUserAvatar = menuUser.avatarUrl || menuUser.photoURL || menuUser.photoUrl || menuUser.imageUrl || "";
  const [responseModeMenuOpen, setResponseModeMenuOpen] = useState(false);
  const [responseModeMenuPosition, setResponseModeMenuPosition] = useState(null);
  const [featureCarouselStep, setFeatureCarouselStep] = useState(0);
  const featureCarouselX = useMotionValue(0);
  const featureCarouselTrackRef = useRef(null);
  const featureCarouselAnimationRef = useRef(null);
  const featureCarouselAutoTimerRef = useRef(null);
  const scheduleFeatureCarouselAutoRef = useRef(null);
  const featureCarouselDraggingRef = useRef(false);
  const [composerKeyboardOffset, setComposerKeyboardOffset] = useState(0);
  const [chatHomeDismissed, setChatHomeDismissed] = useState(false);
  const [menuSearchOpen, setMenuSearchOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [chatMenuTarget, setChatMenuTarget] = useState(null);
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(true);
  const [chatHistoryOverflowVisible, setChatHistoryOverflowVisible] = useState(true);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
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
  const [selectedPrivateSpace, setSelectedPrivateSpace] = useState(null);
  const [privatePinInput, setPrivatePinInput] = useState("");
  const [activePrivateSpace, setActivePrivateSpace] = useState(null);
  const [privateSpaceAccessToken, setPrivateSpaceAccessToken] = useState("");
  const [hiddenChatModalOpen, setHiddenChatModalOpen] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState({});
  const [dislikeTarget, setDislikeTarget] = useState(null);
  const [responseMode, setResponseMode] = useState(() => {
    const storedMode = localStorage.getItem("bluemind-response-mode");
    return normalizeAiModeId(storedMode);
  });
  const [thinkingLevel, setThinkingLevel] = useState(() => localStorage.getItem(MOBILE_THINKING_LEVEL_STORAGE_KEY) || "balanced");
  const [headerModelId, setHeaderModelId] = useState(() => localStorage.getItem(MOBILE_HEADER_MODEL_STORAGE_KEY) || "bluemind-5-0");
  const [headerThinkingEnabled, setHeaderThinkingEnabled] = useState(() => localStorage.getItem(MOBILE_HEADER_THINKING_STORAGE_KEY) === "true");
  const [isImageMode, setIsImageMode] = useState(false);
  const [isWriteEditMode, setIsWriteEditMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedSearchCategory, setSelectedSearchCategory] = useState(null);
  const [openSearchMenuItemId, setOpenSearchMenuItemId] = useState(null);
  const [expandedSearchItemId, setExpandedSearchItemId] = useState(null);
  const [searchConfirm, setSearchConfirm] = useState(null);
  const [selectedImageTemplate, setSelectedImageTemplate] = useState(null);
  const [imageTemplateConfirm, setImageTemplateConfirm] = useState(null);
  const [pendingImageTemplate, setPendingImageTemplate] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [activeWriteTask, setActiveWriteTask] = useState(null);
  const [pendingWriteTemplate, setPendingWriteTemplate] = useState(null);
  const [writeAttachments, setWriteAttachments] = useState([]);
  const [writeAttachmentChoiceOpen, setWriteAttachmentChoiceOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageModeError, setImageModeError] = useState("");
  const [imageModeStatus, setImageModeStatus] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [imageSourceSheetOpen, setImageSourceSheetOpen] = useState(false);
  const attachedImagesRef = useRef([]);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const sheetTouchStartYRef = useRef(null);
  const searchInputRef = useRef(null);
  const aiSelectorButtonRef = useRef(null);
  const composerInputRef = useRef(null);
  const imageGalleryViewportRef = useRef(null);
  const imageGalleryLoopRef = useRef(null);
  const imageGalleryAutoFrameRef = useRef(null);
  const imageGalleryAutoPausedRef = useRef(false);
  const imageGalleryResumeTimerRef = useRef(null);
  const cameraInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamAbortRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const activeAiMessageRef = useRef(null);
  const sendLockRef = useRef(false);
  const streamBufferRef = useRef({ messageId: null, text: "", timer: null });
  const loadedConversationRef = useRef(null);
  const featureCarouselCount = 5;

  const activeConversationId = searchParams.get("conversation");
  const surfaceColor = "var(--bm-bg-app)";
  const panelColor = "var(--bm-bg-app)";
  const borderColor = "border-white/[0.055]";
  const mutedText = "text-[#B7B7B7]";
  const textColor = isDark ? "text-white/90" : "text-[var(--bm-text-primary)]";
  const mobileGlassControlClass =
    "bm-mobile-glass-control";
  const mobileGlassSelectorClass =
    "pointer-events-auto inline-flex h-10 max-w-[215px] items-center gap-2 rounded-full border border-white/[0.052] bg-[rgba(78,78,78,0.16)] px-4 text-sm font-bold capitalize text-white/90 backdrop-blur-[42px] transition-all duration-200 ease-out active:scale-[0.97] active:bg-[rgba(96,96,96,0.18)]";
  const mobileGlassControlStyle = {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.014), inset 1px 0 0 rgba(255,255,255,0.026), inset -1px 0 0 rgba(255,255,255,0.022), 0 12px 28px rgba(0,0,0,0.22)",
    backdropFilter: "blur(42px) saturate(1.18)",
    WebkitBackdropFilter: "blur(42px) saturate(1.18)",
  };
  const mobileGlassPanelStyle = {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.016), inset 1px 0 0 rgba(255,255,255,0.032), inset -1px 0 0 rgba(255,255,255,0.026), 0 24px 68px rgba(0,0,0,0.3)",
    backdropFilter: "blur(42px) saturate(1.16)",
    WebkitBackdropFilter: "blur(42px) saturate(1.16)",
  };
  const mobileGlassMenuSelectedClass = "bg-[rgba(106,106,106,0.16)] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
  const mobileGlassMenuIdleClass = "text-white/85 hover:bg-[rgba(106,106,106,0.1)] active:bg-[rgba(106,106,106,0.15)]";

  const mobileFeatureCards = useMemo(() => [
    {
      title: "Smart Hub",
      description: "Organize BlueMind tools in one intelligent workspace.",
      cta: "Explore",
      path: "/mobile/smart-hub",
      icon: Brain,
      accent: "rgba(96,165,250,0.72)",
      glow: "rgba(59,130,246,0.22)",
    },
    {
      title: "AI Plans",
      description: "Turn goals into clear steps and smarter routines.",
      cta: "Try Now",
      path: "/mobile/ai-plans",
      icon: Sparkles,
      accent: "rgba(125,211,252,0.72)",
      glow: "rgba(14,165,233,0.2)",
    },
    {
      title: "Learning",
      description: "Study faster with guided lessons and focused help.",
      cta: "Open",
      path: "/mobile/learning",
      icon: BookOpen,
      accent: "rgba(147,197,253,0.72)",
      glow: "rgba(96,165,250,0.2)",
    },
    {
      title: "Reminders",
      description: "Keep important tasks visible at the right time.",
      cta: "Open",
      path: "/mobile/reminders",
      icon: Bell,
      accent: "rgba(191,219,254,0.76)",
      glow: "rgba(59,130,246,0.18)",
    },
    {
      title: "Schedule",
      description: "Plan your day with BlueMind's smart calendar tools.",
      cta: "Explore",
      path: "/mobile/schedule",
      icon: Clipboard,
      accent: "rgba(56,189,248,0.72)",
      glow: "rgba(56,189,248,0.18)",
    },
  ], []);

  const bluemindMenuItems = [
    { label: "Smart Hub", path: "/mobile/smart-hub", icon: Brain },
    { label: "Reminders", path: "/mobile/reminders", icon: Bell },
    { label: "Learning", path: "/mobile/learning", icon: BookOpen },
    { label: "AI Plans", path: "/mobile/ai-plans", icon: Sparkles },
    { label: "Schedule", path: "/mobile/schedule", icon: Clipboard },
  ];

  const visibleConversations = useMemo(() => {
    const query = menuSearchQuery.trim();
    return query ? searchResults : conversations;
  }, [conversations, menuSearchQuery, searchResults]);

  const pinnedConversations = useMemo(
    () => conversations.filter((item) => item.pinned || item.isPinned).slice(0, 8),
    [conversations],
  );

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

  const searchResultsForCategory = useMemo(
    () => getSearchResultsForCategory(selectedSearchCategory),
    [selectedSearchCategory],
  );

  const hasTypedMessage = message.trim().length > 0;
  const hasConversationMessages = messages.length > 0;
  const hasGeneratedOutput = generatedImages.length > 0;
  const hasComposerContent = hasTypedMessage || attachedImages.length > 0 || writeAttachments.length > 0;
  const isToolFocusMode = isImageMode || isWriteEditMode || isSearchMode || Boolean(activeWriteTask);
  const isSmartFocusMode = isToolFocusMode || hasTypedMessage;
  const isEmptyChat = !isImageMode && !isWriteEditMode && !isSearchMode && !hasConversationMessages && !hasGeneratedOutput;
  const shouldPinComposer = true;
  const shouldShowImageTemplates = isImageMode && (!message.trim() || Boolean(selectedImageTemplate)) && attachedImages.length === 0 && !isGeneratingImage;
  const shouldShowWriteEditTemplates = isWriteEditMode && !message.trim() && writeAttachments.length === 0 && !activeWriteTask;
  const shouldShowSearchCards = isSearchMode && messages.length === 0 && generatedImages.length === 0;
  const {
    scrollRef: messagesScrollRef,
    endRef: messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  } = useChatAutoScroll({
    watch: [messages, isChatSending],
    isStreaming: isChatSending,
  });

  const pauseImageGalleryAutoScroll = useCallback(() => {
    imageGalleryAutoPausedRef.current = true;
    window.clearTimeout(imageGalleryResumeTimerRef.current);
  }, []);

  const resumeImageGalleryAutoScroll = useCallback((delay = 1200) => {
    window.clearTimeout(imageGalleryResumeTimerRef.current);
    imageGalleryResumeTimerRef.current = window.setTimeout(() => {
      imageGalleryAutoPausedRef.current = false;
    }, delay);
  }, []);

  useEffect(() => {
    if (!shouldShowImageTemplates) {
      return undefined;
    }

    const viewport = imageGalleryViewportRef.current;
    const loopBlock = imageGalleryLoopRef.current;
    if (!viewport || !loopBlock) {
      return undefined;
    }

    imageGalleryAutoPausedRef.current = false;
    let lastFrame = performance.now();

    const tick = (timestamp) => {
      const delta = Math.min(48, timestamp - lastFrame);
      lastFrame = timestamp;

      if (!imageGalleryAutoPausedRef.current && document.visibilityState !== "hidden") {
        const loopHeight = loopBlock.offsetHeight;
        if (loopHeight > viewport.clientHeight) {
          viewport.scrollTop += delta * 0.006;
          if (viewport.scrollTop >= loopHeight) {
            viewport.scrollTop -= loopHeight;
          }
        }
      }

      imageGalleryAutoFrameRef.current = window.requestAnimationFrame(tick);
    };

    imageGalleryAutoFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(imageGalleryAutoFrameRef.current);
      window.clearTimeout(imageGalleryResumeTimerRef.current);
      imageGalleryAutoPausedRef.current = false;
    };
  }, [shouldShowImageTemplates]);

  useEffect(() => {
    if (!imageTemplateConfirm) {
      return undefined;
    }

    pauseImageGalleryAutoScroll();

    return () => {
      resumeImageGalleryAutoScroll(900);
    };
  }, [imageTemplateConfirm, pauseImageGalleryAutoScroll, resumeImageGalleryAutoScroll]);

  useEffect(() => {
    const updateKeyboardState = () => {
      const viewport = window.visualViewport;
      const activeElement = document.activeElement;
      const composerFocused = activeElement === composerInputRef.current;

      if (!viewport) {
        setComposerKeyboardOffset(0);
        return;
      }

      const viewportBottom = viewport.height + viewport.offsetTop;
      const keyboardOffset = Math.max(0, Math.round(window.innerHeight - viewportBottom));
      const keyboardOpen = composerFocused && keyboardOffset > 48;

      setComposerKeyboardOffset(keyboardOpen ? keyboardOffset : 0);
    };

    updateKeyboardState();
    window.visualViewport?.addEventListener("resize", updateKeyboardState);
    window.visualViewport?.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("focusin", updateKeyboardState);
    window.addEventListener("focusout", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardState);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("focusin", updateKeyboardState);
      window.removeEventListener("focusout", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

  const resizeChatComposer = useCallback((node = composerInputRef.current) => {
    if (!node || isImageMode || isWriteEditMode) return;
    const maxHeight = 128;
    node.style.height = "auto";
    const nextHeight = Math.min(node.scrollHeight, maxHeight);
    node.style.height = `${Math.max(nextHeight, 50)}px`;
    node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [isImageMode, isWriteEditMode]);

  const updateResponseModeMenuPosition = useCallback(() => {
    const button = aiSelectorButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const safeHorizontalPadding = 14;
    const preferredWidth = Math.min(Math.max(viewportWidth * 0.82, 280), 390);
    const width = Math.min(preferredWidth, viewportWidth - safeHorizontalPadding * 2);

    setResponseModeMenuPosition({
      left: rect.left + rect.width / 2,
      top: rect.bottom + 10,
      width,
      maxHeight: Math.max(260, Math.min(viewportHeight - rect.bottom - 24, 560)),
    });
  }, []);

  const closeResponseModeMenu = useCallback(() => {
    setResponseModeMenuOpen(false);
  }, []);

  const toggleResponseModeMenu = useCallback(() => {
    setResponseModeMenuOpen((open) => {
      if (open) return false;
      updateResponseModeMenuPosition();
      return true;
    });
  }, [updateResponseModeMenuPosition]);

  useLayoutEffect(() => {
    if (!responseModeMenuOpen) return undefined;

    updateResponseModeMenuPosition();

    const viewport = window.visualViewport;
    const update = () => updateResponseModeMenuPosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [responseModeMenuOpen, updateResponseModeMenuPosition]);

  const normalizeFeatureCarouselX = useCallback((nextX) => {
    const cycleWidth = featureCarouselStep * featureCarouselCount;
    if (!cycleWidth) return nextX;

    let normalizedX = nextX;
    while (normalizedX <= -cycleWidth * 2) normalizedX += cycleWidth;
    while (normalizedX > 0) normalizedX -= cycleWidth;
    return normalizedX;
  }, [featureCarouselCount, featureCarouselStep]);

  useEffect(() => {
    const cycleWidth = featureCarouselStep * featureCarouselCount;
    if (!cycleWidth || featureCarouselX.get() !== 0) return;
    featureCarouselX.set(-cycleWidth);
  }, [featureCarouselCount, featureCarouselStep, featureCarouselX]);

  useLayoutEffect(() => {
    const measureFeatureCarousel = () => {
      const firstCard = featureCarouselTrackRef.current?.querySelector("[data-feature-card='true']");
      if (!firstCard) return;

      const rect = firstCard.getBoundingClientRect();
      const styles = window.getComputedStyle(featureCarouselTrackRef.current);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      setFeatureCarouselStep(rect.width + gap);
    };

    measureFeatureCarousel();
    window.addEventListener("resize", measureFeatureCarousel);
    window.visualViewport?.addEventListener("resize", measureFeatureCarousel);

    return () => {
      window.removeEventListener("resize", measureFeatureCarousel);
      window.visualViewport?.removeEventListener("resize", measureFeatureCarousel);
    };
  }, []);

  const scheduleFeatureCarouselAuto = useCallback((delay = 7200) => {
    window.clearTimeout(featureCarouselAutoTimerRef.current);
    if (!featureCarouselStep || menuOpen || menuSearchOpen) return;

    featureCarouselAutoTimerRef.current = window.setTimeout(() => {
      const cycleWidth = featureCarouselStep * featureCarouselCount;
      const currentX = normalizeFeatureCarouselX(featureCarouselX.get());
      const currentIndex = Math.round(-(currentX + cycleWidth) / featureCarouselStep);
      const targetX = -cycleWidth - (currentIndex + 1) * featureCarouselStep;

      featureCarouselAnimationRef.current?.stop?.();
      featureCarouselAnimationRef.current = animate(featureCarouselX, normalizeFeatureCarouselX(targetX), {
        duration: 3.8,
        ease: [0.42, 0, 0.58, 1],
        onComplete: () => {
          const nextX = normalizeFeatureCarouselX(featureCarouselX.get());
          featureCarouselX.set(nextX);
          scheduleFeatureCarouselAutoRef.current?.(7200);
        },
      });
    }, delay);
  }, [featureCarouselCount, featureCarouselStep, featureCarouselX, menuOpen, menuSearchOpen, normalizeFeatureCarouselX]);

  const pauseFeatureCarousel = useCallback(() => {
    window.clearTimeout(featureCarouselAutoTimerRef.current);
  }, []);

  useEffect(() => {
    scheduleFeatureCarouselAutoRef.current = scheduleFeatureCarouselAuto;
  }, [scheduleFeatureCarouselAuto]);

  useEffect(() => {
    scheduleFeatureCarouselAuto(7200);
    return () => window.clearTimeout(featureCarouselAutoTimerRef.current);
  }, [scheduleFeatureCarouselAuto]);

  const handleFeatureCarouselDragStart = useCallback(() => {
    featureCarouselAnimationRef.current?.stop?.();
    featureCarouselDraggingRef.current = true;
    pauseFeatureCarousel();
  }, [pauseFeatureCarousel]);

  const handleFeatureCarouselDragEnd = useCallback((_, info) => {
    featureCarouselDraggingRef.current = false;
    if (!featureCarouselStep) return;
    pauseFeatureCarousel();

    const projectedX = featureCarouselX.get() + info.velocity.x * 0.18;
    const cycleWidth = featureCarouselStep * featureCarouselCount;
    const targetIndex = Math.round(-(projectedX + cycleWidth) / featureCarouselStep);
    featureCarouselAnimationRef.current?.stop?.();
    featureCarouselAnimationRef.current = animate(featureCarouselX, normalizeFeatureCarouselX(-cycleWidth - targetIndex * featureCarouselStep), {
      duration: 1.05,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => {
        const nextX = normalizeFeatureCarouselX(featureCarouselX.get());
        featureCarouselX.set(nextX);
        scheduleFeatureCarouselAuto(2800);
      },
    });
  }, [featureCarouselCount, featureCarouselStep, featureCarouselX, normalizeFeatureCarouselX, pauseFeatureCarousel, scheduleFeatureCarouselAuto]);

  const {
    isListening,
    audioLevels: voiceAudioLevels,
    start: startVoiceCapture,
    stop: stopVoiceInput,
    cancel: cancelVoiceInput,
  } = useVoiceInput({
    onTranscript: (nextText) => {
      setMessage(nextText);
      window.requestAnimationFrame(() => resizeChatComposer(composerInputRef.current));
    },
    onError: (messageText) => toast.error(messageText),
  });

  const shouldShowChatHome =
    isEmptyChat &&
    !chatHomeDismissed &&
    !hasComposerContent &&
    !isChatSending &&
    !isGeneratingImage &&
    !isUploadingImages &&
    !isListening &&
    !isOpeningConversation;

  useEffect(() => {
    if (
      hasComposerContent ||
      hasConversationMessages ||
      hasGeneratedOutput ||
      isChatSending ||
      isGeneratingImage ||
      isUploadingImages ||
      isListening ||
      isOpeningConversation ||
      isToolFocusMode
    ) {
      setChatHomeDismissed(true);
    }
  }, [
    hasComposerContent,
    hasConversationMessages,
    hasGeneratedOutput,
    isChatSending,
    isGeneratingImage,
    isUploadingImages,
    isListening,
    isOpeningConversation,
    isToolFocusMode,
  ]);

  const redirectToMobileLogin = useCallback(() => {
    closeMenu();
    closeResponseModeMenu();
    navigate("/mobile", { replace: true });
  }, [closeResponseModeMenu, navigate]);

  const ensureMobileChatAuth = useCallback(async () => {
    try {
      await restoreExistingSession();
      return true;
    } catch {
      redirectToMobileLogin();
      return false;
    }
  }, [redirectToMobileLogin]);

  const loadConversationHistory = useCallback(async () => {
    setIsLoadingConversations(true);
    setHistoryError("");

    try {
      const authenticated = await ensureMobileChatAuth();
      if (!authenticated) return;

      if (chatSessionMode === "hidden") {
        setConversations([]);
        return;
      }

      const data = chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken
        ? await listPrivateSpaceChats(activePrivateSpace.privateSpaceId, privateSpaceAccessToken)
        : await listConversations();
      setConversations(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setHistoryError(error?.message || "Could not load chat history");
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [activePrivateSpace?.privateSpaceId, chatSessionMode, ensureMobileChatAuth, privateSpaceAccessToken]);

  useEffect(() => {
    resizeChatComposer();
  }, [message, resizeChatComposer, shouldPinComposer]);

  useEffect(() => {
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, redirectToMobileLogin);

    return () => {
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, redirectToMobileLogin);
    };
  }, [redirectToMobileLogin]);

  useEffect(() => {
    let cancelled = false;

    loadConversationHistory().catch(() => {
      if (!cancelled) setIsLoadingConversations(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadConversationHistory]);

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
        const authenticated = await ensureMobileChatAuth();
        if (!authenticated || cancelled) return;
        if (chatSessionMode === "hidden") {
          if (!cancelled) setSearchResults([]);
          return;
        }

        if (chatSessionMode === "private") {
          const normalized = query.toLowerCase();
          if (!cancelled) {
            setSearchResults(conversations.filter((item) => String(item.title || "").toLowerCase().includes(normalized)).slice(0, 20));
          }
          return;
        }

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
  }, [chatSessionMode, conversations, ensureMobileChatAuth, menuSearchOpen, menuSearchQuery]);

  useEffect(() => {
    attachedImagesRef.current = attachedImages;
  }, [attachedImages]);

  useEffect(() => {
    localStorage.setItem("bluemind-response-mode", responseMode);
  }, [responseMode]);

  useEffect(() => {
    localStorage.setItem(MOBILE_THINKING_LEVEL_STORAGE_KEY, thinkingLevel);
  }, [thinkingLevel]);

  useEffect(() => {
    localStorage.setItem(MOBILE_HEADER_MODEL_STORAGE_KEY, headerModelId);
  }, [headerModelId]);

  useEffect(() => {
    localStorage.setItem(MOBILE_HEADER_THINKING_STORAGE_KEY, headerThinkingEnabled ? "true" : "false");
  }, [headerThinkingEnabled]);

  useEffect(() => {
    const savedMode = normalizeAiModeId(prefs.aiMode || localStorage.getItem("bluemind-response-mode"));
    if (savedMode !== responseMode) {
      setResponseMode(savedMode);
    }
  }, [prefs.aiMode, responseMode]);

  useEffect(() => {
    if (searchParams.get("mode") === "image") {
      setIsImageMode(true);
      setIsWriteEditMode(false);
      setIsSearchMode(false);
    }

    if (searchParams.get("mode") === "write-edit") {
      setIsWriteEditMode(true);
      setIsImageMode(false);
      setIsSearchMode(false);
    }

    if (searchParams.get("mode") === "search") {
      setIsSearchMode(true);
      setIsImageMode(false);
      setIsWriteEditMode(false);
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

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuSearchOpen(false);
    setMenuSearchQuery("");
  };

  const openMenu = () => {
    closeResponseModeMenu();
    setMenuOpen(true);
    setMenuSearchOpen(false);
  };

  const openMenuSearch = () => {
    setMenuOpen(false);
    setMenuSearchOpen(true);
  };

  const closeMenuSearch = () => {
    setMenuSearchOpen(false);
    setMenuOpen(true);
  };

  const selectResponseMode = async (mode) => {
    const nextMode = normalizeAiModeId(mode);
    setResponseMode(nextMode);
    closeResponseModeMenu();
    try {
      await updatePreferences({ aiMode: nextMode });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save AI mode"));
    }
  };

  const goTo = (path) => {
    closeMenu();
    navigate(path);
  };

  const runMenuAction = (item) => {
    closeMenu();

    if (item.action) {
      item.action();
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
  };

  const loadConversationById = useCallback(async (conversationId, { updateUrl = true } = {}) => {
    if (!conversationId || isChatSending || isGeneratingImage || isOpeningConversation) return;

    setIsOpeningConversation(true);
    setChatMenuTarget(null);

    try {
      const authenticated = await ensureMobileChatAuth();
      if (!authenticated) return;
      const data = chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken
        ? await getPrivateSpaceChat(activePrivateSpace.privateSpaceId, conversationId, privateSpaceAccessToken)
        : await getConversation(conversationId);
      const conversation = data?.conversation;

      if (!conversation?.conversationId) {
        throw new Error(t("couldNotOpenChat"));
      }

      setMessage("");
      setIsImageMode(false);
      setIsWriteEditMode(false);
      setIsSearchMode(false);
      setSelectedSearchCategory(null);
      setOpenSearchMenuItemId(null);
      setExpandedSearchItemId(null);
      setSearchConfirm(null);
      setSelectedImageTemplate(null);
      setImageTemplateConfirm(null);
      setPendingImageTemplate(null);
      setGeneratedImages([]);
      setImageModeError("");
      setImageModeStatus("");
      setActiveWriteTask(null);
      setPendingWriteTemplate(null);
      setWriteAttachmentChoiceOpen(false);
      setWriteAttachments((current) => {
        current.forEach((file) => {
          if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
        });
        return [];
      });
      setAttachedImages((current) => {
        current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return [];
      });
      setMessages(mapMobileConversationMessages(conversation));
      setChatHomeDismissed(true);
      loadedConversationRef.current = conversation.conversationId;

      if (updateUrl) {
        setSearchParams({ conversation: conversation.conversationId });
      }
    } catch (error) {
      toast.error(error.message || t("couldNotOpenChat"));
    } finally {
      setIsOpeningConversation(false);
    }
  }, [activePrivateSpace?.privateSpaceId, chatSessionMode, ensureMobileChatAuth, isChatSending, isGeneratingImage, isOpeningConversation, privateSpaceAccessToken, setSearchParams, t]);

  useEffect(() => {
    if (
      !activeConversationId ||
      loadedConversationRef.current === activeConversationId ||
      isChatSending
    ) {
      return;
    }

    void loadConversationById(activeConversationId, { updateUrl: false });
  }, [activeConversationId, isChatSending, loadConversationById]);

  const startNewChat = () => {
    closeMenu();
    setChatHomeDismissed(false);
    setMessages([]);
    setMessage("");
    setIsImageMode(false);
    setIsWriteEditMode(false);
    setIsSearchMode(false);
    setSelectedSearchCategory(null);
    setOpenSearchMenuItemId(null);
    setExpandedSearchItemId(null);
    setSearchConfirm(null);
    setSelectedImageTemplate(null);
    setImageTemplateConfirm(null);
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
    loadedConversationRef.current = null;
    setSearchParams({});
    navigate("/mobile/chat", { replace: false });
  };

  const loadNormalConversationHistory = useCallback(async () => {
    const data = await listConversations();
    setConversations(Array.isArray(data?.items) ? data.items : []);
  }, []);

  const selectNormalChat = () => {
    setChatSessionMode("normal");
    setActivePrivateSpace(null);
    setPrivateSpaceAccessToken("");
    startNewChat();
    loadNormalConversationHistory().catch(() => {});
  };

  const selectWritingMode = () => {
    setChatSessionMode("writing");
    setActivePrivateSpace(null);
    setPrivateSpaceAccessToken("");
    startNewChat();
    loadNormalConversationHistory().catch(() => {});
  };

  const exitPrivateSpace = () => {
    setChatSessionMode("normal");
    setActivePrivateSpace(null);
    setPrivateSpaceAccessToken("");
    startNewChat();
    loadNormalConversationHistory().catch(() => {});
  };

  const startHiddenChat = () => {
    setChatSessionMode("hidden");
    setActivePrivateSpace(null);
    setPrivateSpaceAccessToken("");
    setHiddenChatModalOpen(false);
    setConversations([]);
    startNewChat();
  };

  const exitHiddenMode = () => {
    setChatSessionMode("normal");
    startNewChat();
    loadNormalConversationHistory().catch(() => {});
  };

  const loadMobilePrivateSpaces = useCallback(async () => {
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

  const openPrivateChatModal = useCallback(() => {
    closeMenu();
    setPrivateSpaceModalOpen(true);
    setPrivateSpaceStep("list");
    setPrivateSpaceError("");
    setSelectedPrivateSpace(null);
    setPrivatePinInput("");
    setPrivateSpaceActionMenuId(null);
    setPrivateSpaceDeleteTarget(null);
    loadMobilePrivateSpaces().then((items) => {
      setPrivateSpaceStep(items.length ? "list" : "create");
    }).catch(() => {});
  }, [loadMobilePrivateSpaces]);

  const handleCreatePrivateSpace = async (event) => {
    event.preventDefault();
    setPrivateSpaceError("");
    setIsCreatingPrivateSpace(true);
    try {
      await createPrivateSpace(privateSpaceForm);
      setPrivateSpaceForm({ name: "", pin: "", confirmPin: "" });
      setPrivateSpaceStep("list");
      await loadMobilePrivateSpaces();
      toast.success("Private space created");
    } catch (error) {
      setPrivateSpaceError(error.message || "Could not create private chat");
    } finally {
      setIsCreatingPrivateSpace(false);
    }
  };

  const startCreatePrivateSpace = () => {
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
      startNewChat();
      const chats = await listPrivateSpaceChats(unlockedSpace.privateSpaceId, data?.accessToken || "");
      setConversations(Array.isArray(chats?.items) ? chats.items : []);
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
        exitPrivateSpace();
      }
      setPrivateSpaceDeleteTarget(null);
      setSelectedPrivateSpace(null);
      setPrivateSpaceStep("list");
    } catch (error) {
      setPrivateSpaceError(error.message || "Could not delete private chat");
    }
  };

  const openConversation = (conversationId) => {
    closeMenu();
    setMenuSearchOpen(false);
    void loadConversationById(conversationId);
  };

  const toggleChatHistory = () => {
    setChatMenuTarget(null);
    setChatHistoryOverflowVisible(false);
    setChatHistoryExpanded((current) => !current);
  };

  const openRenameDialog = (conversation) => {
    setChatMenuTarget(null);
    setRenameTarget(conversation);
    setRenameTitle(conversation.title || "");
  };

  const handleRenameSubmit = async (event) => {
    event.preventDefault();
    if (!renameTarget || !renameTitle.trim()) return;

    const previousConversations = conversations;
    const nextTitle = renameTitle.trim();
    setConversations((current) => current.map((item) => (
      item.conversationId === renameTarget.conversationId
        ? { ...item, title: nextTitle }
        : item
    )));
    setSearchResults((current) => current.map((item) => (
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
      await loadConversationHistory();
    } catch (error) {
      setConversations(previousConversations);
      toast.error(error.message || "Could not rename conversation");
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteTarget) return;

    const target = deleteTarget;
    const previousConversations = conversations;
    setDeleteTarget(null);
    setChatMenuTarget(null);
    setConversations((current) => current.filter((item) => item.conversationId !== target.conversationId));
    setSearchResults((current) => current.filter((item) => item.conversationId !== target.conversationId));

    if (activeConversationId === target.conversationId) {
      startNewChat();
    }

    try {
      if (chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken) {
        await deletePrivateSpaceChat(activePrivateSpace.privateSpaceId, target.conversationId, privateSpaceAccessToken);
      } else {
        await deleteChat(target.conversationId);
      }
    } catch (error) {
      setConversations(previousConversations);
      toast.error(error.message || "Could not delete conversation");
    }
  };

  const handleShareConversation = async (conversation) => {
    setChatMenuTarget(null);
    try {
      const result = await shareChat(conversation, { appName: APP_NAME });
      if (result.method === "clipboard") {
        toast.success("Link copied");
      }
    } catch {
      toast.info("Copy link unavailable");
    }
  };

  const clearMobileFlowParams = () => {
    const conversation = searchParams.get("conversation");
    setSearchParams(conversation ? { conversation } : {});
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    touchStartYRef.current = event.touches?.[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches?.[0]?.clientX;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (typeof startX === "number" && typeof endX === "number" && startX - endX > 70) {
      closeMenu();
    }
  };

  const handlePageTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    touchStartYRef.current = event.touches?.[0]?.clientY ?? null;
  };

  const handlePageTouchMove = (event) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const currentTouch = event.touches?.[0];
    if (
      !menuOpen &&
      !menuSearchOpen &&
      typeof startX === "number" &&
      typeof startY === "number" &&
      currentTouch &&
      startX <= 26 &&
      currentTouch.clientX - startX > 12 &&
      Math.abs(currentTouch.clientY - startY) < 42
    ) {
      event.preventDefault();
    }
  };

  const handlePageTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const endX = event.changedTouches?.[0]?.clientX;
    const endY = event.changedTouches?.[0]?.clientY;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (
      !menuOpen &&
      !menuSearchOpen &&
      typeof startX === "number" &&
      typeof startY === "number" &&
      typeof endX === "number" &&
      typeof endY === "number" &&
      startX <= 26 &&
      endX - startX > 76 &&
      Math.abs(endY - startY) < 54
    ) {
      openMenu();
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
    setIsSearchMode(false);
    setImageModeError("");
    setAttachmentSheetOpen(false);
  };

  const exitImageMode = () => {
    setIsImageMode(false);
    setSelectedImageTemplate(null);
    setImageTemplateConfirm(null);
    setPendingImageTemplate(null);
    setImageModeError("");
    setImageModeStatus("");
  };

  const enterWriteEditMode = () => {
    setIsWriteEditMode(true);
    setIsImageMode(false);
    setIsSearchMode(false);
    setAttachmentSheetOpen(false);
    setImageModeError("");
    setImageModeStatus("");
  };

  const exitWriteEditMode = () => {
    clearWriteTask();
    setIsWriteEditMode(false);
  };

  const enterSearchMode = () => {
    setIsSearchMode(true);
    setIsImageMode(false);
    setIsWriteEditMode(false);
    setSelectedSearchCategory(null);
    setOpenSearchMenuItemId(null);
    setExpandedSearchItemId(null);
    setSearchConfirm(null);
    setAttachmentSheetOpen(false);
    setImageModeError("");
    setImageModeStatus("");
  };

  const exitSearchMode = () => {
    clearMobileFlowParams();
    setIsSearchMode(false);
    setSelectedSearchCategory(null);
    setOpenSearchMenuItemId(null);
    setExpandedSearchItemId(null);
    setSearchConfirm(null);
    setMessage("");
  };

  const selectImageTemplate = (template) => {
    setIsImageMode(true);
    setSelectedImageTemplate(template);
    setImageTemplateConfirm(null);
    setPendingImageTemplate(null);
    setMessage(template.prompt);
    setImageModeError("");
    setImageModeStatus("");
  };

  const requestImageTemplateUse = (template) => {
    setImageTemplateConfirm(template);
  };

  const cancelImageTemplateUse = () => {
    setImageTemplateConfirm(null);
  };

  const confirmImageTemplateUse = () => {
    if (!imageTemplateConfirm) return;
    selectImageTemplate(imageTemplateConfirm);
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

  const removeWriteAttachment = (attachmentId) => {
    setWriteAttachments((current) => {
      const target = current.find((file) => file.id === attachmentId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((file) => file.id !== attachmentId);
    });
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
    setIsSearchMode(false);
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

  const openFileInput = (inputRef, source = "file") => {
    const input = inputRef.current;
    console.debug("[BlueMind media picker] input requested", {
      source,
      hasInput: Boolean(input),
      accept: input?.accept || "",
      capture: input?.capture || "",
      multiple: Boolean(input?.multiple),
    });

    if (!input) {
      console.error("[BlueMind media picker] file input is missing", { source });
      return;
    }

    try {
      input.click();
    } catch (error) {
      console.error("[BlueMind media picker] failed to open file input", { source, error });
      return;
    }

    window.requestAnimationFrame(() => {
      closeAttachmentSheet();
      closeImageSourceSheet();
    });
  };

  const openTemplateImageInput = (inputRef) => {
    closeAttachmentSheet();
    closeImageSourceSheet();
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const handleWriteAttachmentSelection = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const accepted = [];

    for (const file of selectedFiles) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = file.type.startsWith("image/");
      const isText = file.type === "text/plain" || ["txt", "md", "csv", "rtf"].includes(extension);
      const isPdf = file.type === "application/pdf" || extension === "pdf";
      const isDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension);

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

    if (pendingWriteTemplate) {
      activateWriteTask(pendingWriteTemplate, accepted.slice(0, 6));
      return;
    }

    setIsWriteEditMode(true);
    setWriteAttachments((current) => [...current, ...accepted].slice(0, 10));
  };

  const handleImageSelection = async (event) => {
    if (pendingWriteTemplate) {
      void handleWriteAttachmentSelection(event);
      return;
    }

    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    const templateForSelection = pendingImageTemplate;
    const isCameraCapture = event.target === cameraInputRef.current;
    if (isImageMode || templateForSelection) {
      setIsImageMode(true);
    }
    if (templateForSelection) {
      setSelectedImageTemplate(templateForSelection);
      setMessage(templateForSelection.prompt);
      setPendingImageTemplate(null);
    }
    setImageModeError("");

    const availableSlots = Math.max(0, MAX_IMAGE_ATTACHMENTS - attachedImagesRef.current.length);
    const filesToUpload = files.slice(0, availableSlots);
    if (!filesToUpload.length) return;

    setIsUploadingImages(true);
    const uploadedImages = [];

    try {
      for (const file of filesToUpload) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
          toast.error(t("invalidImageType"));
          continue;
        }

        if (file.size > 8 * 1024 * 1024) {
          toast.error(t("invalidImageSize"));
          continue;
        }

        try {
          const image = await uploadChatImage(file, activeConversationId);
          if (image?.id) {
            uploadedImages.push({
              id: image.id,
              name: file.name,
              previewUrl: URL.createObjectURL(file),
              file,
            });
          }
        } catch (error) {
          toast.error(error.message || t("imageUploadFailed"));
        }
      }

      if (uploadedImages.length) {
        setAttachedImages((current) => (
          isCameraCapture
            ? [...uploadedImages, ...current]
            : [...current, ...uploadedImages]
        ).slice(0, MAX_IMAGE_ATTACHMENTS));
      }
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeAttachedImage = (imageId) => {
    setAttachedImages((current) => {
      const target = current.find((image) => image.id === imageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const nextImages = current.filter((image) => image.id !== imageId);
      if (nextImages.length === 0 && isImageMode && !selectedImageTemplate) {
        window.setTimeout(() => setIsImageMode(false), 0);
      }
      return nextImages;
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

  const startVoiceInput = useCallback(() => {
    if (isListening) {
      stopVoiceInput();
      return;
    }
    startVoiceCapture({
      baseText: message,
      language: prefs?.language || uiLanguage || navigator.language || "en-US",
    });
  }, [isListening, message, prefs?.language, startVoiceCapture, stopVoiceInput, uiLanguage]);

  const appendAiDelta = useCallback((messageId, token) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? { ...item, content: `${item.content || ""}${token || ""}` }
          : item,
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

  const stopChatGeneration = useCallback(() => {
    stopRequestedRef.current = true;
    streamAbortRef.current?.abort();
    flushAiDelta();
    streamAbortRef.current = null;
    activeAiMessageRef.current = null;
    sendLockRef.current = false;
    setIsChatSending(false);
    setMessages((current) =>
      current.map((item) =>
        item.isStreaming
          ? { ...item, isStreaming: false }
          : item,
      ),
    );
  }, [flushAiDelta]);

  const sendChatPrompt = useCallback(async ({
    prompt,
    keepComposer = false,
    mode = responseMode,
    metadata = {},
    hideUserMessage = false,
    imageIds = [],
    displayAttachments = [],
    prelocked = false,
    allowWhileBusy = false,
  }) => {
    const visibleMessage = String(prompt || "").trim();
    const currentMessage = activeWriteTask
      ? buildWriteEditMessage(visibleMessage, writeAttachments)
      : visibleMessage;
    const isSearchHandoff = String(metadata?.source || metadata?.searchContext?.source || "").toLowerCase() === "search";
    const canStartFromContext = isSearchHandoff && metadata?.intent && (metadata?.category || metadata?.searchContext?.category);
    const userDisplayAttachments = displayAttachments.length ? displayAttachments : writeAttachments;
    const displayAttachmentImageIds = userDisplayAttachments
      .map((attachment) => attachment?.id)
      .filter(Boolean);
    const writeAttachmentImageIds = writeAttachments.map((file) => file.imageId).filter(Boolean);
    const requestImageIds = imageIds.length
      ? imageIds
      : activeWriteTask
        ? writeAttachmentImageIds
        : displayAttachmentImageIds.length
          ? displayAttachmentImageIds
          : [];
    if (
      (!currentMessage && !requestImageIds.length && !canStartFromContext)
      || isGeneratingImage
      || (!allowWhileBusy && isChatSending)
      || (!prelocked && sendLockRef.current)
    ) return;
    if (!prelocked) {
      sendLockRef.current = true;
    }
    setIsChatSending(true);
    if (isListening) stopVoiceInput();

    const selectedMode = normalizeAiModeId(mode || responseMode);
    const authenticated = await ensureMobileChatAuth();
    if (!authenticated) {
      sendLockRef.current = false;
      setIsChatSending(false);
      return;
    }
    const userMessageId = crypto.randomUUID();
    const aiMessageId = crypto.randomUUID();
    const userMetadata = {
      chatMode: "chat",
      ...metadata,
      mode: selectedMode,
      responseMode: selectedMode,
      aiMode: selectedMode,
      blueMindModel: headerModelId,
      thinkingLevel,
      chatMode: activeWriteTask ? "write_edit" : metadata.chatMode || "chat",
      writeEditTask: activeWriteTask || undefined,
    };
    const userDisplayMessages = hideUserMessage
      ? []
      : (visibleMessage || userDisplayAttachments.length ? [{
          id: userMessageId,
          role: "user",
          content: visibleMessage,
          attachments: userDisplayAttachments,
          metadata: {
            ...userMetadata,
            splitKind: userDisplayAttachments.length && visibleMessage ? "image_text" : userDisplayAttachments.length ? "images" : "text",
          },
        }] : []);

    setMessages((current) => [
      ...current,
      ...userDisplayMessages,
      { id: aiMessageId, role: "ai", content: "", isStreaming: true, metadata: { ...userMetadata, requestContent: visibleMessage } },
    ]);
    window.requestAnimationFrame(() => scrollToBottom("smooth"));

    if (!keepComposer) {
      setMessage("");
      composerInputRef.current?.blur();
      setComposerKeyboardOffset(0);
      setActiveWriteTask(null);
      setPendingWriteTemplate(null);
      setWriteAttachmentChoiceOpen(false);
      setWriteAttachments([]);
      setAttachedImages([]);
      setIsImageMode(false);
      setSelectedImageTemplate(null);
      setPendingImageTemplate(null);
      setIsWriteEditMode(false);
      setIsSearchMode(false);
      setSelectedSearchCategory(null);
      setOpenSearchMenuItemId(null);
      setExpandedSearchItemId(null);
      setSearchConfirm(null);
    }

    setImageModeError("");
    stopRequestedRef.current = false;
    activeAiMessageRef.current = aiMessageId;
    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const streamMessage = chatSessionMode === "hidden"
        ? streamHiddenChatMessage
        : chatSessionMode === "private"
          ? streamPrivateSpaceMessage
          : streamChatMessage;

      await streamMessage({
        message: currentMessage,
        imageIds: requestImageIds,
        conversationId: chatSessionMode === "hidden" ? undefined : activeConversationId,
        privateSpaceId: activePrivateSpace?.privateSpaceId,
        accessToken: privateSpaceAccessToken,
        mode: selectedMode,
        metadata: {
          ...userMetadata,
          chatSessionMode,
          privateSpaceId: chatSessionMode === "private" ? activePrivateSpace?.privateSpaceId : undefined,
          hiddenChat: chatSessionMode === "hidden" || undefined,
        },
        signal: controller.signal,
        onReady: (payload) => {
          if (payload?.conversation?.conversationId && chatSessionMode !== "hidden") {
            setSearchParams({ conversation: payload.conversation.conversationId });
          }
        },
        onDelta: (payload) => {
          queueAiDelta(aiMessageId, payload?.token);
        },
        onComplete: (payload) => {
          flushAiDelta(aiMessageId);
          if (payload?.conversation?.conversationId && chatSessionMode !== "hidden") {
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
      flushAiDelta(aiMessageId);
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
      sendLockRef.current = false;
    }
  }, [activeConversationId, activePrivateSpace?.privateSpaceId, activeWriteTask, chatSessionMode, ensureMobileChatAuth, flushAiDelta, headerModelId, isChatSending, isGeneratingImage, isListening, privateSpaceAccessToken, queueAiDelta, responseMode, scrollToBottom, setSearchParams, stopVoiceInput, thinkingLevel, writeAttachments]);

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
      mode: previousUser.metadata?.aiMode || previousUser.metadata?.mode || previousUser.metadata?.responseMode || responseMode,
      metadata: previousUser.metadata || {},
      imageIds: (previousUser.attachments || []).map((attachment) => attachment.id).filter(Boolean),
      displayAttachments: previousUser.attachments || [],
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

  const getPreviousUserContent = useCallback((messageIndex) => {
    const previousUser = [...messages.slice(0, messageIndex)].reverse().find((item) => item.role === "user");
    return previousUser?.content || "";
  }, [messages]);

  const openSearchAskConfirm = ({ category, item = null, intent }) => {
    setOpenSearchMenuItemId(null);
    setSearchConfirm({ category, item, intent });
  };

  const copySearchItemName = async (item) => {
    try {
      await navigator.clipboard.writeText(item.title);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    } finally {
      setOpenSearchMenuItemId(null);
    }
  };

  const continueSearchWithAi = async () => {
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
    setIsSearchMode(false);
    setSelectedSearchCategory(null);
    setOpenSearchMenuItemId(null);
    setExpandedSearchItemId(null);
    setMessage("");

    await sendChatPrompt({
      prompt: "",
      metadata: {
        source: "search",
        chatMode: "web_search",
        category: category.id,
        categoryTitle: category.title,
        selectedItem: item?.title,
        intent,
        searchContext,
      },
      hideUserMessage: true,
    });
  };

  const handleComposerSubmit = async (event) => {
    event.preventDefault();
    if (!hasComposerContent || isGeneratingImage || isUploadingImages || isChatSending || sendLockRef.current) return;

    if (!isImageMode) {
      const currentMessage = message.trim();
      if (!currentMessage && attachedImages.length === 0) return;
      await sendChatPrompt({
        prompt: currentMessage || "Please analyze these images.",
        imageIds: attachedImages.map((image) => image.id).filter(Boolean),
        displayAttachments: attachedImages,
        metadata: isSearchMode ? { chatMode: "web_search" } : {},
      });
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

  const renderComposerArea = (centered = false, separatePlus = centered) => {
    const composerModePill = isImageMode
      ? { label: selectedImageTemplate?.title ? `Create Image • ${selectedImageTemplate.title}` : "Create Image", onClear: exitImageMode, clearLabel: "Exit image mode" }
      : (isWriteEditMode || activeWriteTask)
        ? { label: "Write/Edit", onClear: exitWriteEditMode, clearLabel: "Exit write edit mode" }
        : isSearchMode
          ? { label: "Search", onClear: exitSearchMode, clearLabel: "Exit search mode" }
          : null;

    const composerAttachments = isImageMode
      ? [
          ...(selectedImageTemplate?.thumbnail ? [{
            id: `template:${selectedImageTemplate.id}`,
            name: selectedImageTemplate.title,
            type: "image",
            previewUrl: selectedImageTemplate.thumbnail,
          }] : []),
          ...attachedImages,
        ]
      : (isWriteEditMode || activeWriteTask)
        ? writeAttachments
        : attachedImages;

    const removeComposerAttachment = (attachmentId) => {
      if (String(attachmentId).startsWith("template:")) {
        removeSelectedImageTemplate();
        return;
      }

      if (isImageMode || (!isWriteEditMode && !activeWriteTask)) {
        removeAttachedImage(attachmentId);
        return;
      }

      removeWriteAttachment(attachmentId);
    };

    const clearComposerAttachments = () => {
      if (isImageMode || (!isWriteEditMode && !activeWriteTask)) {
        setAttachedImages((current) => {
          current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
          return [];
        });
        setSelectedImageTemplate(null);
        if (isImageMode) setIsImageMode(false);
        return;
      }

      writeAttachments.forEach((file) => {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      });
      setWriteAttachments([]);
    };

    const openComposerAttachment = () => {
      if (isImageMode) {
        setImageSourceSheetOpen(true);
        return;
      }

      setAttachmentSheetOpen(true);
    };

    const quickActionChips = [
      { label: "Write / Edit", icon: PenLine, onClick: enterWriteEditMode },
      { label: "Create Images", icon: Image, onClick: enterImageMode },
      { label: "Search", icon: Search, onClick: enterSearchMode },
      { label: "Open Camera", icon: Camera, onClick: () => openFileInput(cameraInputRef, "camera") },
      { label: "Files / Photos", icon: FileText, onClick: () => openFileInput(imageInputRef, "photos") },
    ];

    return (
    <motion.div
      layout
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={
        centered
          ? "mx-auto w-full max-w-[430px] px-1"
          : "px-4 pb-[calc(env(safe-area-inset-bottom)+8px)]"
      }
    >
      {(imageModeError || imageModeStatus) && (
        <div className={`mb-2 rounded-2xl px-3 py-2 text-xs font-bold ${
          imageModeError
            ? isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-600"
            : isDark ? "bg-white/[0.06] text-[var(--bm-text-secondary)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-primary)]"
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
              isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)]/[0.92] text-white" : "border-white/70 bg-white/[0.88] text-[var(--bm-text-primary)]"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3 text-left">
              <div>
                <p className="text-sm font-bold">{pendingWriteTemplate.title}</p>
                <p className={`mt-1 text-xs font-semibold leading-5 ${isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]"}`}>
                  Choose an optional attachment or continue manually.
                </p>
              </div>
              <button
                type="button"
                onClick={continueWriteTaskWithoutAttachment}
                className="bm-mobile-glass-control"
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
                  className={isDark ? "h-11 rounded-2xl bg-white/[0.08] text-sm font-bold text-white active:bg-white/[0.13]" : "h-11 rounded-2xl bg-[var(--bm-hover-bg)] text-sm font-bold text-[var(--bm-primary)] active:bg-[var(--bm-active-bg)]"}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {shouldShowChatHome && (
          <motion.div
            key="mobile-quick-action-chips"
            className="-mx-4 mb-3 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            data-testid="mobile-quick-action-chips"
            initial={{ opacity: 0, height: 0, y: 8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 8 }}
            transition={{ duration: 0.23, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex w-max min-w-full items-center gap-2.5">
              {quickActionChips.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/[0.055] bg-[rgba(78,78,78,0.18)] px-3.5 text-[13px] font-bold text-white/84 backdrop-blur-[42px] transition-colors hover:bg-[rgba(96,96,96,0.2)] active:bg-[rgba(106,106,106,0.22)]"
                    style={mobileGlassControlStyle}
                    aria-label={action.label}
                  >
                    <ActionIcon className="h-4 w-4 shrink-0 stroke-[2.3] text-white/74" />
                    <span className="whitespace-nowrap">{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UnifiedComposer
        value={message}
        onFocus={() => setChatHomeDismissed(true)}
        onChange={(event) => {
          setMessage(event.target.value);
          if (!isImageMode && !isWriteEditMode) {
            resizeChatComposer(event.target);
          }
        }}
        onInput={(event) => {
          if (!isImageMode && !isWriteEditMode) {
            resizeChatComposer(event.currentTarget);
          }
        }}
        onSubmit={handleComposerSubmit}
        inputRef={composerInputRef}
        placeholder={
          isImageMode
            ? "Describe an image..."
            : (isWriteEditMode || activeWriteTask)
              ? "Write, paste, or choose a productivity tool..."
            : isSearchMode
                ? "Ask AI to search..."
                : attachedImages.length
                  ? "Ask about these images..."
              : "Ask anything..."
        }
        modePill={composerModePill}
        attachments={composerAttachments}
        onRemoveAttachment={removeComposerAttachment}
        onClearAttachments={clearComposerAttachments}
        isUploading={isUploadingImages}
        onAdd={openComposerAttachment}
        onVoice={startVoiceInput}
        isListening={isListening}
        voiceAudioLevels={voiceAudioLevels}
        onCancelVoice={cancelVoiceInput}
        onFinishVoice={stopVoiceInput}
        isBusy={isGeneratingImage || isChatSending || isListening}
        canSend={hasComposerContent}
        onSendAction={isChatSending ? stopChatGeneration : isListening ? stopVoiceInput : undefined}
        isDark={isDark}
        variant="mobile"
        minRows={isImageMode || isWriteEditMode || activeWriteTask || isSearchMode ? 3 : 1}
        maxTextHeight={isImageMode || isWriteEditMode || activeWriteTask || isSearchMode ? 180 : 128}
        testId="mobile-chat-input"
      />

    </motion.div>
    );
  };

  const renderHomeQuickActions = () => {
    const quickActions = [
      { label: "Create Image", icon: Image, onClick: enterImageMode },
      { label: "Write / Edit", icon: PenLine, onClick: enterWriteEditMode },
      { label: "Search", icon: Search, onClick: enterSearchMode },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="mb-3 flex flex-wrap items-center justify-center gap-2 px-4"
        data-testid="mobile-home-quick-actions"
      >
        {quickActions.map((action) => {
          const ActionIcon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.055] bg-[rgba(78,78,78,0.18)] px-3 text-[13px] font-bold text-white/84 backdrop-blur-[42px] transition-all duration-200 ease-out active:scale-[0.98] active:bg-[rgba(106,106,106,0.22)]"
              style={mobileGlassControlStyle}
            >
              <ActionIcon className="h-4 w-4 shrink-0 stroke-[2.2] text-white/74" />
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </motion.div>
    );
  };

  const renderMobileConversationRow = (item, context = "menu") => {
    const menuId = `${context}:${item.conversationId}`;
    const isActive = item.conversationId === activeConversationId;

    return (
      <div
        key={menuId}
        className="relative py-2.5"
      >
        <button
          type="button"
          onClick={() => openConversation(item.conversationId)}
          className="flex w-full min-w-0 items-start pr-12 text-left"
          data-testid={`mobile-chat-row-${item.conversationId}`}
        >
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-semibold ${typeClasses.body} ${isActive ? isDark ? "text-white" : "text-[var(--bm-primary)]" : textColor}`}>
              {item.title || t("newChat")}
            </span>
            <span className={`mt-1 block truncate font-medium ${typeClasses.small} ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>
              {formatConversationTime(item.lastMessageAt || item.updatedAt, uiLanguage)}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setChatMenuTarget((current) => current === menuId ? null : menuId);
          }}
          className="bm-mobile-glass-control absolute right-0 top-2"
          aria-label="Conversation actions"
          data-testid={`mobile-chat-menu-${item.conversationId}`}
        >
          <MoreVertical className={iconClasses.button} />
        </button>

        <AnimatePresence>
          {chatMenuTarget === menuId && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[90]"
                onClick={() => setChatMenuTarget(null)}
                aria-label="Close conversation actions"
              />
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={`bm-glass-panel absolute right-0 top-12 z-[95] w-44 overflow-hidden rounded-[22px] border p-1.5 ${isDark ? "text-white" : "text-[var(--bm-text-primary)]"}`}
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => openRenameDialog(item)}
                  className={isDark ? `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold active:bg-white/[0.08] ${typeClasses.small} ${iconClasses.iconText}` : `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold active:bg-[var(--bm-hover-bg)] ${typeClasses.small} ${iconClasses.iconText}`}
                  role="menuitem"
                >
                  <PenLine className={iconClasses.button} />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => handleShareConversation(item)}
                  className={isDark ? `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold active:bg-white/[0.08] ${typeClasses.small} ${iconClasses.iconText}` : `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold active:bg-[var(--bm-hover-bg)] ${typeClasses.small} ${iconClasses.iconText}`}
                  role="menuitem"
                >
                  <Share2 className={iconClasses.button} />
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatMenuTarget(null);
                    setDeleteTarget(item);
                  }}
                  className={isDark ? `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold text-red-300 active:bg-red-950/30 ${typeClasses.small} ${iconClasses.iconText}` : `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold text-red-500 active:bg-red-50 ${typeClasses.small} ${iconClasses.iconText}`}
                  role="menuitem"
                >
                  <Trash2 className={iconClasses.button} />
                  Delete
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderFeatureCarousel = () => {
    const carouselCards = [...mobileFeatureCards, ...mobileFeatureCards, ...mobileFeatureCards];

    return (
      <motion.section
        key="mobile-feature-carousel"
        className="shrink-0 overflow-hidden pb-3 pt-20"
        data-testid="mobile-feature-carousel"
        initial={{ opacity: 0, height: 0, y: -8 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0, y: -8 }}
        transition={{ duration: 0.23, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="overflow-hidden">
          <motion.div
            ref={featureCarouselTrackRef}
            className="flex gap-3 px-4"
            style={{ x: featureCarouselX }}
            drag="x"
            dragMomentum={false}
            dragElastic={0}
            onDragStart={handleFeatureCarouselDragStart}
            onDragEnd={handleFeatureCarouselDragEnd}
          >
            {carouselCards.map((card, index) => {
              const FeatureIcon = card.icon;
              return (
                <article
                  key={`${card.title}-${index}`}
                  data-feature-card="true"
                  className="relative flex h-[clamp(104px,14dvh,136px)] w-[86vw] shrink-0 overflow-hidden rounded-[28px] border border-white/[0.055] bg-[rgba(78,78,78,0.18)] px-4 py-3 text-white/90 backdrop-blur-[42px]"
                  style={mobileGlassPanelStyle}
                >
                  <div
                    className="absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl"
                    style={{ backgroundColor: card.glow }}
                    aria-hidden="true"
                  />
                  <div
                    className="mr-3 flex h-full w-[34%] min-w-[92px] shrink-0 items-center justify-center rounded-[24px] border border-white/[0.045] bg-[rgba(255,255,255,0.028)]"
                    style={{
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 1px 0 0 rgba(255,255,255,0.026), inset -1px 0 0 rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className="relative flex h-[72px] w-[72px] items-center justify-center">
                      <span className="absolute inset-0 rounded-full border border-white/[0.045]" />
                      <span className="absolute h-12 w-12 rounded-full" style={{ backgroundColor: card.glow }} />
                      <FeatureIcon className="relative h-9 w-9 stroke-[2.2]" style={{ color: card.accent }} />
                    </div>
                  </div>

                  <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
                    <h3 className="truncate text-base font-black tracking-tight text-white/90">{card.title}</h3>
                    <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-4 text-[#B7B7B7]">
                      {card.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => goTo(card.path)}
                      className="mt-2 inline-flex h-8 w-fit items-center gap-1 rounded-full border border-white/[0.055] bg-[rgba(96,96,96,0.16)] px-3 text-[12px] font-black text-white/88 transition-all active:scale-95 active:bg-[rgba(106,106,106,0.2)]"
                      style={mobileGlassControlStyle}
                    >
                      {card.cta}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </motion.div>
        </div>

      </motion.section>
    );
  };

  const renderMobilePlusMenu = () => {
    const plusActions = [
      { label: "Camera", icon: Camera, onClick: () => openFileInput(cameraInputRef, "camera") },
      { label: "Photos", icon: Image, onClick: () => openFileInput(imageInputRef, "photos") },
      { label: "Files", icon: FileText, onClick: () => openFileInput(fileInputRef, "files") },
      { label: "Write / Edit", icon: PenLine, onClick: enterWriteEditMode },
      { label: "Create Images", icon: Sparkles, onClick: enterImageMode },
      { label: "Search", icon: Search, onClick: enterSearchMode },
    ];

    return (
      <AnimatePresence>
        {attachmentSheetOpen && (
          <div className="fixed inset-0 z-[88] flex items-end justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+118px)]">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/38 backdrop-blur-[5px]"
              onClick={closeAttachmentSheet}
              aria-label="Close action menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            />

            <motion.section
              className="relative z-10 w-full max-w-[356px] rounded-[32px] border border-white/[0.055] bg-[rgba(78,78,78,0.18)] p-4 text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.016),inset_1px_0_0_rgba(255,255,255,0.032),inset_-1px_0_0_rgba(255,255,255,0.026),0_24px_68px_rgba(0,0,0,0.34)] backdrop-blur-[42px]"
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              data-testid="mobile-plus-action-menu"
            >
              <div className="grid grid-cols-2 gap-3">
                {plusActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <motion.button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      whileTap={{ scale: 0.96 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="flex h-[88px] min-w-0 flex-col items-center justify-center rounded-[24px] border border-white/[0.05] bg-[rgba(255,255,255,0.032)] px-2 text-center font-extrabold text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] transition-colors active:bg-[rgba(255,255,255,0.065)]"
                    >
                      <ActionIcon className="mb-2 h-7 w-7 stroke-[2.25] text-white/78" />
                      <span className="text-[13px] leading-tight tracking-tight">{action.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-center">
                <motion.button
                  type="button"
                  onClick={closeAttachmentSheet}
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="bm-mobile-glass-control"
                  aria-label="Close action menu"
                >
                  <X className="h-5 w-5 stroke-[2.4]" />
                </motion.button>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <main
      className={`fixed inset-0 flex flex-col overflow-hidden ${textColor}`}
      style={{
        backgroundColor: surfaceColor,
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onTouchStart={handlePageTouchStart}
      onTouchMove={handlePageTouchMove}
      onTouchEnd={handlePageTouchEnd}
      data-testid="mobile-chat-page"
    >
      <header className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-40 flex h-16 items-center justify-between bg-transparent px-4 shadow-none backdrop-blur-0">
        <div className="flex w-12 items-center justify-start">
          <button
            type="button"
            onClick={openMenu}
            className={`pointer-events-auto ${mobileGlassControlClass}`}
            aria-label="Open menu"
          >
            <Menu />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-3 flex items-center justify-center">
          <button
            ref={aiSelectorButtonRef}
            type="button"
            onClick={toggleResponseModeMenu}
            className={`pointer-events-auto ${mobileGlassSelectorClass}`}
            style={mobileGlassControlStyle}
            aria-label="Select AI mode"
            aria-expanded={responseModeMenuOpen}
          >
            {(() => {
              const SelectedModeIcon = getAiMode(responseMode).icon;
              return <SelectedModeIcon className="h-[17px] w-[17px] stroke-[2.25]" />;
            })()}
            <span className="truncate">{getAiSpecializationLabel(responseMode)}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${responseModeMenuOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence onExitComplete={() => setResponseModeMenuPosition(null)}>
            {responseModeMenuOpen && responseModeMenuPosition && (
              <>
                <button
                  type="button"
                  className="pointer-events-auto fixed inset-0 z-[45] cursor-default"
                  onClick={closeResponseModeMenu}
                  aria-label="Close AI mode menu"
                />
                <motion.div
                  initial={{ opacity: 0, x: "-50%", y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: "-50%", y: -8, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-auto fixed z-50 overflow-hidden rounded-[28px] border border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white/88 backdrop-blur-[42px]"
                  style={{
                    left: responseModeMenuPosition.left,
                    top: responseModeMenuPosition.top,
                    width: responseModeMenuPosition.width,
                    maxHeight: responseModeMenuPosition.maxHeight,
                    transformOrigin: "top center",
                    ...mobileGlassPanelStyle,
                  }}
                  role="menu"
                >
                  <div className="max-h-[inherit] overflow-y-auto p-4">
                    <section>
                      <div className="mb-2 border-b border-white/[0.045] pb-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
                        BlueMind Models
                      </div>
                      <div className="space-y-1">
                        {MOBILE_HEADER_MODELS.map((model) => {
                          const selected = headerModelId === model.id;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => setHeaderModelId(model.id)}
                              className={`flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[18px] px-4 py-2.5 text-left text-[15px] font-extrabold transition-colors ${selected ? mobileGlassMenuSelectedClass : mobileGlassMenuIdleClass}`}
                              role="menuitemradio"
                              aria-checked={selected}
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span className="truncate">{model.label}</span>
                                {model.badge && (
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                                    "bg-white/[0.065] text-white/90"
                                  }`}>
                                    🆕 {model.badge}
                                  </span>
                                )}
                              </span>
                              {selected && <Check className="h-5 w-5 shrink-0 stroke-[3] text-white/88" />}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="mt-4">
                      <div className="mb-2 border-b border-white/[0.045] pb-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
                        AI Modes
                      </div>
                      <div className="space-y-1">
                        {AI_MODES.map((mode) => {
                          const ModeIcon = mode.icon;
                          const selected = responseMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => selectResponseMode(mode.id)}
                              className={`flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[18px] px-4 py-2.5 text-left text-[15px] font-extrabold transition-colors ${selected ? mobileGlassMenuSelectedClass : mobileGlassMenuIdleClass}`}
                              title={mode.description}
                              role="menuitemradio"
                              aria-checked={selected}
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <ModeIcon className="h-[18px] w-[18px] shrink-0 stroke-[2.3]" />
                                <span className="truncate">{getAiSpecializationLabel(mode)}</span>
                              </span>
                              {selected && <Check className="h-5 w-5 shrink-0 stroke-[3] text-white/88" />}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="mt-4">
                      <div className="mb-2 border-b border-white/[0.045] pb-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
                        Thinking
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeaderThinkingEnabled((enabled) => !enabled)}
                        className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[18px] px-4 py-2.5 text-left text-[15px] font-extrabold transition-colors ${headerThinkingEnabled ? mobileGlassMenuSelectedClass : mobileGlassMenuIdleClass}`}
                        role="menuitemcheckbox"
                        aria-checked={headerThinkingEnabled}
                      >
                        <span>Enable Thinking</span>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${headerThinkingEnabled ? "border-white/45 bg-white/82 text-[#000000]" : "border-white/14"}`}>
                          {headerThinkingEnabled && <Check className="h-4 w-4 stroke-[3]" />}
                        </span>
                      </button>
                    </section>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="flex w-12 items-center justify-end">
          <button
            type="button"
            onClick={startNewChat}
            className={`pointer-events-auto ${mobileGlassControlClass}`}
            aria-label="New chat"
          >
            <PenLine className="h-5 w-5" />
          </button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {shouldShowChatHome && renderFeatureCarousel()}
      </AnimatePresence>

      {(chatSessionMode === "private" || chatSessionMode === "hidden") && (
        <div className={`z-30 flex items-center justify-between border-b px-4 py-2 text-xs font-bold ${borderColor}`} style={{ backgroundColor: surfaceColor }}>
          <span className="flex items-center gap-2">
            {chatSessionMode === "private" ? <Lock className="h-4 w-4" /> : <Glasses className="h-4 w-4" />}
            {chatSessionMode === "private" ? `${activePrivateSpace?.name || "Private"} Chat` : "Hidden Mode"}
          </span>
          <button type="button" className={isDark ? "text-[var(--bm-primary)]" : "text-[var(--bm-primary)]"} onClick={chatSessionMode === "private" ? exitPrivateSpace : exitHiddenMode}>
            {chatSessionMode === "private" ? "Exit Private Chat" : "Exit Hidden Chat"}
          </button>
        </div>
      )}

      <section className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={messagesScrollRef}
          className={
            isSmartFocusMode
              ? "min-h-0 flex-1 overflow-y-auto px-4 pb-[132px] pt-20"
              : shouldShowChatHome
                ? "min-h-0 flex-1 overflow-y-auto px-4 pb-[132px] pt-5"
                : "min-h-0 flex-1 overflow-y-auto px-4 pb-[132px] pt-4"
          }
        >

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
                className="bm-mobile-glass-control"
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
                className="bm-mobile-glass-control"
                aria-label="Exit write edit mode"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {isSearchMode && (
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className={`text-lg font-bold tracking-tight ${textColor}`}>
                  {selectedSearchCategory?.title || "Search"}
                </h2>
                <button
                  type="button"
                  onClick={exitSearchMode}
                  className="bm-mobile-glass-control"
                  aria-label="Exit search mode"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {!selectedSearchCategory && (
                <p className={`mt-1 max-w-[330px] text-xs font-semibold leading-5 ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>
                  Find what you need here. If you can&apos;t find it, Ask AI can help you find it.
                </p>
              )}
            </div>
          )}

          {shouldShowImageTemplates && (
            <div className="-mx-3 pt-2">
              <div
                ref={imageGalleryViewportRef}
                className="max-h-[calc(100dvh-210px)] overflow-y-auto overscroll-contain px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                data-testid="mobile-image-inspiration-gallery"
                onPointerDown={pauseImageGalleryAutoScroll}
                onPointerUp={() => resumeImageGalleryAutoScroll(1400)}
                onPointerCancel={() => resumeImageGalleryAutoScroll(1400)}
                onPointerLeave={() => resumeImageGalleryAutoScroll(1400)}
                onWheel={() => {
                  pauseImageGalleryAutoScroll();
                  resumeImageGalleryAutoScroll(1600);
                }}
              >
                {[0, 1].map((loopIndex) => (
                  <div
                    key={`image-gallery-loop-${loopIndex}`}
                    ref={loopIndex === 0 ? imageGalleryLoopRef : undefined}
                    className="columns-2 gap-1 [column-fill:_balance]"
                    aria-hidden={loopIndex > 0}
                  >
                    {DESKTOP_IMAGE_IDEAS.map((item, index) => (
                      <MobileImageGalleryTile
                        key={`${loopIndex}-${item.id}`}
                        item={item}
                        index={index + loopIndex * DESKTOP_IMAGE_IDEAS.length}
                        selected={selectedImageTemplate?.id === item.id}
                        onSelect={requestImageTemplateUse}
                        loopHidden={loopIndex > 0}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {shouldShowImageTemplates && imageTemplateConfirm && (
              <motion.div
                key="image-template-confirm"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-x-4 z-40 mx-auto max-w-[398px] rounded-[28px] border border-white/[0.06] bg-[rgba(28,28,28,0.72)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_54px_rgba(0,0,0,0.34)] backdrop-blur-[34px]"
                style={{ bottom: "calc(env(safe-area-inset-bottom) + 112px)" }}
                role="dialog"
                aria-label="Use selected image style"
              >
                <p className="text-center text-[15px] font-extrabold">Use this image?</p>
                <p className="mt-1 truncate text-center text-xs font-semibold text-white/58">
                  {imageTemplateConfirm.title}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={cancelImageTemplateUse}
                    className="min-h-11 rounded-full border border-white/[0.055] bg-white/[0.08] text-sm font-bold text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-[24px] active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmImageTemplateUse}
                    className="min-h-11 rounded-full border border-[#7db7ff]/[0.20] bg-[rgba(25,91,164,0.72)] text-sm font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.025),0_14px_32px_rgba(0,0,0,0.24)] backdrop-blur-[24px] active:scale-[0.98]"
                  >
                    Use
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                      <span className={`block text-sm font-bold leading-5 ${isDark ? "text-white" : "text-[var(--bm-text-primary)]"}`}>
                        {template.title}
                      </span>
                      <span className={`mt-1 line-clamp-2 block text-[11px] font-medium leading-4 ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>
                        {template.description}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {shouldShowSearchCards && !selectedSearchCategory && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {SEARCH_DISCOVERY_CATEGORIES.map((category, index) => (
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
                  transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.16) }}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.985 }}
                  className={`group overflow-hidden rounded-[24px] border text-left shadow-sm transition ${
                    isDark
                      ? "border-white/[0.08] bg-white/[0.06] hover:border-white/[0.16] hover:bg-white/[0.1]"
                      : "border-white/75 bg-white/82 shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                  }`}
                >
                  <WriteTemplateArtwork template={category} index={index} />
                  <div className="p-3">
                    <span className={`block text-sm font-bold leading-5 ${isDark ? "text-white" : "text-[var(--bm-text-primary)]"}`}>
                      {category.title}
                    </span>
                    <span className={`mt-1 line-clamp-2 block text-[11px] font-medium leading-4 ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>
                      {category.description}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {shouldShowSearchCards && selectedSearchCategory && (
            <div className="pt-2">
              <div className={`mb-4 rounded-[26px] border p-4 ${isDark ? "border-white/[0.08] bg-white/[0.05]" : "border-white/75 bg-white/82 shadow-sm shadow-slate-200/70"}`}>
                <p className={`text-sm font-bold ${textColor}`}>Can&apos;t find what you are looking for?</p>
                <button
                  type="button"
                  onClick={() => openSearchAskConfirm({
                    category: selectedSearchCategory,
                    intent: "item_not_found",
                  })}
                  className="mt-3 h-11 w-full rounded-2xl bg-[var(--bm-primary)] text-sm font-bold text-white active:opacity-90"
                >
                  Ask AI
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {searchResultsForCategory.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.012, 0.16) }}
                    className={`group relative overflow-hidden rounded-[24px] border text-left shadow-sm transition ${
                      isDark
                        ? "border-white/[0.08] bg-white/[0.06]"
                        : "border-white/75 bg-white/82 shadow-slate-200/70"
                    }`}
                  >
                    <WriteTemplateArtwork template={item} index={index} />
                    <button
                      type="button"
                      onClick={() => setOpenSearchMenuItemId((current) => current === item.id ? null : item.id)}
                      className="bm-mobile-glass-control absolute right-2 top-2"
                      aria-label={`Open actions for ${item.title}`}
                    >
                      <MoreVertical className={iconClasses.button} />
                    </button>

                    {openSearchMenuItemId === item.id && (
                      <div className={`bm-glass-panel absolute right-2 top-11 z-10 w-40 overflow-hidden rounded-[22px] border p-1.5 ${isDark ? "text-white" : "text-[var(--bm-text-primary)]"}`} role="menu">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedSearchItemId((current) => current === item.id ? null : item.id);
                            setOpenSearchMenuItemId(null);
                          }}
                          className={isDark ? "bm-glass-menu-item min-h-10 w-full rounded-[15px] px-3 text-left text-xs font-bold active:bg-white/[0.08]" : "bm-glass-menu-item min-h-10 w-full rounded-[15px] px-3 text-left text-xs font-bold active:bg-[var(--bm-hover-bg)]"}
                          role="menuitem"
                        >
                          Learn More
                        </button>
                        <button
                          type="button"
                          onClick={() => copySearchItemName(item)}
                          className={isDark ? "bm-glass-menu-item min-h-10 w-full rounded-[15px] px-3 text-left text-xs font-bold active:bg-white/[0.08]" : "bm-glass-menu-item min-h-10 w-full rounded-[15px] px-3 text-left text-xs font-bold active:bg-[var(--bm-hover-bg)]"}
                          role="menuitem"
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
                          className={isDark ? "bm-glass-menu-item min-h-10 w-full rounded-[15px] px-3 text-left text-xs font-bold active:bg-white/[0.08]" : "bm-glass-menu-item min-h-10 w-full rounded-[15px] px-3 text-left text-xs font-bold active:bg-[var(--bm-hover-bg)]"}
                          role="menuitem"
                        >
                          Ask AI
                        </button>
                      </div>
                    )}

                    <div className="p-3">
                      <span className={`block text-sm font-bold leading-5 ${isDark ? "text-white" : "text-[var(--bm-text-primary)]"}`}>
                        {item.title}
                      </span>
                      <span className={`mt-1 line-clamp-2 block text-[11px] font-medium leading-4 ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>
                        {item.description}
                      </span>
                      {expandedSearchItemId === item.id && (
                        <div className={`mt-3 rounded-2xl px-3 py-2 text-[11px] font-semibold leading-4 ${isDark ? "bg-white/[0.07] text-[var(--bm-text-secondary)]" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-secondary)]"}`}>
                          {item.details || `More useful details about ${item.title} will appear here as search data is connected.`}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4 pb-4">
              {messages.map((item, index) => {
                const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;
                const hasText = Boolean(String(item.content || "").trim());
                const isImageOnlyUser = item.role === "user" && hasAttachments && !hasText;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={item.role === "user" ? "flex justify-end" : "w-full"}
                  >
                    <div
                      dir="auto"
                      className={`break-words text-sm font-medium leading-6 ${
                        isImageOnlyUser
                          ? "inline-block w-fit max-w-[78%]"
                          : item.role === "user"
                            ? "inline-block w-fit max-w-[78%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-white"
                            : isDark
                              ? "w-full px-1 py-1 text-white"
                              : "w-full px-1 py-1 text-[var(--bm-text-primary)]"
                      }`}
                      style={item.role === "user" && !isImageOnlyUser ? { backgroundColor: "var(--bluemind-chat-color, var(--bm-primary))" } : undefined}
                    >
                      {item.role === "user" ? (
                        <>
                          <ChatImageAttachments
                            attachments={item.attachments || []}
                            hasText={hasText}
                            isDark={isDark}
                            className="mb-2 gap-2"
                            imageClassName="max-h-[210px]"
                            buttonClassName="rounded-[16px] bg-black/15"
                            testId="mobile-message-attachments"
                          />
                          {hasText ? <MessageResponse message={item} previousUserContent={getPreviousUserContent(index)} /> : null}
                        </>
                      ) : item.isStreaming && !item.content ? (
                        <ThinkingIndicator responseMode={item.metadata?.aiMode || item.metadata?.responseMode || item.metadata?.mode || responseMode} className="mb-0" />
                      ) : (
                        <MessageResponse
                          message={item}
                          previousUserContent={getPreviousUserContent(index)}
                          className="text-[15px] leading-[1.85]"
                        />
                      )}
                    </div>

                    {item.role !== "user" && !item.isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-2 flex flex-wrap items-center gap-1 px-1 transition-opacity duration-200 ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}
                        data-testid={`message-actions-${item.id}`}
                      >
                        {[
                          { id: "copy", icon: messageFeedback[item.id]?.copied ? Check : Clipboard, label: t("copy"), onClick: () => handleCopyMessage(item) },
                          { id: "like", icon: ThumbsUp, label: t("like"), onClick: () => handleLikeMessage(item), active: messageFeedback[item.id]?.rating === "like" },
                          { id: "dislike", icon: ThumbsDown, label: t("dislike"), onClick: () => handleDislikeMessage(item), active: messageFeedback[item.id]?.rating === "dislike" },
                          { id: "edit", icon: PenLine, label: t("edit"), onClick: () => handleEditMessage(item) },
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
                                ? isDark ? "bg-white/10 text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]"
                                : isDark ? "active:bg-white/10 active:text-white" : "active:bg-[var(--bm-hover-bg)] active:text-[var(--bm-text-primary)]"
                            }`}
                            title={action.label}
                            aria-label={action.label}
                          >
                            <action.icon className="h-4 w-4" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {shouldPinComposer && (
          <div
            className="fixed inset-x-0 z-20 transition-[bottom] duration-200 ease-out"
            style={{ bottom: `${composerKeyboardOffset}px` }}
          >
            <div className="mx-auto w-full max-w-[430px] pt-3">
              {renderComposerArea(false, isEmptyChat)}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showScrollToBottom && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              className="pointer-events-none fixed inset-x-0 z-30"
              style={{ bottom: `calc(env(safe-area-inset-bottom) + ${composerKeyboardOffset + 146}px)` }}
            >
              <div className="mx-auto flex w-full max-w-[430px] justify-center px-4">
                <button
                  type="button"
                  onClick={() => scrollToBottom("smooth")}
                  className="bm-mobile-glass-control pointer-events-auto"
                  style={{
                    width: 38,
                    height: 38,
                    minWidth: 38,
                    minHeight: 38,
                  }}
                  aria-label="Scroll to bottom"
                >
                  <ArrowDown className="h-5 w-5 stroke-[2.35]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        {searchConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setSearchConfirm(null)}
              aria-label="Cancel Ask AI"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`relative z-10 w-full max-w-[340px] rounded-[28px] border p-5 shadow-2xl ${isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-white bg-white text-[var(--bm-text-primary)]"}`}
            >
              <h3 className="text-base font-bold tracking-tight">Ask AI?</h3>
              <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]"}`}>
                {searchConfirm.intent === "learn_more_about_selected_item" && searchConfirm.item
                  ? `Would you like BlueMind AI to help you learn more about ${searchConfirm.item.title}?`
                  : `Would you like BlueMind AI to help you find something that is not listed in ${searchConfirm.category.title}?`}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSearchConfirm(null)}
                  className={isDark ? "h-11 rounded-2xl bg-white/[0.08] text-sm font-bold text-white active:bg-white/[0.13]" : "h-11 rounded-2xl bg-[var(--bm-hover-bg)] text-sm font-bold text-[var(--bm-text-primary)] active:bg-[var(--bm-active-bg)]"}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void continueSearchWithAi()}
                  className="h-11 rounded-2xl bg-[var(--bm-primary)] text-sm font-bold text-white active:opacity-90"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderMobilePlusMenu()}

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
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--bm-text-muted)]/55" />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-base font-bold">Add image</p>
                  <p className={`text-xs font-semibold ${mutedText}`}>Attach a photo before sending.</p>
                </div>
                <button
                  type="button"
                  onClick={closeImageSourceSheet}
                  className="bm-mobile-glass-control"
                  aria-label="Close image source"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => openFileInput(imageInputRef)}
                  className={isDark ? "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]"}
                >
                  <span className={isDark ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bm-hover-bg)] text-[var(--bm-primary)]"}>
                    <Image className="h-5 w-5" />
                  </span>
                  <span>Choose Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => openFileInput(cameraInputRef)}
                  className={isDark ? "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]"}
                >
                  <span className={isDark ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bm-hover-bg)] text-[var(--bm-primary)]"}>
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
                isDark ? "border-white/10 bg-[var(--bm-bg-card)]/95 text-white" : "border-[var(--bm-border)] bg-white/95 text-[var(--bm-text-primary)]"
              }`}
              onClick={(event) => event.stopPropagation()}
              data-testid={`dislike-feedback-${dislikeTarget.id}`}
            >
              <div className="px-2 pb-2 pt-1">
                <p className="text-sm font-semibold">{t("tellUsMore")}</p>
                <p className={`mt-1 text-xs ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>{t("feedbackHelps")}</p>
              </div>
              <div className="space-y-1">
                {DISLIKE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleDislikeReason(reason)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                      isDark ? "active:bg-white/10" : "active:bg-[var(--bm-hover-bg)]"
                    }`}
                  >
                    {t(reason)}
                    <span className={`h-1.5 w-1.5 rounded-full ${isDark ? "bg-white/30" : "bg-[var(--bm-border-strong)]"}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {privateSpaceModalOpen && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-end bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPrivateSpaceModalOpen(false)}
          >
            <motion.div
              className={`max-h-[82dvh] w-full overflow-y-auto rounded-t-[30px] border p-5 shadow-2xl ${isDark ? "border-white/10 bg-[var(--bm-bg-card)] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]"}`}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Private Chat</h2>
                  <p className={`text-sm ${mutedText}`}>Unlock a private chat inside your account.</p>
                </div>
                <button type="button" className="bm-mobile-glass-control" onClick={() => setPrivateSpaceModalOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {privateSpaceError && <div className="mb-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500">{privateSpaceError}</div>}
              {privateSpaceStep === "list" && (
                <div className="space-y-3">
                  {isLoadingPrivateSpaces && <p className={`text-sm ${mutedText}`}>Loading private chats...</p>}
                  {!isLoadingPrivateSpaces && privateSpaces.length === 0 && <p className={`rounded-2xl border px-3 py-4 text-sm ${borderColor} ${mutedText}`}>No private chats yet.</p>}
                  {privateSpaces.map((space) => (
                    <div key={space.privateSpaceId} className="relative">
                      <button key={space.privateSpaceId} type="button" className={`flex min-h-[54px] w-full items-center gap-3 rounded-2xl border px-4 pr-12 text-left font-semibold ${borderColor}`} onClick={() => {
                        setSelectedPrivateSpace(space);
                        setPrivatePinInput("");
                        setPrivateSpaceError("");
                        setPrivateSpaceActionMenuId(null);
                        setPrivateSpaceStep("pin");
                      }}>
                        <Lock className="h-5 w-5" />
                        {space.name}
                      </button>
                      <button
                        type="button"
                        className="bm-mobile-glass-control absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPrivateSpaceActionMenuId((current) => current === space.privateSpaceId ? null : space.privateSpaceId);
                        }}
                      >
                        <MoreVertical className={iconClasses.button} />
                      </button>
                      {privateSpaceActionMenuId === space.privateSpaceId && (
                        <div className={`absolute right-2 top-12 z-10 w-36 rounded-2xl border p-1 shadow-xl ${isDark ? "border-white/10 bg-[var(--bm-bg-elevated)]" : "border-black/10 bg-white"}`}>
                          {[
                            ["Rename", () => { setSelectedPrivateSpace(space); setPrivateSpaceRenameName(space.name); setPrivateSpaceStep("rename"); }],
                            ["Change PIN", () => { setSelectedPrivateSpace(space); setPrivateSpacePinForm({ currentPin: "", newPin: "", confirmNewPin: "" }); setPrivateSpaceStep("changePin"); }],
                            ["Delete", () => { setPrivateSpaceDeleteTarget(space); setPrivateSpaceStep("delete"); }],
                          ].map(([label, action]) => (
                            <button key={label} type="button" className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${label === "Delete" ? "text-red-500" : ""}`} onClick={() => { setPrivateSpaceActionMenuId(null); action(); }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-bold text-white" onClick={startCreatePrivateSpace}>Create Private Chat</button>
                </div>
              )}
              {privateSpaceStep === "create" && (
                <form className="space-y-3" onSubmit={handleCreatePrivateSpace}>
                  <button type="button" className={isDark ? "text-sm font-bold text-[var(--bm-primary)]" : "text-sm font-bold text-[var(--bm-primary)]"} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="Chat Name" value={privateSpaceForm.name} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, name: event.target.value }))} />
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="PIN" inputMode="numeric" type="password" value={privateSpaceForm.pin} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, pin: event.target.value.replace(/\D/g, "") }))} />
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="Confirm PIN" inputMode="numeric" type="password" value={privateSpaceForm.confirmPin} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, confirmPin: event.target.value.replace(/\D/g, "") }))} />
                  <button type="submit" disabled={isCreatingPrivateSpace} className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-70">{isCreatingPrivateSpace ? "Creating..." : "Create"}</button>
                </form>
              )}
              {privateSpaceStep === "rename" && selectedPrivateSpace && (
                <form className="space-y-3" onSubmit={handleRenamePrivateSpace}>
                  <button type="button" className={isDark ? "text-sm font-bold text-[var(--bm-primary)]" : "text-sm font-bold text-[var(--bm-primary)]"} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="Chat Name" value={privateSpaceRenameName} onChange={(event) => setPrivateSpaceRenameName(event.target.value)} />
                  <button type="submit" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-bold text-white">Save</button>
                </form>
              )}
              {privateSpaceStep === "changePin" && selectedPrivateSpace && (
                <form className="space-y-3" onSubmit={handleChangePrivateSpacePin}>
                  <button type="button" className={isDark ? "text-sm font-bold text-[var(--bm-primary)]" : "text-sm font-bold text-[var(--bm-primary)]"} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="Current PIN" inputMode="numeric" type="password" value={privateSpacePinForm.currentPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, currentPin: event.target.value.replace(/\D/g, "") }))} />
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="New PIN" inputMode="numeric" type="password" value={privateSpacePinForm.newPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, newPin: event.target.value.replace(/\D/g, "") }))} />
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="Confirm New PIN" inputMode="numeric" type="password" value={privateSpacePinForm.confirmNewPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, confirmNewPin: event.target.value.replace(/\D/g, "") }))} />
                  <button type="submit" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-bold text-white">Change PIN</button>
                </form>
              )}
              {privateSpaceStep === "delete" && privateSpaceDeleteTarget && (
                <div className="space-y-4">
                  <button type="button" className={isDark ? "text-sm font-bold text-[var(--bm-primary)]" : "text-sm font-bold text-[var(--bm-primary)]"} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <p className="text-base font-bold">Delete this private chat?</p>
                  <p className={`text-sm leading-6 ${mutedText}`}>All conversations inside it will be permanently deleted.</p>
                  <button type="button" className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white" onClick={handleDeletePrivateSpace}>Delete</button>
                </div>
              )}
              {privateSpaceStep === "pin" && selectedPrivateSpace && (
                <form className="space-y-3" onSubmit={handleUnlockPrivateSpace}>
                  <button type="button" className={isDark ? "text-sm font-bold text-[var(--bm-primary)]" : "text-sm font-bold text-[var(--bm-primary)]"} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <h3 className="text-base font-bold">Enter PIN for {selectedPrivateSpace.name}</h3>
                  <input className="bm-field bm-input-interactive font-semibold" placeholder="PIN" inputMode="numeric" type="password" value={privatePinInput} onChange={(event) => setPrivatePinInput(event.target.value.replace(/\D/g, ""))} />
                  <button type="submit" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-bold text-white">Unlock</button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}

        {hiddenChatModalOpen && (
          <motion.div className="fixed inset-0 z-[90] flex items-end bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHiddenChatModalOpen(false)}>
            <motion.div className={`w-full rounded-t-[30px] border p-5 shadow-2xl ${isDark ? "border-white/10 bg-[var(--bm-bg-card)] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]"}`} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Hidden Chat</h2>
                <button type="button" className="bm-mobile-glass-control" onClick={() => setHiddenChatModalOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className={`mb-5 whitespace-pre-line text-sm leading-6 ${mutedText}`}>This chat is temporary.
Messages are not saved.
It does not appear in History.
It does not appear in Search.
Everything will be deleted when you leave.</p>
              <button type="button" className="w-full rounded-2xl bg-[var(--bm-primary)] px-4 py-3 text-sm font-bold text-white" onClick={startHiddenChat}>Start Hidden Chat</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[70] overflow-hidden">
            <motion.button
              type="button"
              className="absolute inset-y-0 right-0 z-0 w-[16vw] bg-black/45 backdrop-blur-[7px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={closeMenu}
              aria-label="Close menu"
            />
            <motion.section
              className="absolute inset-y-0 left-0 z-10 flex w-[84vw] flex-col overflow-hidden bg-black text-white shadow-[18px_0_48px_rgba(0,0,0,0.26)]"
              style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                touchAction: "pan-y",
              }}
              initial={{ x: "-100%", opacity: 0.96 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: typeof window === "undefined" ? -420 : -window.innerWidth * 0.88, right: 0 }}
              dragElastic={0.06}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70 || info.velocity.x < -520) {
                  closeMenu();
                }
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              data-testid="mobile-side-menu"
            >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(env(safe-area-inset-top)+74px)] backdrop-blur-[6px]"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.96), rgba(0,0,0,0.76), rgba(0,0,0,0))",
              }}
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={closeMenu}
              className="bm-mobile-glass-control absolute left-5 top-[calc(env(safe-area-inset-top)+14px)] z-30"
              aria-label="Close menu"
            >
              <ArrowLeft className={iconClasses.button} />
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-[88px] pt-[calc(env(safe-area-inset-top)+22px)] text-center">
              <h2 className="truncate text-[20px] font-semibold leading-none tracking-tight text-white">BlueMind AI</h2>
            </div>

            <button
              type="button"
              onClick={openMenuSearch}
              className="bm-mobile-glass-control absolute right-5 top-[calc(env(safe-area-inset-top)+14px)] z-30"
              aria-label="Search"
            >
              <Search className="h-5 w-5 stroke-[2.35]" />
            </button>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+76px)]">
              <section className="space-y-1">
                <p className={`pb-2 font-bold uppercase tracking-wide ${typeClasses.small} text-white/72`}>CHAT MODES</p>
                <button
                  type="button"
                  onClick={selectNormalChat}
                  className={`flex min-h-[48px] w-full items-center rounded-2xl text-left font-semibold text-white active:bg-white/[0.08] ${typeClasses.body} ${iconClasses.iconText} ${chatSessionMode === "normal" ? "bg-white/[0.08]" : ""}`}
                >
                  <MessageSquare className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Normal Chat</span>
                </button>
                <button
                  type="button"
                  onClick={openPrivateChatModal}
                  className={`flex min-h-[48px] w-full items-center rounded-2xl text-left font-semibold text-white active:bg-white/[0.08] ${typeClasses.body} ${iconClasses.iconText} ${chatSessionMode === "private" ? "bg-white/[0.08]" : ""}`}
                >
                  <Lock className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Private Chat</span>
                </button>
                <button
                  type="button"
                  onClick={selectWritingMode}
                  className={`flex min-h-[48px] w-full items-center rounded-2xl text-left font-semibold text-white active:bg-white/[0.08] ${typeClasses.body} ${iconClasses.iconText} ${chatSessionMode === "writing" ? "bg-white/[0.08]" : ""}`}
                >
                  <PenLine className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Writing Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    setHiddenChatModalOpen(true);
                  }}
                  className={`flex min-h-[48px] w-full items-center rounded-2xl text-left font-semibold text-white active:bg-white/[0.08] ${typeClasses.body} ${iconClasses.iconText} ${chatSessionMode === "hidden" ? "bg-white/[0.08]" : ""}`}
                >
                  <Glasses className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Hidden Chat</span>
                </button>
              </section>

              <section className="mt-4 space-y-1">
                <p className={`pb-2 font-bold uppercase tracking-wide ${typeClasses.small} text-white/72`}>BLUEMIND</p>
                {bluemindMenuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => runMenuAction(item)}
                    className={`flex min-h-[48px] w-full items-center rounded-2xl text-left font-semibold text-white active:bg-white/[0.08] ${typeClasses.body} ${iconClasses.iconText}`}
                  >
                    <item.icon className={`shrink-0 ${iconClasses.sidebar}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </section>

              <section id="mobile-history-chats" className="mt-5">
                <button
                  type="button"
                  onClick={toggleChatHistory}
                  className="flex min-h-9 w-full items-center justify-between pb-2 text-left"
                  aria-expanded={chatHistoryExpanded}
                  aria-controls="mobile-history-chat-list"
                >
                  <span className={`font-bold tracking-wide ${typeClasses.small} text-white/72`}>Recent Chats</span>
                  <motion.span
                    animate={{ rotate: chatHistoryExpanded ? 0 : -90 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-7 w-7 items-center justify-center text-white/68"
                    aria-hidden="true"
                  >
                    <ChevronDown className="h-4 w-4 stroke-[2.4]" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {chatHistoryExpanded && (
                    <motion.div
                      id="mobile-history-chat-list"
                      key="mobile-history-chat-list"
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -12 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: chatHistoryOverflowVisible ? "visible" : "hidden" }}
                      onAnimationComplete={() => {
                        if (chatHistoryExpanded) {
                          setChatHistoryOverflowVisible(true);
                        }
                      }}
                    >
                      {isLoadingConversations && (
                        <div className={`py-3 font-medium ${typeClasses.small} text-white/58`}>{t("loadingConversation")}</div>
                      )}

                      {!isLoadingConversations && historyError && (
                        <div className={`py-3 font-medium text-red-500 ${typeClasses.small}`}>{historyError}</div>
                      )}

                      {!isLoadingConversations && !historyError && conversations.length === 0 && (
                        <div className={`py-3 font-medium ${typeClasses.small} text-white/58`}>{t("noChatsFound")}</div>
                      )}

                      {conversations.slice(0, 18).map((item) => renderMobileConversationRow(item, "menu"))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </nav>

            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-start gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
              <button
                type="button"
                onClick={startNewChat}
                className="flex h-[50px] w-[58%] items-center justify-center gap-2.5 rounded-full border border-[#7db7ff]/[0.20] bg-[rgba(25,91,164,0.72)] px-4 text-[14px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.025),0_14px_32px_rgba(0,0,0,0.24)] backdrop-blur-[24px] transition-transform active:scale-[0.98]"
                aria-label={t("newChat")}
              >
                <PenLine className="h-5 w-5 stroke-[2.35]" />
                <span>{t("newChat")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsSheetOpen(true);
                }}
                className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full border border-white/[0.055] bg-[rgba(78,78,78,0.18)] p-[5px] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-[42px] transition-transform active:scale-95"
                aria-label={menuUserName}
                style={mobileGlassControlStyle}
              >
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)] text-base font-black text-white/88">
                  {menuUserAvatar ? (
                    <img src={menuUserAvatar} alt="" className="h-full w-full object-cover" draggable="false" />
                  ) : (
                    menuUserInitial
                  )}
                </span>
              </button>
            </div>
          </motion.section>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuSearchOpen && (
          <motion.section
            className={`fixed inset-0 z-[80] flex flex-col overflow-hidden ${textColor}`}
            style={{
              backgroundColor: surfaceColor,
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            initial={{ x: "100%", opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 180 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x > 90 || info.velocity.x > 600) {
                closeMenuSearch();
              }
            }}
            data-testid="mobile-full-screen-search"
          >
            <div className="relative flex h-16 shrink-0 items-center justify-center px-5">
              <button
                type="button"
                onClick={closeMenuSearch}
                className="bm-mobile-glass-control absolute left-4"
                aria-label="Back to menu"
              >
                <ArrowLeft className={iconClasses.button} />
              </button>
              <h2 className={`${typeClasses.sectionTitle} font-extrabold tracking-tight`}>Search</h2>
              <button
                type="button"
                onClick={closeMenuSearch}
                className="bm-mobile-glass-control absolute right-4"
                aria-label="Close search"
              >
                <X className={iconClasses.button} />
              </button>
            </div>

            <div className="shrink-0 px-5 pb-4">
              <label className={`bm-search-shell flex h-14 items-center rounded-[24px] border px-4 shadow-sm ${iconClasses.iconText} ${isDark ? "border-white/[0.08] bg-white/[0.07]" : "border-[var(--bm-border)] bg-white"}`}>
                <Search className={isDark ? `shrink-0 text-white ${iconClasses.sidebar}` : `shrink-0 text-[var(--bm-primary)] ${iconClasses.sidebar}`} />
                <input
                  ref={searchInputRef}
                  value={menuSearchQuery}
                  onChange={(event) => setMenuSearchQuery(event.target.value)}
                  placeholder={t("searchConversations")}
                  className={`bm-search-input min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-[var(--bm-text-muted)] ${typeClasses.body} ${textColor}`}
                />
                {menuSearchQuery && (
                  <button type="button" onClick={() => setMenuSearchQuery("")} className={isDark ? "flex h-8 w-8 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-8 w-8 items-center justify-center rounded-full text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]"}>
                    <X className={iconClasses.button} />
                  </button>
                )}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
              <section className="mb-6">
                <p className={`pb-2 font-bold uppercase tracking-wide ${typeClasses.small} ${mutedText}`}>Recent Chats</p>
                {isSearching && menuSearchQuery.trim() && (
                  <div className={`py-3 font-medium ${typeClasses.small} ${mutedText}`}>{t("searching")}</div>
                )}
                {!isSearching && visibleConversations.length === 0 && (
                  <div className={`py-3 font-medium ${typeClasses.small} ${mutedText}`}>{t("noChatsFound")}</div>
                )}
                {visibleConversations.slice(0, 24).map((item) => renderMobileConversationRow(item, "search-recent"))}
              </section>

              {!menuSearchQuery.trim() && pinnedConversations.length > 0 && (
                <section>
                  <p className={`pb-2 font-bold uppercase tracking-wide ${typeClasses.small} ${mutedText}`}>Pinned Chats</p>
                  {pinnedConversations.map((item) => renderMobileConversationRow(item, "search-pinned"))}
                </section>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-5">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setRenameTarget(null)}
              aria-label="Cancel rename"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.form
              onSubmit={handleRenameSubmit}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className={`relative z-10 w-full max-w-[340px] rounded-[26px] border p-5 shadow-2xl ${isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]"}`}
            >
              <h3 className="text-base font-bold">Rename chat</h3>
              <input
                value={renameTitle}
                onChange={(event) => setRenameTitle(event.target.value.slice(0, 120))}
                className="bm-field bm-input-interactive mt-4 font-semibold"
                placeholder="Chat title"
                autoFocus
                data-testid="mobile-rename-chat-input"
              />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className={isDark ? "h-11 rounded-2xl bg-white/[0.08] text-sm font-bold text-white active:bg-white/[0.13]" : "h-11 rounded-2xl bg-[var(--bm-hover-bg)] text-sm font-bold text-[var(--bm-text-primary)] active:bg-[var(--bm-active-bg)]"}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameTitle.trim()}
                  className="h-11 rounded-2xl bg-[var(--bm-primary)] text-sm font-bold text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-5">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setDeleteTarget(null)}
              aria-label="Cancel delete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className={`relative z-10 w-full max-w-[340px] rounded-[26px] border p-5 shadow-2xl ${isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]"}`}
            >
              <h3 className="text-base font-bold">Delete chat?</h3>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedText}`}>
                This removes "{deleteTarget.title || t("newChat")}" from your chat history.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className={isDark ? "h-11 rounded-2xl bg-white/[0.08] text-sm font-bold text-white active:bg-white/[0.13]" : "h-11 rounded-2xl bg-[var(--bm-hover-bg)] text-sm font-bold text-[var(--bm-text-primary)] active:bg-[var(--bm-active-bg)]"}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteConversation()}
                  className="h-11 rounded-2xl bg-red-500 text-sm font-bold text-white active:opacity-90"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsSheet
        open={settingsSheetOpen}
        mobile
        layeredOverMenu={menuOpen}
        onClose={() => setSettingsSheetOpen(false)}
      />
    </main>
  );
}

