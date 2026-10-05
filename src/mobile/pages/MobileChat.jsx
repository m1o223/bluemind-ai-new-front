import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, animate, motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Bell,
  Brain,
  Camera,
  ChevronDown,
  ChevronRight,
  Check,
  Clipboard,
  FileText,
  Flag,
  FolderKanban,
  GitBranch,
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
  Wand2,
  X,
} from "lucide-react";

import { APP_NAME } from "@/components/BrandLogo";
import ChatImageAttachments, { resolveAttachmentPreviewUrl } from "@/components/ChatImageAttachments";
import MessageResponse from "@/components/MessageResponse";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import UnifiedComposer from "@/components/UnifiedComposer";
import SettingsSheet from "@/components/settings/SettingsSheet";
import { BlueMindOverlay } from "@/components/ui/BlueMindOverlay";
import { useApp } from "@/context/AppContext";
import { iconClasses, overlayMotion, typeClasses } from "@/lib/interactions";
import { cn } from "@/lib/utils";
import IOSNativeGlassButton from "@/mobile/components/IOSNativeGlassButton";
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
import { BLUE_MIND_COLORS } from "@/theme/colors";
import {
  addNativeGlassActionListener,
  prepareNativeGlassAttachments,
  prepareNativeGlassExperiment,
  presentNativeIOSChatEntrySheet,
  presentNativeIOSChatAttachmentSheet,
  presentNativeIOSConfirmation,
  presentNativeIOSSelection,
  presentNativeIOSSecurePrompt,
  presentNativeIOSTextPrompt,
  presentNativeIOSWritingAttachmentPicker,
  setNativeGlassVisible,
  updateNativeGlassAudioLevels,
  updateNativeGlassState,
} from "@/mobile/nativeGlassBridge";
import { getApiErrorMessage } from "@/services/api";
import { restoreExistingSession } from "@/services/authService";
import {
  branchConversation,
  getConversation,
  listConversations,
  moveConversationToProject,
  searchConversations,
  streamChatMessage,
  streamHiddenChatMessage,
  streamImproveMessage,
  streamRegenerateMessage,
  transcribeVoiceAudio,
} from "@/services/chatService";
import { deleteChat, renameChat, shareChat } from "@/services/conversationActions";
import { analyzeImage, generateImage, getImageUrl, uploadChatImage } from "@/services/imageService";
import { reportIssue } from "@/services/supportService";
import { listProjects } from "@/services/projectService";
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
import useIOSVoiceInput from "@/mobile/hooks/useIOSVoiceInput";
import { SEARCH_ARTWORK_COLORS, WRITE_EDIT_ARTWORK_COLORS } from "@/theme/colors";

const usePlatformVoiceInput = Capacitor.getPlatform() === "ios" ? useIOSVoiceInput : useVoiceInput;

const MAX_IMAGE_ATTACHMENTS = 6;
const IS_IOS = Capacitor.getPlatform() === "ios";
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

const createImageCategoryAsset = (slug) => `/assets/create-images/${slug}.webp`;

const DESKTOP_IMAGE_IDEAS = [
  {
    id: "anime",
    title: "Anime",
    category: "Stylized Art",
    description: "Create anime-style artwork from your idea.",
    prompt: "Create a polished anime-style portrait with cinematic lighting, expressive eyes, and a clean BlueMind-inspired blue atmosphere.",
    thumbnail: createImageCategoryAsset("anime"),
  },
  {
    id: "portrait",
    title: "Portrait",
    category: "People",
    description: "Generate a refined studio portrait.",
    prompt: "Create a refined professional portrait with soft studio lighting, realistic skin texture, sharp details, and a minimal background.",
    thumbnail: createImageCategoryAsset("portrait"),
  },
  {
    id: "mini-me",
    title: "Mini Me",
    category: "Personalized",
    description: "Turn yourself into a playful mini scene.",
    prompt: "Create a realistic mini version of me sitting on my desk, highly detailed, playful scale, premium studio lighting, clean modern background.",
    thumbnail: createImageCategoryAsset("mini-me"),
  },
  {
    id: "research",
    title: "Research",
    category: "Knowledge",
    description: "Visualize notes, data, and discoveries.",
    prompt: "Create a futuristic research board visual with notes, diagrams, data cards, and a calm blue glassmorphism interface.",
    thumbnail: createImageCategoryAsset("research"),
  },
  {
    id: "recipe",
    title: "Recipe",
    category: "Food",
    description: "Design an editorial recipe visual.",
    prompt: "Create a premium recipe card image with fresh ingredients, elegant plating, soft natural light, and clean editorial composition.",
    thumbnail: createImageCategoryAsset("recipe"),
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk",
    category: "Sci-Fi",
    description: "Build a neon cinematic future scene.",
    prompt: "Create a futuristic cyberpunk city scene with neon blue accents, rain reflections, cinematic depth, and clean high-end detail.",
    thumbnail: createImageCategoryAsset("cyberpunk"),
  },
  {
    id: "fantasy",
    title: "Fantasy",
    category: "Worldbuilding",
    description: "Create magical landscapes and worlds.",
    prompt: "Create a fantasy landscape with glowing blue crystals, misty mountains, cinematic light, and an elegant magical atmosphere.",
    thumbnail: createImageCategoryAsset("fantasy"),
  },
  {
    id: "realistic-photo",
    title: "Realistic Photo",
    category: "Photography",
    description: "Make a natural, camera-real image.",
    prompt: "Create a realistic photo with natural light, believable details, true-to-life textures, shallow depth of field, and professional composition.",
    thumbnail: createImageCategoryAsset("realistic-photo"),
  },
  {
    id: "cartoon",
    title: "Cartoon",
    category: "Illustration",
    description: "Make a friendly polished cartoon.",
    prompt: "Create a friendly cartoon character with expressive features, modern colors, clean outlines, and a polished app-style finish.",
    thumbnail: createImageCategoryAsset("cartoon"),
  },
  {
    id: "logo",
    title: "Logo Design",
    category: "Branding",
    description: "Explore a clean brand mark concept.",
    prompt: "Create a clean modern logo concept with a premium AI brand feeling, simple geometry, blue accent color, and strong scalability.",
    thumbnail: createImageCategoryAsset("logo"),
  },
  {
    id: "architecture",
    title: "Architecture",
    category: "Spaces",
    description: "Imagine a premium building or interior.",
    prompt: "Create a modern architectural concept with elegant structure, warm interior lighting, clean materials, dramatic scale, and magazine-quality composition.",
    thumbnail: createImageCategoryAsset("architecture"),
  },
  {
    id: "product-mockup",
    title: "Product Mockup",
    category: "Commerce",
    description: "Stage a product like a launch image.",
    prompt: "Create a premium product mockup on a clean studio set, refined lighting, realistic shadows, high-end materials, and a polished commercial look.",
    thumbnail: createImageCategoryAsset("product-mockup"),
  },
  {
    id: "nature",
    title: "Nature",
    category: "Landscape",
    description: "Generate cinematic natural scenery.",
    prompt: "Create a cinematic nature scene with rich atmosphere, detailed plants, natural light, depth, and a peaceful high-resolution landscape feel.",
    thumbnail: createImageCategoryAsset("nature"),
  },
  {
    id: "character-design",
    title: "Character Design",
    category: "Characters",
    description: "Design a memorable original character.",
    prompt: "Create an original character design sheet with expressive personality, detailed outfit, strong silhouette, polished lighting, and concept-art quality.",
    thumbnail: createImageCategoryAsset("character-design"),
  },
  {
    id: "concept-art",
    title: "Concept Art",
    category: "Creative Direction",
    description: "Explore a cinematic visual direction.",
    prompt: "Create cinematic concept art with dramatic composition, rich atmosphere, layered depth, premium lighting, and a clear visual story.",
    thumbnail: createImageCategoryAsset("concept-art"),
  },
  {
    id: "action-figure",
    title: "Action Figure",
    category: "Collectibles",
    description: "Turn an idea into a collectible toy render.",
    prompt: "Create a premium action figure product render with detailed packaging, dramatic studio lighting, polished plastic materials, and a collectible display feel.",
    thumbnail: createImageCategoryAsset("action-figure"),
  },
  {
    id: "pixel-art",
    title: "Pixel Art",
    category: "Game Art",
    description: "Create crisp retro-inspired game visuals.",
    prompt: "Create polished pixel art with a clear silhouette, charming details, limited palette, clean lighting, and a premium retro game aesthetic.",
    thumbnail: createImageCategoryAsset("pixel-art"),
  },
  {
    id: "fashion",
    title: "Fashion",
    category: "Style",
    description: "Explore editorial outfits and looks.",
    prompt: "Create a high-end fashion editorial image with refined styling, elegant fabrics, confident pose, premium lighting, and a modern BlueMind-inspired mood.",
    thumbnail: createImageCategoryAsset("fashion"),
  },
  {
    id: "interior-design",
    title: "Interior Design",
    category: "Home",
    description: "Design calm premium living spaces.",
    prompt: "Create a premium interior design concept with calm materials, soft natural light, clean furniture, thoughtful spacing, and elegant blue-gray accents.",
    thumbnail: createImageCategoryAsset("interior-design"),
  },
  {
    id: "icons",
    title: "Icons",
    category: "UI Assets",
    description: "Create a consistent icon set.",
    prompt: "Create a professional app icon set with consistent stroke, rounded geometry, clean spacing, subtle blue accents, and a premium UI product feel.",
    thumbnail: createImageCategoryAsset("icons"),
  },
  {
    id: "sticker-style",
    title: "Sticker Style",
    category: "Social",
    description: "Make expressive sticker artwork.",
    prompt: "Create a playful premium sticker-style illustration with clean outlines, expressive shape language, soft shading, and a transparent-background-ready composition.",
    thumbnail: createImageCategoryAsset("sticker-style"),
  },
  {
    id: "food-photography",
    title: "Food",
    category: "Photography",
    description: "Create appetizing food visuals.",
    prompt: "Create premium food photography with natural texture, appetizing composition, soft restaurant lighting, realistic ingredients, and editorial polish.",
    thumbnail: createImageCategoryAsset("food-photography"),
  },
  {
    id: "landscape",
    title: "Landscape",
    category: "Scenery",
    description: "Build cinematic outdoor worlds.",
    prompt: "Create a cinematic landscape with atmospheric depth, elegant light, realistic terrain, balanced composition, and a premium calm visual tone.",
    thumbnail: createImageCategoryAsset("landscape"),
  },
  {
    id: "poster-design",
    title: "Poster Design",
    category: "Graphic Design",
    description: "Compose bold visual posters.",
    prompt: "Create a premium poster design with strong hierarchy, clean typography zones, cinematic focal image, refined spacing, and BlueMind blue accents.",
    thumbnail: createImageCategoryAsset("poster-design"),
  },
  {
    id: "album-cover",
    title: "Album Cover",
    category: "Music",
    description: "Create atmospheric cover art.",
    prompt: "Create premium album cover artwork with strong mood, clean composition, memorable visual symbol, refined lighting, and elegant modern typography space.",
    thumbnail: createImageCategoryAsset("album-cover"),
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
          loading={index < 6 ? "eager" : "lazy"}
          decoding="async"
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

function getVoiceLanguageTag(...candidates) {
  const raw = candidates.map((candidate) => String(candidate || "").trim()).find(Boolean) || "en-US";
  const normalized = raw.replace("_", "-").toLowerCase();

  if (normalized.startsWith("ar")) return "ar-SA";
  if (normalized.startsWith("sv")) return "sv-SE";
  if (normalized.startsWith("en-gb")) return "en-GB";
  if (normalized.startsWith("en")) return "en-US";

  return raw;
}

function appendVoiceText(baseText, transcript) {
  const base = String(baseText || "").trim();
  const next = String(transcript || "").trim();

  if (!base) return next;
  if (!next) return base;
  if (base.endsWith(next)) return base;

  return `${base} ${next}`.replace(/\s+/g, " ").trim();
}

export default function MobileChat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProjectId = searchParams.get("project") || "";
  const activeProjectName = searchParams.get("projectName") || "Project";
  const projectReturnPath = searchParams.get("returnTo") || (activeProjectId ? `/mobile/projects/${activeProjectId}/chats` : "");
  const { prefs, resolvedTheme, t, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const isRtl = (prefs?.language || uiLanguage || "").toLowerCase().startsWith("ar");
  const getDrawerWidth = useCallback(() => {
    if (typeof window === "undefined") return 360;
    return Math.round(window.innerWidth * 0.84);
  }, []);
  const [drawerWidth, setDrawerWidth] = useState(() => getDrawerWidth());
  const drawerX = useMotionValue(isRtl ? drawerWidth : -drawerWidth);
  const drawerProgress = useTransform(drawerX, (value) => {
    const width = drawerWidth || getDrawerWidth();
    if (!width) return 0;
    const progress = isRtl ? (width - value) / width : (value + width) / width;
    return Math.max(0, Math.min(1, progress));
  });
  const drawerScrimOpacity = useTransform(drawerProgress, [0, 1], [0, 1]);
  const chatSurfaceX = useTransform(drawerProgress, [0, 1], [0, isRtl ? -drawerWidth * 0.975 : drawerWidth * 0.975]);
  const chatSurfaceRadius = useTransform(drawerProgress, [0, 1], [0, 30]);
  const menuUser = readStoredUser() || {};
  const menuUserName = menuUser.name || menuUser.fullName || menuUser.displayName || menuUser.email || "Profile";
  const menuUserInitial = String(menuUserName).trim().charAt(0).toUpperCase() || "B";
  const menuUserAvatar = menuUser.avatarUrl || menuUser.photoURL || menuUser.photoUrl || menuUser.imageUrl || "";
  const [responseModeMenuOpen, setResponseModeMenuOpen] = useState(false);
  const [responseModeMenuPosition, setResponseModeMenuPosition] = useState(null);
  const [featureCarouselStep, setFeatureCarouselStep] = useState(0);
  const [featureCarouselIndex, setFeatureCarouselIndex] = useState(0);
  const featureCarouselX = useMotionValue(0);
  const featureCarouselTrackRef = useRef(null);
  const featureCarouselAnimationRef = useRef(null);
  const featureCarouselAutoTimerRef = useRef(null);
  const featureCarouselAutoDelayMs = 3600;
  const featureCarouselAutoDelayRef = useRef(featureCarouselAutoDelayMs);
  const featureCarouselIndexRef = useRef(0);
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
  const [messageMoreTarget, setMessageMoreTarget] = useState(null);
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(true);
  const [chatHistoryOverflowVisible, setChatHistoryOverflowVisible] = useState(true);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [nativeGlassSupported, setNativeGlassSupported] = useState(false);
  const [nativeGlassBridgeReady, setNativeGlassBridgeReady] = useState(false);
  const [nativeGlassAttachments, setNativeGlassAttachments] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voicePreview, setVoicePreview] = useState("");
  const voiceBaseTextRef = useRef("");
  const voicePreviewRef = useRef("");
  const voiceSendLockRef = useRef(false);
  const [messages, setMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [isChatSubmitting, setIsChatSubmitting] = useState(false);
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
  const [improveTarget, setImproveTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("incorrect");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [dislikeTarget, setDislikeTarget] = useState(null);
  const [dislikeMenuPosition, setDislikeMenuPosition] = useState({
    left: 0,
    y: 0,
    placement: "below",
    maxHeight: 280,
  });
  const [responseMode, setResponseMode] = useState(() => {
    const storedMode = localStorage.getItem("bluemind-response-mode");
    return normalizeAiModeId(storedMode);
  });
  const [thinkingLevel, setThinkingLevel] = useState(() => localStorage.getItem(MOBILE_THINKING_LEVEL_STORAGE_KEY) || "balanced");
  const [headerModelId, setHeaderModelId] = useState(() => localStorage.getItem(MOBILE_HEADER_MODEL_STORAGE_KEY) || "bluemind-5-0");
  const [headerThinkingEnabled, setHeaderThinkingEnabled] = useState(() => localStorage.getItem(MOBILE_HEADER_THINKING_STORAGE_KEY) === "true");
  const [isImageMode, setIsImageMode] = useState(false);
  const [isWriteEditMode, setIsWriteEditMode] = useState(false);
  const [selectedWritingCategoryId, setSelectedWritingCategoryId] = useState(() => localStorage.getItem("bluemind-writing-type") || "email");
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
  const [isWriteEditCategoryBrowserOpen, setIsWriteEditCategoryBrowserOpen] = useState(false);
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
  const touchStartTimeRef = useRef(0);
  const drawerGestureActiveRef = useRef(false);
  const drawerAnimationRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuDrawerRef = useRef(null);
  const previousFocusRef = useRef(null);
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
  const nativeGlassActionRef = useRef(() => {});
  const nativePrivateFlowRef = useRef(null);
  const nativeGlassAckEventIdRef = useRef("0");
  const nativeGlassMenuOpenRef = useRef(false);
  const nativeGlassMicrophoneLockRef = useRef(false);
  const nativeGlassSendLockRef = useRef(false);
  const nativeGlassAudioTimerRef = useRef(null);
  const pendingNativePhotoIdsRef = useRef(new Set());
  const streamBufferRef = useRef({ messageId: null, text: "", timer: null });
  const loadedConversationRef = useRef(null);
  const featureCarouselCount = 4;

  const activeConversationId = searchParams.get("conversation");
  const surfaceColor = "var(--bm-bg-app)";
  const panelColor = "var(--bm-bg-app)";
  const borderColor = isDark ? "border-white/[0.055]" : "border-[var(--bm-border)]";
  const mutedText = isDark ? "text-[#B7B7B7]" : "text-[var(--bm-text-secondary)]";
  const textColor = isDark ? "text-white/90" : "text-[var(--bm-text-primary)]";
  const privateSheetClass = cn(
    "max-h-[82dvh] w-full overflow-y-auto rounded-t-[34px] border px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-5 shadow-2xl",
    isDark
      ? "border-white/[0.08] bg-[rgba(38,38,38,0.84)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_-18px_48px_rgba(0,0,0,0.34)] backdrop-blur-[44px]"
      : "border-black/[0.07] bg-white/[0.94] text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_-16px_44px_rgba(15,23,42,0.10)] backdrop-blur-[36px]",
  );
  const privateInputClass = cn(
    "bm-field bm-input-interactive h-[52px] rounded-[20px] px-4 text-[15px] font-semibold outline-none transition-shadow focus:ring-2 focus:ring-[var(--bm-primary)]/25",
    isDark ? "border-white/[0.08] bg-white/[0.055]" : "border-black/[0.07] bg-white/[0.88]",
  );
  const privatePrimaryButtonClass =
    "w-full rounded-[22px] border border-white/[0.20] bg-[var(--bm-primary)] px-4 py-3.5 text-sm font-black !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.20),inset_0_-1px_0_rgba(255,255,255,0.035),0_12px_28px_rgba(0,0,0,0.14)] transition-transform active:scale-[0.985] disabled:opacity-70";
  const privatePrimaryButtonStyle = { color: "#fff", WebkitTextFillColor: "#fff" };
  const privateBackButtonClass = cn(
    "inline-flex h-9 items-center rounded-full px-3 text-sm font-black transition-colors",
    isDark ? "bg-white/[0.06] text-white/86 active:bg-white/[0.10]" : "bg-black/[0.035] text-[var(--bm-text-primary)] active:bg-black/[0.06]",
  );
  const privateListCardClass = cn(
    "flex min-h-[58px] w-full items-center gap-3 rounded-[22px] border px-4 pr-12 text-left text-[15px] font-bold transition-colors",
    isDark ? "border-white/[0.08] bg-white/[0.045] text-white active:bg-white/[0.08]" : "border-black/[0.07] bg-white/[0.86] text-[var(--bm-text-primary)] active:bg-black/[0.035]",
  );
  const mobileGlassControlClass =
    "bm-mobile-glass-control";
  const mobileGlassSelectorClass = cn(
    "bm-mobile-glass-control bm-mobile-glass-selector pointer-events-auto text-sm font-bold capitalize",
    isDark ? "text-white/90" : "text-[var(--bm-text-primary)]",
  );
  const mobileGlassControlStyle = isDark ? {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.082), inset 0 -1px 0 rgba(255,255,255,0.01), inset 1px 0 0 rgba(255,255,255,0.018), inset -1px 0 0 rgba(255,255,255,0.016), 0 10px 24px rgba(0,0,0,0.24)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
  } : {
    boxShadow: "inset 0 1px 0 rgba(17,17,17,0.06), inset 0 -1px 0 rgba(17,17,17,0.008), inset 1px 0 0 rgba(17,17,17,0.014), inset -1px 0 0 rgba(17,17,17,0.012), 0 7px 16px rgba(15,23,42,0.028)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
  };
  const mobileGlassPanelStyle = isDark ? {
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(255,255,255,0.012), inset 1px 0 0 rgba(255,255,255,0.02), inset -1px 0 0 rgba(255,255,255,0.018), 0 18px 44px rgba(0,0,0,0.28)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(0.72) contrast(0.025)",
  } : {
    boxShadow: "inset 0 1px 0 rgba(17,17,17,0.06), inset 0 -1px 0 rgba(17,17,17,0.008), inset 1px 0 0 rgba(17,17,17,0.014), inset -1px 0 0 rgba(17,17,17,0.012), 0 10px 24px rgba(15,23,42,0.036)",
    backdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
    WebkitBackdropFilter: "blur(1120px) saturate(1.02) brightness(1.12) contrast(0.025)",
  };
  const mobileGlassMenuSelectedClass = isDark
    ? "bg-[rgba(106,106,106,0.16)] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    : "bg-[var(--bm-active-bg)] text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]";
  const mobileGlassMenuIdleClass = isDark
    ? "text-white/85 hover:bg-[rgba(106,106,106,0.1)] active:bg-[rgba(106,106,106,0.15)]"
    : "text-[var(--bm-text-secondary)] hover:bg-[var(--bm-hover-bg)] active:bg-[var(--bm-active-bg)]";
  const menuUsesDarkAppearance = isDark || nativeGlassSupported;
  const mobileSectionTitleClass = menuUsesDarkAppearance ? "text-white/72" : "text-[var(--bm-text-muted)]";
  const mobileSubtleTextClass = menuUsesDarkAppearance ? "text-white/58" : "text-[var(--bm-text-secondary)]";
  const mobileMenuItemClass = (active = false) => cn(
    "bm-mobile-menu-item flex min-h-[48px] w-full items-center rounded-2xl px-3 text-left font-semibold",
    typeClasses.body,
    iconClasses.iconText,
    active
      ? menuUsesDarkAppearance ? "bg-white/[0.08] text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-text-primary)]"
      : menuUsesDarkAppearance ? "text-white active:bg-white/[0.08]" : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]",
  );

  const mobileFeatureCards = useMemo(() => [
    {
      title: "Writing Mode",
      description: "Write, rewrite and refine text with focused AI help.",
      cta: "Open",
      path: "/mobile/write-edit",
      icon: PenLine,
      image: "/assets/home-carousel/writing-mode.png",
    },
    {
      title: "Reminders",
      description: "Keep important tasks visible at the right time.",
      cta: "Open",
      path: "/mobile/reminders",
      icon: Bell,
      image: "/assets/home-carousel/reminders.png",
    },
    {
      title: "Schedule",
      description: "Plan your day with BlueMind's smart calendar tools.",
      cta: "Explore",
      path: "/mobile/schedule",
      icon: Clipboard,
      image: "/assets/home-carousel/schedule.png",
    },
  ], []);

  const bluemindMenuItems = [
    { label: "Smart Hub", path: "/mobile/smart-hub", icon: Brain },
    { label: "Reminders", path: "/mobile/reminders", icon: Bell },
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
  const writingCategories = useMemo(() => [
    {
      id: "email",
      label: "Email",
      icon: MessageSquare,
      placeholder: "Write an email about...",
    },
    {
      id: "reports",
      label: "Report",
      icon: Clipboard,
      placeholder: "Write a clear report about...",
    },
    {
      id: "essay",
      label: "Essay",
      icon: FileText,
      placeholder: "Write an essay about...",
    },
    {
      id: "story",
      label: "Story",
      icon: PenLine,
      placeholder: "Write a story about...",
    },
    {
      id: "professional",
      label: "Professional",
      icon: Clipboard,
      placeholder: "Write professional content about...",
    },
    {
      id: "social",
      label: "Social Media",
      icon: Share2,
      placeholder: "Write a social media post about...",
    },
    {
      id: "templates",
      label: "Templates",
      icon: Sparkles,
      placeholder: "Create a reusable writing template for...",
    },
    {
      id: "cv",
      label: "CV",
      icon: FileText,
      placeholder: "Write or improve a CV section for...",
    },
    {
      id: "other",
      label: "Other",
      icon: Sparkles,
      placeholder: "What would you like to write?",
    },
  ], []);
  const selectedWritingCategory = writingCategories.find((category) => category.id === selectedWritingCategoryId) || writingCategories[0];

  useEffect(() => {
    localStorage.setItem("bluemind-writing-type", selectedWritingCategory.id);
  }, [selectedWritingCategory.id]);

  const searchResultsForCategory = useMemo(
    () => getSearchResultsForCategory(selectedSearchCategory),
    [selectedSearchCategory],
  );

  const hasTypedMessage = message.trim().length > 0;
  const hasConversationMessages = messages.length > 0;
  const hasGeneratedOutput = generatedImages.length > 0;
  const hasComposerContent = hasTypedMessage || attachedImages.length > 0 || writeAttachments.length > 0;
  const isToolFocusMode = isImageMode || isWriteEditMode || isWriteEditCategoryBrowserOpen || isSearchMode || Boolean(activeWriteTask);
  const isSmartFocusMode = isToolFocusMode || hasTypedMessage;
  const isEmptyChat = !isImageMode && !isWriteEditMode && !isWriteEditCategoryBrowserOpen && !isSearchMode && !hasConversationMessages && !hasGeneratedOutput;
  const shouldShowImageTemplates = isImageMode && (!message.trim() || Boolean(selectedImageTemplate)) && attachedImages.length === 0 && !isGeneratingImage;
  const shouldShowSearchCards = isSearchMode && messages.length === 0 && generatedImages.length === 0;
  const {
    scrollRef: messagesScrollRef,
    endRef: messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  } = useChatAutoScroll({
    watch: [messages, isChatSending],
    isStreaming: isChatSending,
    alignShortContentToTop: true,
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

  useEffect(() => {
    if (!responseModeMenuOpen) return undefined;

    const handleOutsidePointer = (event) => {
      const target = event.target;
      if (aiSelectorButtonRef.current?.contains(target)) return;
      if (target?.closest?.(".bm-mobile-ai-menu")) return;
      closeResponseModeMenu();
    };

    document.addEventListener("touchstart", handleOutsidePointer, true);
    document.addEventListener("touchend", handleOutsidePointer, true);
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    document.addEventListener("pointerup", handleOutsidePointer, true);
    window.addEventListener("mousedown", handleOutsidePointer, true);
    window.addEventListener("click", handleOutsidePointer, true);
    return () => {
      document.removeEventListener("touchstart", handleOutsidePointer, true);
      document.removeEventListener("touchend", handleOutsidePointer, true);
      document.removeEventListener("pointerdown", handleOutsidePointer, true);
      document.removeEventListener("pointerup", handleOutsidePointer, true);
      window.removeEventListener("mousedown", handleOutsidePointer, true);
      window.removeEventListener("click", handleOutsidePointer, true);
    };
  }, [closeResponseModeMenu, responseModeMenuOpen]);

  useLayoutEffect(() => {
    const measureFeatureCarousel = () => {
      const firstCard = featureCarouselTrackRef.current?.querySelector("[data-feature-card='true']");
      if (!firstCard) return;

      const rect = firstCard.getBoundingClientRect();
      const styles = window.getComputedStyle(featureCarouselTrackRef.current);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const nextStep = rect.width + gap;
      setFeatureCarouselStep(nextStep);
      featureCarouselX.set(-featureCarouselIndexRef.current * nextStep);
    };

    measureFeatureCarousel();
    window.addEventListener("resize", measureFeatureCarousel);
    window.visualViewport?.addEventListener("resize", measureFeatureCarousel);

    return () => {
      window.removeEventListener("resize", measureFeatureCarousel);
      window.visualViewport?.removeEventListener("resize", measureFeatureCarousel);
    };
  }, [featureCarouselX]);

  useEffect(() => {
    featureCarouselIndexRef.current = featureCarouselIndex;
  }, [featureCarouselIndex]);

  const animateFeatureCarouselTo = useCallback((targetIndex, options = {}) => {
    if (!featureCarouselStep) return;
    featureCarouselAnimationRef.current?.stop?.();
    setFeatureCarouselIndex(targetIndex);
    featureCarouselAnimationRef.current = animate(featureCarouselX, -targetIndex * featureCarouselStep, {
      duration: options.duration ?? 0.48,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => {
        if (targetIndex >= featureCarouselCount) {
          featureCarouselX.set(0);
          setFeatureCarouselIndex(0);
        }
        options.onComplete?.();
      },
    });
  }, [featureCarouselCount, featureCarouselStep, featureCarouselX]);

  const pauseFeatureCarousel = useCallback(() => {
    window.clearTimeout(featureCarouselAutoTimerRef.current);
  }, []);

  useEffect(() => {
    window.clearTimeout(featureCarouselAutoTimerRef.current);
    if (!featureCarouselStep || menuOpen || menuSearchOpen) return undefined;

    const delay = featureCarouselAutoDelayRef.current;
    featureCarouselAutoDelayRef.current = featureCarouselAutoDelayMs;
    featureCarouselAutoTimerRef.current = window.setTimeout(() => {
      const currentIndex = featureCarouselIndex % featureCarouselCount;
      const nextIndex = currentIndex >= featureCarouselCount - 1 ? featureCarouselCount : currentIndex + 1;
      animateFeatureCarouselTo(nextIndex);
    }, delay);

    return () => window.clearTimeout(featureCarouselAutoTimerRef.current);
  }, [animateFeatureCarouselTo, featureCarouselAutoDelayMs, featureCarouselCount, featureCarouselIndex, featureCarouselStep, menuOpen, menuSearchOpen]);

  const handleFeatureCarouselDragStart = useCallback(() => {
    featureCarouselAnimationRef.current?.stop?.();
    featureCarouselDraggingRef.current = true;
    pauseFeatureCarousel();
  }, [pauseFeatureCarousel]);

  const handleFeatureCarouselDragEnd = useCallback((_, info) => {
    featureCarouselDraggingRef.current = false;
    if (!featureCarouselStep) return;
    pauseFeatureCarousel();

    const projectedX = featureCarouselX.get() + info.velocity.x * 0.16;
    const targetIndex = Math.max(0, Math.min(featureCarouselCount, Math.round(-projectedX / featureCarouselStep)));
    featureCarouselAutoDelayRef.current = featureCarouselAutoDelayMs;
    animateFeatureCarouselTo(targetIndex, {
      duration: 0.52,
    });
  }, [animateFeatureCarouselTo, featureCarouselAutoDelayMs, featureCarouselCount, featureCarouselStep, featureCarouselX, pauseFeatureCarousel]);

  const {
    isListening,
    status: voiceCaptureStatus,
    audioLevels: voiceAudioLevels,
    liveTranscript: voiceLiveTranscript,
    start: startVoiceCapture,
    stop: stopVoiceInput,
    cancel: cancelVoiceInput,
  } = usePlatformVoiceInput({
    onError: (messageText) => {
      setVoiceStatus("error");
      toast.error(messageText);
    },
  });

  useEffect(() => {
    if (voiceCaptureStatus === "requesting" || voiceCaptureStatus === "listening") {
      setVoiceStatus(voiceCaptureStatus);
    }
  }, [voiceCaptureStatus]);

  useEffect(() => {
    if (voiceCaptureStatus === "listening") {
      voicePreviewRef.current = voiceLiveTranscript;
      setVoicePreview(voiceLiveTranscript);
    }
  }, [voiceCaptureStatus, voiceLiveTranscript]);

  const voiceLanguage = useMemo(() => getVoiceLanguageTag(
    prefs?.voiceLanguage,
    prefs?.language,
    uiLanguage,
    typeof navigator !== "undefined" ? navigator.language : "en-US",
  ), [prefs?.language, prefs?.voiceLanguage, uiLanguage]);

  const shouldShowWritingModeHome =
    (chatSessionMode === "writing" || isWriteEditMode) &&
    !isImageMode &&
    !isSearchMode &&
    !activeWriteTask &&
    !hasConversationMessages &&
    !hasGeneratedOutput &&
    !isChatSending &&
    !isUploadingImages &&
    !isListening &&
    !isOpeningConversation;
  const chatEntrySheetOpen = privateSpaceModalOpen || hiddenChatModalOpen;
  const shouldPinComposer = !menuSearchOpen && !chatEntrySheetOpen && !isWriteEditCategoryBrowserOpen;
  const shouldShowWriteEditTemplates = isWriteEditCategoryBrowserOpen && !message.trim() && writeAttachments.length === 0 && !activeWriteTask;
  const shouldShowChatHome =
    chatSessionMode === "normal" &&
    isEmptyChat &&
    !chatHomeDismissed &&
    !hasComposerContent &&
    !isChatSending &&
    !isGeneratingImage &&
    !isUploadingImages &&
    !isListening &&
    !isOpeningConversation;
  const shouldUseChatMessageSafeArea = messages.length > 0 && !shouldShowChatHome && !shouldShowWritingModeHome;

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

  const getDrawerClosedX = useCallback((width = drawerWidth) => (isRtl ? width : -width), [drawerWidth, isRtl]);

  const animateDrawerTo = useCallback((targetX, options = {}) => {
    drawerAnimationRef.current?.stop?.();
    drawerAnimationRef.current = animate(drawerX, targetX, nativeGlassSupported ? {
      type: "tween",
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
      onComplete: options.onComplete,
    } : {
      type: "tween",
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
      onComplete: options.onComplete,
    });
  }, [drawerX, nativeGlassSupported]);

  const closeMenu = useCallback(() => {
    setMenuSearchOpen(false);
    setMenuSearchQuery("");
    setMenuExpanded(false);
    drawerGestureActiveRef.current = false;
    animateDrawerTo(getDrawerClosedX(), {
      onComplete: () => setMenuOpen(false),
    });
  }, [animateDrawerTo, getDrawerClosedX]);

  const redirectToMobileLogin = useCallback(() => {
    closeMenu();
    closeResponseModeMenu();
    navigate("/mobile", { replace: true });
  }, [closeMenu, closeResponseModeMenu, navigate]);

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
    if (!chatEntrySheetOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    composerInputRef.current?.blur();
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [chatEntrySheetOpen]);

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
      if (IS_IOS) {
        navigate("/mobile/create-image", { replace: true });
        return;
      }
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
  }, [activeWriteTask, message, navigate, pendingWriteTemplate, searchParams]);

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

  useLayoutEffect(() => {
    const syncDrawerWidth = () => {
      const nextWidth = getDrawerWidth();
      setDrawerWidth(nextWidth);
      if (!menuOpen && !drawerGestureActiveRef.current) {
        drawerX.set(isRtl ? nextWidth : -nextWidth);
      }
    };
    syncDrawerWidth();
    window.addEventListener("resize", syncDrawerWidth);
    return () => window.removeEventListener("resize", syncDrawerWidth);
  }, [drawerX, getDrawerWidth, isRtl, menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      previousFocusRef.current?.focus?.({ preventScroll: true });
      previousFocusRef.current = null;
      return undefined;
    }

    const focusTimer = window.setTimeout(() => {
      const focusable = menuDrawerRef.current?.querySelector(
        "button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex='-1'])",
      );
      focusable?.focus?.({ preventScroll: true });
    }, 40);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !menuDrawerRef.current) return;
      const focusable = Array.from(menuDrawerRef.current.querySelectorAll(
        "button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex='-1'])",
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, menuOpen]);

  const openMenu = () => {
    closeResponseModeMenu();
    previousFocusRef.current = menuButtonRef.current || document.activeElement;
    const width = getDrawerWidth();
    setDrawerWidth(width);
    drawerGestureActiveRef.current = false;
    drawerX.set(getDrawerClosedX(width));
    setMenuOpen(true);
    setMenuExpanded(true);
    setMenuSearchOpen(false);
    requestAnimationFrame(() => animateDrawerTo(0));
  };

  const openMenuSearch = () => {
    composerInputRef.current?.blur();
    setMenuExpanded(false);
    setMenuOpen(false);
    setMenuSearchOpen(true);
  };

  const closeMenuSearch = () => {
    setMenuSearchOpen(false);
    setMenuOpen(true);
    setMenuExpanded(true);
    drawerX.set(0);
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
      const writingMetadata = (conversation.messages || []).find((item) => item?.metadata?.workspace === "writing" || item?.metadata?.chatSessionMode === "writing")?.metadata;
      if (writingMetadata) {
        setChatSessionMode("writing");
        if (writingMetadata.writingType) setSelectedWritingCategoryId(String(writingMetadata.writingType));
      }
      setChatHomeDismissed(true);
      loadedConversationRef.current = conversation.conversationId;

      if (updateUrl) {
        const next = new URLSearchParams(searchParams);
        next.set("conversation", conversation.conversationId);
        setSearchParams(next);
      }
    } catch (error) {
      toast.error(error.message || t("couldNotOpenChat"));
    } finally {
      setIsOpeningConversation(false);
    }
  }, [activePrivateSpace?.privateSpaceId, chatSessionMode, ensureMobileChatAuth, isChatSending, isGeneratingImage, isOpeningConversation, privateSpaceAccessToken, searchParams, setSearchParams, t]);

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
    setIsWriteEditCategoryBrowserOpen(false);
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

  const openPrivateChatModal = useCallback(async () => {
    closeMenu();
    setPrivateSpaceModalOpen(true);
    setPrivateSpaceStep("list");
    setPrivateSpaceError("");
    setSelectedPrivateSpace(null);
    setPrivatePinInput("");
    setPrivateSpaceActionMenuId(null);
    setPrivateSpaceDeleteTarget(null);
    const items = await loadMobilePrivateSpaces();
    if (nativeGlassSupported && nativeGlassBridgeReady) {
      const shown = await presentNativeIOSChatEntrySheet({
        kind: "private",
        requestId: "private-chat-entry",
        isDark,
        privateChats: items.map((space) => ({ id: space.privateSpaceId, name: space.name })),
      });
      if (shown) return;
    }
    setPrivateSpaceStep(items.length ? "list" : "create");
  }, [closeMenu, isDark, loadMobilePrivateSpaces, nativeGlassBridgeReady, nativeGlassSupported]);

  const openHiddenChatModal = useCallback(async () => {
    closeMenu();
    setHiddenChatModalOpen(true);
    if (nativeGlassSupported && nativeGlassBridgeReady) {
      const shown = await presentNativeIOSChatEntrySheet({
        kind: "hidden",
        requestId: "hidden-chat-entry",
        isDark,
      });
      if (shown) return;
    }
  }, [closeMenu, isDark, nativeGlassBridgeReady, nativeGlassSupported]);

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

  const performRenameConversation = async (conversation, requestedTitle) => {
    const nextTitle = String(requestedTitle || "").trim().slice(0, 120);
    if (!conversation || !nextTitle) return;

    const previousConversations = conversations;
    setConversations((current) => current.map((item) => (
      item.conversationId === conversation.conversationId
        ? { ...item, title: nextTitle }
        : item
    )));
    setSearchResults((current) => current.map((item) => (
      item.conversationId === conversation.conversationId
        ? { ...item, title: nextTitle }
        : item
    )));

    try {
      if (chatSessionMode === "private" && activePrivateSpace?.privateSpaceId && privateSpaceAccessToken) {
        await renamePrivateSpaceChat(activePrivateSpace.privateSpaceId, conversation.conversationId, nextTitle, privateSpaceAccessToken);
      } else {
        await renameChat(conversation.conversationId, nextTitle);
      }
      setRenameTarget(null);
      setRenameTitle("");
      await loadConversationHistory();
    } catch (error) {
      setConversations(previousConversations);
      toast.error(error.message || "Could not rename conversation");
    }
  };

  const handleRenameSubmit = async (event) => {
    event.preventDefault();
    if (!renameTarget || !renameTitle.trim()) return;
    await performRenameConversation(renameTarget, renameTitle);
  };

  const performDeleteConversation = async (target) => {
    if (!target) return;
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

  const handleDeleteConversation = async () => {
    await performDeleteConversation(deleteTarget);
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

  const moveChatToProject = async (conversationId, projectId, projectName = "") => {
    try {
      await moveConversationToProject(conversationId, projectId || null);
      setConversations((current) => current.filter((item) => item.conversationId !== conversationId));
      setSearchResults((current) => current.filter((item) => item.conversationId !== conversationId));
      toast.success(projectId ? `Chat moved to ${projectName || "project"}` : "Chat removed from project");
    } catch (error) {
      toast.error(error.message || "Could not move chat");
    }
  };

  const openMoveToProject = async (conversationId) => {
    try {
      const projects = await listProjects();
      if (!projects.length) {
        toast.info("Create a Project first");
        return;
      }
      await presentNativeIOSSelection({
        title: "Move to Project",
        selectedValue: "",
        requestId: `move-chat:${conversationId}`,
        options: projects.map((project) => ({
          label: project.name,
          value: String(project.id || project._id || ""),
          symbol: "folder",
        })),
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load projects"));
    }
  };

  const clearMobileFlowParams = () => {
    const conversation = searchParams.get("conversation");
    const next = new URLSearchParams();
    if (conversation) next.set("conversation", conversation);
    ["project", "projectName", "returnTo"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    });
    setSearchParams(next);
  };

  const handlePageTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    touchStartYRef.current = event.touches?.[0]?.clientY ?? null;
    touchStartTimeRef.current = Date.now();
    drawerGestureActiveRef.current = false;
  };

  const handlePageTouchMove = (event) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const currentTouch = event.touches?.[0];
    const width = drawerWidth || getDrawerWidth();
    const edgeSize = 28;
    const viewportWidth = typeof window === "undefined" ? width : window.innerWidth;
    const startedFromEdge = isRtl ? startX >= viewportWidth - edgeSize : startX <= edgeSize;
    const deltaX = currentTouch && typeof startX === "number" ? currentTouch.clientX - startX : 0;
    const openingDistance = isRtl ? -deltaX : deltaX;
    if (
      !menuOpen &&
      !menuSearchOpen &&
      (!nativeGlassSupported || isDark) &&
      typeof startX === "number" &&
      typeof startY === "number" &&
      currentTouch &&
      startedFromEdge &&
      openingDistance > 8 &&
      Math.abs(currentTouch.clientY - startY) < 42
    ) {
      event.preventDefault();
      drawerAnimationRef.current?.stop?.();
      previousFocusRef.current = menuButtonRef.current || document.activeElement;
      drawerGestureActiveRef.current = true;
      setMenuOpen(true);
      setMenuExpanded(true);
      setMenuSearchOpen(false);
      const nextX = isRtl
        ? Math.max(0, Math.min(width, width + deltaX))
        : Math.min(0, Math.max(-width, -width + deltaX));
      drawerX.set(nextX);
    }
  };

  const handlePageTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const endX = event.changedTouches?.[0]?.clientX;
    const endY = event.changedTouches?.[0]?.clientY;
    const elapsed = Math.max(Date.now() - touchStartTimeRef.current, 1);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchStartTimeRef.current = 0;

    if (
      !menuSearchOpen &&
      typeof startX === "number" &&
      typeof startY === "number" &&
      typeof endX === "number" &&
      typeof endY === "number"
    ) {
      const width = drawerWidth || getDrawerWidth();
      const deltaX = endX - startX;
      const openingDistance = isRtl ? -deltaX : deltaX;
      const velocity = openingDistance / elapsed;
      const progress = isRtl ? (width - drawerX.get()) / width : (drawerX.get() + width) / width;
      const shouldOpen = drawerGestureActiveRef.current && Math.abs(endY - startY) < 54 && (progress >= 0.44 || velocity > 0.55);
      const wasDrawerGesture = drawerGestureActiveRef.current;
      drawerGestureActiveRef.current = false;

      if (shouldOpen) {
        setMenuOpen(true);
        setMenuExpanded(true);
        animateDrawerTo(0);
      } else if (wasDrawerGesture) {
        setMenuExpanded(false);
        animateDrawerTo(getDrawerClosedX(width), {
          onComplete: () => setMenuOpen(false),
        });
      } else if (menuOpen) {
        animateDrawerTo(0);
      } else if (drawerX.get() !== getDrawerClosedX(width)) {
        setMenuExpanded(false);
        animateDrawerTo(getDrawerClosedX(width), {
          onComplete: () => setMenuOpen(false),
        });
      }
    }
  };

  const closeAttachmentSheet = () => {
    setAttachmentSheetOpen(false);
  };

  const closeImageSourceSheet = () => {
    setImageSourceSheetOpen(false);
  };

  const enterImageMode = () => {
    if (IS_IOS) {
      navigate("/mobile/create-image");
      return;
    }
    setIsImageMode(true);
    setIsWriteEditMode(false);
    setIsWriteEditCategoryBrowserOpen(false);
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

  const openWriteEditCategories = () => {
    clearMobileFlowParams();
    setIsWriteEditCategoryBrowserOpen(true);
    setIsWriteEditMode(false);
    setIsImageMode(false);
    setIsSearchMode(false);
    setActiveWriteTask(null);
    setPendingWriteTemplate(null);
    setWriteAttachmentChoiceOpen(false);
    setWriteAttachments([]);
    setMessage("");
    setAttachmentSheetOpen(false);
    setImageModeError("");
    setImageModeStatus("");
  };

  const closeWriteEditCategories = () => {
    setIsWriteEditCategoryBrowserOpen(false);
  };

  const enterWriteEditMode = () => {
    setIsWriteEditMode(true);
    setIsWriteEditCategoryBrowserOpen(false);
    setIsImageMode(false);
    setIsSearchMode(false);
    setAttachmentSheetOpen(false);
    setImageModeError("");
    setImageModeStatus("");
  };

  const exitWriteEditMode = () => {
    clearWriteTask();
    setIsWriteEditMode(false);
    setIsWriteEditCategoryBrowserOpen(false);
  };

  const enterSearchMode = () => {
    setIsSearchMode(true);
    setIsImageMode(false);
    setIsWriteEditMode(false);
    setIsWriteEditCategoryBrowserOpen(false);
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
    setIsWriteEditCategoryBrowserOpen(false);
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
    setIsWriteEditCategoryBrowserOpen(false);
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

  const openWritingAttachmentPicker = async (source, fallbackInputRef) => {
    closeAttachmentSheet();
    closeImageSourceSheet();
    if (Capacitor.getPlatform() === "ios") {
      const presented = await presentNativeIOSWritingAttachmentPicker(source);
      if (!presented) toast.error("Couldn’t open the iOS attachment picker.");
      return;
    }
    openFileInput(fallbackInputRef, source);
  };

  const openTemplateImageInput = (inputRef) => {
    closeAttachmentSheet();
    closeImageSourceSheet();
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const processWriteAttachmentFiles = async (selectedFiles) => {
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
        clientId: "",
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

  const handleWriteAttachmentSelection = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    await processWriteAttachmentFiles(selectedFiles);
  };

  const processImageFiles = async (files, { isCameraCapture = false } = {}) => {
    if (pendingWriteTemplate) {
      void processWriteAttachmentFiles(files);
      return;
    }
    if (files.length === 0) {
      return;
    }

    const templateForSelection = pendingImageTemplate;
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

  const handleImageSelection = async (event) => {
    const files = Array.from(event.target.files || []);
    const isCameraCapture = event.target === cameraInputRef.current;
    event.target.value = "";
    await processImageFiles(files, { isCameraCapture });
  };

  const fileFromNativeAttachment = (attachment) => {
    const binary = window.atob(String(attachment?.base64 || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new File([bytes], String(attachment?.name || "Attachment"), {
      type: String(attachment?.mimeType || "application/octet-stream"),
      lastModified: Date.now(),
    });
  };

  const processOptimisticNativeImages = async (nativeAttachments) => {
    const pending = nativeAttachments
      .map((attachment) => {
        try {
          return {
            clientId: String(attachment?.clientId || ""),
            file: fileFromNativeAttachment(attachment),
          };
        } catch {
          return null;
        }
      })
      .filter((entry) => entry?.clientId && pendingNativePhotoIdsRef.current.has(entry.clientId));

    if (!pending.length) {
      setIsUploadingImages(false);
      return;
    }

    let cursor = 0;
    let failedCount = 0;
    const uploadNext = async () => {
      while (cursor < pending.length) {
        const entry = pending[cursor];
        cursor += 1;
        try {
          const uploaded = await uploadChatImage(entry.file, activeConversationId);
          if (!uploaded?.id) throw new Error("Image upload failed");
          setAttachedImages((current) => {
            const nextImages = current.map((image) => (
              image.id === entry.clientId || image.clientId === entry.clientId
              ? {
                  ...image,
                  id: uploaded.id,
                  clientId: entry.clientId,
                  file: entry.file,
                  uploadState: "uploaded",
                }
              : image
            ));
            attachedImagesRef.current = nextImages;
            return nextImages;
          });
        } catch (error) {
          failedCount += 1;
          setAttachedImages((current) => {
            const nextImages = current.map((image) => (
              image.id === entry.clientId || image.clientId === entry.clientId
              ? { ...image, uploadState: "failed", uploadError: error?.message || "Upload failed" }
              : image
            ));
            attachedImagesRef.current = nextImages;
            return nextImages;
          });
        } finally {
          pendingNativePhotoIdsRef.current.delete(entry.clientId);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(3, pending.length) }, () => uploadNext()));
    setIsUploadingImages(false);
    if (failedCount) toast.error(failedCount === 1 ? "One image couldn’t be uploaded." : `${failedCount} images couldn’t be uploaded.`);
  };

  const removeAttachedImage = (imageId) => {
    pendingNativePhotoIdsRef.current.delete(String(imageId));
    setAttachedImages((current) => {
      const target = current.find((image) => image.id === imageId || image.clientId === imageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const nextImages = current.filter((image) => image.id !== imageId && image.clientId !== imageId);
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
    setIsChatSubmitting(false);
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
    setIsChatSubmitting(true);
    setIsChatSending(true);
    if (isListening) stopVoiceInput();

    const selectedMode = normalizeAiModeId(mode || responseMode);
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
      thinkingEnabled: headerThinkingEnabled,
      chatMode: activeWriteTask || chatSessionMode === "writing" || isWriteEditMode ? "write_edit" : metadata.chatMode || "chat",
      workspace: chatSessionMode === "writing" || isWriteEditMode ? "writing" : metadata.workspace,
      writingType: chatSessionMode === "writing" || isWriteEditMode ? selectedWritingCategoryId : metadata.writingType,
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
    window.requestAnimationFrame(() => {
      scrollToBottom("auto");
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    });

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
    const authenticated = await ensureMobileChatAuth();
    if (!authenticated) {
      setMessages((current) =>
        current.map((item) =>
          item.id === aiMessageId
            ? { ...item, content: "Please sign in to continue.", isStreaming: false }
            : item,
        ),
      );
      activeAiMessageRef.current = null;
      sendLockRef.current = false;
      setIsChatSubmitting(false);
      setIsChatSending(false);
      window.requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }
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
        projectId: chatSessionMode === "normal" ? activeProjectId || undefined : undefined,
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
        onAiStart: () => {
          setIsChatSubmitting(false);
        },
        onReady: (payload) => {
          setIsChatSubmitting(false);
          if (payload?.conversation?.conversationId && chatSessionMode !== "hidden") {
            const next = new URLSearchParams(searchParams);
            next.set("conversation", payload.conversation.conversationId);
            setSearchParams(next);
            if (activeProjectId && !activeConversationId) toast.success("Chat created");
          }
        },
        onDelta: (payload) => {
          setIsChatSubmitting(false);
          queueAiDelta(aiMessageId, payload?.token);
        },
        onComplete: (payload) => {
          setIsChatSubmitting(false);
          flushAiDelta(aiMessageId);
          if (payload?.conversation?.conversationId && chatSessionMode !== "hidden") {
            const next = new URLSearchParams(searchParams);
            next.set("conversation", payload.conversation.conversationId);
            setSearchParams(next);
          }
          setMessages((current) =>
            current.map((item) =>
              item.id === aiMessageId
                ? {
                    ...item,
                    id: payload?.message?.id || item.id,
                    content: item.content || payload?.message?.content || "",
                    metadata: {
                      ...(item.metadata || {}),
                      ...(payload?.message?.metadata || {}),
                    },
                    createdAt: payload?.message?.createdAt || item.createdAt,
                    isStreaming: false,
                  }
                : item,
            ),
          );
        },
      });
    } catch (error) {
      flushAiDelta(aiMessageId);
      if (stopRequestedRef.current || error?.name === "AbortError" || controller.signal.aborted) {
        setIsChatSubmitting(false);
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
      setIsChatSubmitting(false);
      setIsChatSending(false);
      sendLockRef.current = false;
    }
  }, [activeConversationId, activePrivateSpace?.privateSpaceId, activeProjectId, activeWriteTask, chatSessionMode, ensureMobileChatAuth, flushAiDelta, headerModelId, headerThinkingEnabled, isChatSending, isGeneratingImage, isListening, isWriteEditMode, privateSpaceAccessToken, queueAiDelta, responseMode, scrollToBottom, searchParams, selectedWritingCategoryId, setSearchParams, stopVoiceInput, thinkingLevel, writeAttachments]);

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

  const handleDislikeMessage = useCallback((item, event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const menuWidth = Math.min(window.innerWidth * 0.78, 248);
    const estimatedMenuHeight = 236;
    const gap = 8;
    const margin = 12;

    if (rect) {
      const left = Math.min(
        Math.max(rect.left - 8, margin),
        window.innerWidth - menuWidth - margin,
      );
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - margin);
      const spaceAbove = Math.max(0, rect.top - gap - margin);
      const shouldOpenAbove = spaceBelow < estimatedMenuHeight && spaceAbove >= spaceBelow;

      setDislikeMenuPosition({
        left,
        y: shouldOpenAbove ? rect.top - gap : rect.bottom + gap,
        placement: shouldOpenAbove ? "above" : "below",
        maxHeight: Math.max(180, Math.min(estimatedMenuHeight, shouldOpenAbove ? spaceAbove : spaceBelow)),
      });
    } else {
      setDislikeMenuPosition({
        left: Math.max(12, (window.innerWidth - menuWidth) / 2),
        y: window.innerHeight / 2,
        placement: "below",
        maxHeight: estimatedMenuHeight,
      });
    }

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

  const streamMessageReplacement = useCallback(async (item, option = "retry") => {
    if (isChatSending || !item?.id) return;
    if (!["normal", "writing"].includes(chatSessionMode) || !activeConversationId) {
      toast.error("This action is available in saved chats.");
      return;
    }

    setMessageMoreTarget(null);
    setImproveTarget(null);
    setIsChatSubmitting(true);
    setIsChatSending(true);
    stopRequestedRef.current = false;
    activeAiMessageRef.current = item.id;
    setMessages((current) =>
      current.map((messageItem) =>
        messageItem.id === item.id
          ? {
              ...messageItem,
              content: "",
              isStreaming: true,
              metadata: {
                ...(messageItem.metadata || {}),
                action: option === "retry" ? "retry" : "improve_answer",
                improvementOption: option !== "retry" ? option : undefined,
              },
            }
          : messageItem,
      ),
    );
    window.requestAnimationFrame(() => scrollToBottom("smooth"));

    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const streamAction = option === "retry" ? streamRegenerateMessage : streamImproveMessage;
      await streamAction({
        conversationId: activeConversationId,
        messageId: item.id,
        option,
        signal: controller.signal,
        onAiStart: () => setIsChatSubmitting(false),
        onReady: () => setIsChatSubmitting(false),
        onDelta: (payload) => {
          setIsChatSubmitting(false);
          queueAiDelta(item.id, payload?.token);
        },
        onComplete: (payload) => {
          setIsChatSubmitting(false);
          flushAiDelta(item.id);
          setMessages((current) =>
            current.map((messageItem) =>
              messageItem.id === item.id
                ? {
                    ...messageItem,
                    id: payload?.message?.id || messageItem.id,
                    content: messageItem.content || payload?.message?.content || "",
                    metadata: {
                      ...(messageItem.metadata || {}),
                      ...(payload?.message?.metadata || {}),
                    },
                    isStreaming: false,
                  }
                : messageItem,
            ),
          );
        },
        onError: () => {
          toast.error(option === "retry" ? t("regenerateFailed") : "Could not improve this answer");
        },
      });
    } catch (error) {
      flushAiDelta(item.id);
      if (stopRequestedRef.current || error?.name === "AbortError" || controller.signal.aborted) {
        setMessages((current) =>
          current.map((messageItem) =>
            messageItem.id === item.id
              ? { ...messageItem, isStreaming: false }
              : messageItem,
          ),
        );
      } else {
        setMessages((current) =>
          current.map((messageItem) =>
            messageItem.id === item.id
              ? { ...messageItem, content: item.content || "Could not regenerate this reply.", isStreaming: false }
              : messageItem,
          ),
        );
        toast.error(option === "retry" ? t("regenerateFailed") : "Could not improve this answer");
      }
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
      if (activeAiMessageRef.current === item.id) {
        activeAiMessageRef.current = null;
      }
      stopRequestedRef.current = false;
      setIsChatSubmitting(false);
      setIsChatSending(false);
      sendLockRef.current = false;
    }
  }, [activeConversationId, chatSessionMode, flushAiDelta, isChatSending, queueAiDelta, scrollToBottom, t]);

  const handleRegenerateMessage = useCallback((item) => {
    void streamMessageReplacement(item, "retry");
  }, [streamMessageReplacement]);

  const handleBranchMessage = useCallback(async (item) => {
    if (chatSessionMode !== "normal" || !activeConversationId || !item?.id) {
      toast.error("Branching is available in saved chats.");
      return;
    }

    setMessageMoreTarget(null);
    setIsOpeningConversation(true);
    try {
      const data = await branchConversation(activeConversationId, item.id);
      const conversation = data?.conversation;
      if (!conversation?.conversationId) {
        throw new Error("Missing branched conversation");
      }
      setMessages(mapMobileConversationMessages(conversation));
      setChatHomeDismissed(true);
      setMessage("");
      const next = new URLSearchParams(searchParams);
      next.set("conversation", conversation.conversationId);
      setSearchParams(next);
      loadedConversationRef.current = conversation.conversationId;
      await loadConversationHistory();
      window.requestAnimationFrame(() => scrollToBottom("auto"));
      toast.success("Branched in new chat");
    } catch (error) {
      toast.error(error?.message || "Could not branch this chat");
    } finally {
      setIsOpeningConversation(false);
    }
  }, [activeConversationId, chatSessionMode, loadConversationHistory, scrollToBottom, searchParams, setSearchParams]);

  const handleOpenImproveMenu = useCallback((item) => {
    setMessageMoreTarget(null);
    setImproveTarget(item);
  }, []);

  const handleSelectImproveOption = useCallback((option) => {
    const target = improveTarget;
    if (!target) return;
    setImproveTarget(null);
    void streamMessageReplacement(target, option);
  }, [improveTarget, streamMessageReplacement]);

  const handleWritingResponseAction = useCallback((item, option) => {
    if (["clearer", "shorter", "simpler"].includes(option)) {
      void streamMessageReplacement(item, option);
      return;
    }
    const instructions = {
      longer: "Rewrite the writing below with more useful detail while preserving its intent.",
      professional: "Rewrite the writing below in a polished professional tone.",
      rewrite: "Rewrite the writing below with fresh wording while preserving its meaning.",
      translate: "Translate the writing below. Infer the target language from our conversation; if none was specified, ask me which language to use.",
    };
    void sendChatPrompt({
      prompt: `${instructions[option] || instructions.rewrite}\n\n${item.content || ""}`,
      hideUserMessage: true,
      metadata: { workspace: "writing", chatSessionMode: "writing", writingType: selectedWritingCategoryId, sourceMessageId: item.id, writingAction: option },
    });
  }, [selectedWritingCategoryId, sendChatPrompt, streamMessageReplacement]);

  const handleOpenReportDialog = useCallback((item) => {
    setMessageMoreTarget(null);
    setReportTarget(item);
    setReportReason("incorrect");
    setReportDetails("");
  }, []);

  const handleSubmitMessageReport = useCallback(async (event) => {
    event.preventDefault();
    if (!reportTarget || isSubmittingReport) return;

    setIsSubmittingReport(true);
    try {
      const reasonLabels = {
        incorrect: "Incorrect answer",
        not_helpful: "Not helpful",
        unsafe: "Unsafe / inappropriate",
        other: "Other",
      };
      const details = reportDetails.trim();
      await reportIssue({
        title: `Chat response problem: ${reasonLabels[reportReason] || "Other"}`,
        description: [
          `Reason: ${reasonLabels[reportReason] || reportReason}`,
          `Conversation ID: ${activeConversationId || "unsaved"}`,
          `Message ID: ${reportTarget.id}`,
          "",
          "Message:",
          reportTarget.content || "(empty)",
          "",
          details ? `Details:\n${details}` : "Details: No extra details provided.",
        ].join("\n"),
        platform: "mobile",
        appVersion: "0.1.0",
        attachments: [],
      });
      persistMessageFeedback(reportTarget.id, {
        report: {
          reason: reportReason,
          details,
        },
      });
      setReportTarget(null);
      setReportDetails("");
      toast.success("Report submitted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not submit report"));
    } finally {
      setIsSubmittingReport(false);
    }
  }, [activeConversationId, isSubmittingReport, persistMessageFeedback, reportDetails, reportReason, reportTarget]);

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

  const handleMoreMessage = useCallback((item) => {
    setMessageMoreTarget((current) => current === item.id ? null : item.id);
  }, []);

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

  const finalizeVoiceInput = useCallback(async ({ send = false, previewOverride = "" } = {}) => {
    if (voiceSendLockRef.current) return;
    voiceSendLockRef.current = true;
    setVoiceStatus("transcribing");

    const liveFallback = String(previewOverride || voicePreviewRef.current || voicePreview || voiceLiveTranscript || "").trim();

    try {
      const audioBlob = await stopVoiceInput();
      let transcript = "";

      if (audioBlob?.size >= 512) {
        try {
          const result = await transcribeVoiceAudio(audioBlob);
          transcript = String(result?.text || "").trim();
        } catch (error) {
          if (!liveFallback) throw error;
          transcript = liveFallback;
          toast.info("Using the live transcript because final transcription was unavailable.");
        }
      } else {
        transcript = liveFallback;
      }

      if (!transcript) {
        throw new Error("No speech detected. Please try again.");
      }

      const finalText = appendVoiceText(voiceBaseTextRef.current, transcript);
      setMessage(finalText);
      voicePreviewRef.current = "";
      setVoicePreview("");
      window.requestAnimationFrame(() => resizeChatComposer(composerInputRef.current));

      if (send) {
        if (isImageMode) {
          setVoiceStatus("ready");
          toast.info("Voice text is ready. Review it, then send to generate the image.");
          return;
        }

        setVoiceStatus("sending");
        await sendChatPrompt({
          prompt: finalText || "Please analyze these images.",
          imageIds: attachedImages.map((image) => image.id).filter(Boolean),
          displayAttachments: attachedImages,
          metadata: isSearchMode ? { chatMode: "web_search", source: "voice" } : { source: "voice" },
          allowWhileBusy: true,
        });
        setVoiceStatus("idle");
      } else {
        setVoiceStatus("transcriptReady");
      }
    } catch (error) {
      setVoiceStatus("error");
      toast.error(error?.message || "Transcription failed. Please try again.");
    } finally {
      voiceSendLockRef.current = false;
    }
  }, [attachedImages, isImageMode, isSearchMode, resizeChatComposer, sendChatPrompt, stopVoiceInput, voiceLiveTranscript, voicePreview]);

  const startVoiceInput = useCallback(async () => {
    if (isListening || ["requesting", "listening", "transcribing"].includes(voiceStatus)) {
      await finalizeVoiceInput({ send: false });
      return;
    }

    voiceBaseTextRef.current = message;
    voicePreviewRef.current = "";
    setVoicePreview("");
    setVoiceStatus("requesting");
    const started = await startVoiceCapture({ language: voiceLanguage });

    if (!started) {
      setVoiceStatus("error");
    }
  }, [finalizeVoiceInput, isListening, message, startVoiceCapture, voiceLanguage, voiceStatus]);

  const nativeGlassActive = nativeGlassSupported
    && nativeGlassBridgeReady
    && ["normal", "writing", "hidden", "private"].includes(chatSessionMode)
    && !isImageMode
    && !isWriteEditMode
    && !isSearchMode
    && !menuSearchOpen
    && !chatEntrySheetOpen
    && !settingsSheetOpen
    && !activeWriteTask;

  useEffect(() => {
    let cancelled = false;

    prepareNativeGlassExperiment().then((supported) => {
      if (!cancelled) setNativeGlassSupported(supported);
    });

    return () => {
      cancelled = true;
      void setNativeGlassVisible(false);
    };
  }, []);

  useEffect(() => {
    void setNativeGlassVisible(nativeGlassActive);
  }, [nativeGlassActive]);

  useEffect(() => {
    let cancelled = false;
    const composerAttachments = isWriteEditMode ? writeAttachments : attachedImages;
    if (!nativeGlassActive || composerAttachments.length === 0) {
      setNativeGlassAttachments([]);
      return undefined;
    }

    prepareNativeGlassAttachments(composerAttachments).then((previews) => {
      if (!cancelled) setNativeGlassAttachments(previews);
    });

    return () => {
      cancelled = true;
    };
  }, [attachedImages, isWriteEditMode, nativeGlassActive, writeAttachments]);

  useEffect(() => {
    if (!nativeGlassActive) return;

    void updateNativeGlassState({
      ackEventId: nativeGlassAckEventIdRef.current,
      text: message,
      canSend: (isChatSending || hasComposerContent) && !isGeneratingImage && !isUploadingImages,
      isSending: isChatSending || isGeneratingImage,
      isListening,
      voiceStatus,
      voiceTranscript: voiceLiveTranscript || voicePreview,
      attachments: nativeGlassAttachments,
      isUploadingAttachments: isUploadingImages,
      isComposerVisible: chatSessionMode === "writing" || (!attachmentSheetOpen && !imageSourceSheetOpen),
      isHeaderVisible: true,
      isMenuOpen: menuExpanded,
      isDark,
      isRTL: isRtl,
      accentColor: prefs?.appColor || prefs?.accentColor || "#193B68",
      brandPrimaryColor: BLUE_MIND_COLORS.primary,
      isWritingMode: chatSessionMode === "writing",
      isAIPlanMode: false,
      chatSessionMode,
      modeStatusTitle: chatSessionMode === "private"
        ? `${activePrivateSpace?.name || "Private"} Chat`
        : chatSessionMode === "hidden" ? "Hidden Mode" : "",
      modeExitTitle: chatSessionMode === "private" ? "Exit Private Chat" : "Exit Hidden Chat",
      placeholder: chatSessionMode === "writing" ? "Ask BlueMind to write…" : "Ask anything…",
      headerTitlePrefix: chatSessionMode === "writing" ? "Writing" : "",
      quickActions: shouldShowWritingModeHome ? ["Write an email", "Improve text", "Rewrite professionally", "Translate"] : [],
      selectedMode: chatSessionMode === "writing" ? selectedWritingCategoryId : responseMode,
      selectedModel: headerModelId,
      thinkingEnabled: headerThinkingEnabled,
      models: MOBILE_HEADER_MODELS.map((model) => ({
        id: model.id,
        title: model.label,
        badge: model.badge || "",
      })),
      modes: chatSessionMode === "writing"
        ? writingCategories.map((category) => ({ id: category.id, title: category.label }))
        : AI_MODES.map((mode) => ({
          id: mode.id,
          title: getAiSpecializationLabel(mode),
        })),
    });
  }, [activePrivateSpace?.name, attachmentSheetOpen, chatSessionMode, hasComposerContent, headerModelId, headerThinkingEnabled, imageSourceSheetOpen, isChatSending, isDark, isGeneratingImage, isListening, isRtl, isUploadingImages, menuExpanded, message, nativeGlassActive, nativeGlassAttachments, prefs?.accentColor, prefs?.appColor, responseMode, selectedWritingCategoryId, shouldShowWritingModeHome, voiceLiveTranscript, voicePreview, voiceStatus, writingCategories]);

  useEffect(() => {
    if (!nativeGlassActive || !isListening) return undefined;
    if (nativeGlassAudioTimerRef.current) return undefined;

    nativeGlassAudioTimerRef.current = window.setTimeout(() => {
      nativeGlassAudioTimerRef.current = null;
      void updateNativeGlassAudioLevels(voiceAudioLevels);
    }, 70);

    return undefined;
  }, [isListening, nativeGlassActive, voiceAudioLevels]);

  useEffect(() => () => {
    if (nativeGlassAudioTimerRef.current) {
      window.clearTimeout(nativeGlassAudioTimerRef.current);
      nativeGlassAudioTimerRef.current = null;
    }
  }, []);

  nativeGlassMenuOpenRef.current = menuExpanded;
  nativeGlassActionRef.current = async ({ action, text, mode, attachmentId, conversationId, requestId, value, confirmed, privateSpaceId, attachments, source }) => {
    console.info("[BlueMindNativeGlass][React] handler", action || "missing-action");
    switch (action) {
      case "settingsSelection": {
        if (String(requestId || "").startsWith("move-chat:")) {
          const targetConversationId = String(requestId).slice("move-chat:".length);
          const projects = await listProjects();
          const selectedProject = projects.find((project) => String(project.id || project._id || "") === value);
          if (selectedProject) await moveChatToProject(targetConversationId, value, selectedProject.name);
          break;
        }
        if (requestId === "writing-type") {
          if (writingCategories.some((category) => category.id === value)) {
            setSelectedWritingCategoryId(value);
          }
          break;
        }
        if (requestId === "writing-tools") {
          if (value === "style") focusWritingStyleRequest();
          if (value === "new") startNewChat();
          if (value === "type") {
            await presentNativeIOSSelection({
              title: "Writing Type",
              selectedValue: selectedWritingCategoryId,
              requestId: "writing-type",
              options: writingCategories.map((category) => ({ value: category.id, label: category.label, symbol: "doc.text" })),
            });
          }
          break;
        }
        break;
      }
      case "chatEntrySheetAction": {
        if (requestId === "hidden-chat-entry") {
          if (value === "start") startHiddenChat();
          else setHiddenChatModalOpen(false);
          break;
        }
        if (requestId !== "private-chat-entry") break;
        if (value === "close") {
          setPrivateSpaceModalOpen(false);
          break;
        }
        const space = privateSpaces.find((item) => item.privateSpaceId === privateSpaceId);
        if (value === "select" && space) {
          nativePrivateFlowRef.current = { kind: "unlock", space };
          await presentNativeIOSSecurePrompt({ title: `Unlock ${space.name}`, message: "Enter the private chat PIN.", placeholder: "PIN", confirmTitle: "Unlock", requestId: "native-private-unlock" });
        } else if (value === "create") {
          nativePrivateFlowRef.current = { kind: "create" };
          await presentNativeIOSTextPrompt({ title: "Create Private Chat", message: "Give this protected chat a name.", placeholder: "Chat name", confirmTitle: "Continue", requestId: "native-private-create-name" });
        } else if (value === "rename" && space) {
          nativePrivateFlowRef.current = { kind: "rename", space };
          await presentNativeIOSTextPrompt({ title: "Rename Private Chat", placeholder: "Chat name", value: space.name, confirmTitle: "Save", requestId: "native-private-rename" });
        } else if (value === "delete" && space) {
          nativePrivateFlowRef.current = { kind: "delete", space };
          await presentNativeIOSConfirmation({ title: "Delete Private Chat?", message: "All conversations inside it will be permanently deleted.", confirmTitle: "Delete", destructive: true, requestId: "native-private-delete" });
        } else if (value === "changePin" && space) {
          nativePrivateFlowRef.current = { kind: "changePin", space };
          await presentNativeIOSSecurePrompt({ title: "Change PIN", message: "Enter the current PIN.", placeholder: "Current PIN", confirmTitle: "Continue", requestId: "native-private-current-pin" });
        }
        break;
      }
      case "settingsSecurePrompt": {
        const flow = nativePrivateFlowRef.current;
        if (!String(requestId || "").startsWith("native-private-")) break;
        if (!confirmed) {
          nativePrivateFlowRef.current = null;
          setPrivateSpaceModalOpen(false);
          break;
        }
        const entered = String(value || "");
        try {
          if (requestId === "native-private-create-name") {
            const name = entered.trim();
            if (!name) throw new Error("A private chat name is required");
            nativePrivateFlowRef.current = { ...flow, name };
            await presentNativeIOSSecurePrompt({ title: "Create Private Chat", message: "Choose a PIN.", placeholder: "PIN", confirmTitle: "Continue", requestId: "native-private-create-pin" });
          } else if (requestId === "native-private-create-pin") {
            nativePrivateFlowRef.current = { ...flow, pin: entered };
            await presentNativeIOSSecurePrompt({ title: "Confirm PIN", message: "Enter the PIN again.", placeholder: "Confirm PIN", confirmTitle: "Create", requestId: "native-private-create-confirm" });
          } else if (requestId === "native-private-create-confirm") {
            await createPrivateSpace({ name: flow?.name || "", pin: flow?.pin || "", confirmPin: entered });
            await loadMobilePrivateSpaces();
            setPrivateSpaceModalOpen(false);
            nativePrivateFlowRef.current = null;
            toast.success("Private space created");
          } else if (requestId === "native-private-unlock" && flow?.space) {
            const data = await unlockPrivateSpace(flow.space.privateSpaceId, entered);
            const unlockedSpace = data?.privateSpace || flow.space;
            setActivePrivateSpace(unlockedSpace);
            setPrivateSpaceAccessToken(data?.accessToken || "");
            setChatSessionMode("private");
            setPrivateSpaceModalOpen(false);
            startNewChat();
            const chats = await listPrivateSpaceChats(unlockedSpace.privateSpaceId, data?.accessToken || "");
            setConversations(Array.isArray(chats?.items) ? chats.items : []);
            nativePrivateFlowRef.current = null;
          } else if (requestId === "native-private-rename" && flow?.space) {
            const name = entered.trim();
            if (!name) throw new Error("A private chat name is required");
            const data = await renamePrivateSpace(flow.space.privateSpaceId, name);
            if (data?.privateSpace) setPrivateSpaces((items) => items.map((item) => item.privateSpaceId === data.privateSpace.privateSpaceId ? data.privateSpace : item));
            setPrivateSpaceModalOpen(false);
            nativePrivateFlowRef.current = null;
          } else if (requestId === "native-private-current-pin") {
            nativePrivateFlowRef.current = { ...flow, currentPin: entered };
            await presentNativeIOSSecurePrompt({ title: "Change PIN", message: "Choose a new PIN.", placeholder: "New PIN", confirmTitle: "Continue", requestId: "native-private-new-pin" });
          } else if (requestId === "native-private-new-pin") {
            nativePrivateFlowRef.current = { ...flow, newPin: entered };
            await presentNativeIOSSecurePrompt({ title: "Confirm New PIN", placeholder: "Confirm New PIN", confirmTitle: "Change PIN", requestId: "native-private-confirm-pin" });
          } else if (requestId === "native-private-confirm-pin" && flow?.space) {
            await changePrivateSpacePin(flow.space.privateSpaceId, { currentPin: flow.currentPin, newPin: flow.newPin, confirmNewPin: entered });
            setPrivateSpaceModalOpen(false);
            nativePrivateFlowRef.current = null;
            toast.success("PIN changed");
          }
        } catch (error) {
          toast.error(error?.message || "Could not update private chat");
          nativePrivateFlowRef.current = null;
          setPrivateSpaceModalOpen(false);
        }
        break;
      }
      case "settingsConfirmation": {
        const flow = nativePrivateFlowRef.current;
        if (requestId !== "native-private-delete") break;
        if (confirmed && flow?.space) {
          try {
            await deletePrivateSpace(flow.space.privateSpaceId);
            setPrivateSpaces((items) => items.filter((item) => item.privateSpaceId !== flow.space.privateSpaceId));
          } catch (error) {
            toast.error(error?.message || "Could not delete private chat");
          }
        }
        nativePrivateFlowRef.current = null;
        setPrivateSpaceModalOpen(false);
        break;
      }
      case "menu": {
        const shouldClose = nativeGlassMenuOpenRef.current;
        nativeGlassMenuOpenRef.current = !shouldClose;
        if (shouldClose) closeMenu();
        else openMenu();
        break;
      }
      case "menuClose":
        nativeGlassMenuOpenRef.current = false;
        closeMenu();
        break;
      case "newChat":
        startNewChat();
        break;
      case "exitChatMode":
        if (chatSessionMode === "private") exitPrivateSpace();
        else if (chatSessionMode === "hidden") exitHiddenMode();
        break;
      case "writingTools":
        await openWritingTools();
        break;
      case "writingQuickAction":
        if (text) setMessage(`${String(text)}: `);
        break;
      case "selectMode":
        if (mode && chatSessionMode === "writing" && writingCategories.some((category) => category.id === mode)) {
          setSelectedWritingCategoryId(mode);
        } else if (mode) {
          await selectResponseMode(mode);
        }
        break;
      case "selectModel":
        if (mode && MOBILE_HEADER_MODELS.some((model) => model.id === mode)) {
          setHeaderModelId(mode);
        }
        break;
      case "toggleThinking":
        setHeaderThinkingEnabled((enabled) => !enabled);
        break;
      case "textChanged":
        setMessage(String(text || ""));
        break;
      case "plus":
        if (chatSessionMode === "normal" && nativeGlassActive) {
          if (!await presentNativeIOSChatAttachmentSheet()) setAttachmentSheetOpen(true);
        } else {
          setAttachmentSheetOpen(true);
        }
        break;
      case "chatAttachmentCamera":
        await openWritingAttachmentPicker("camera", cameraInputRef);
        break;
      case "chatAttachmentPhotos":
        await openWritingAttachmentPicker("photos", imageInputRef);
        break;
      case "chatAttachmentFiles":
        await openWritingAttachmentPicker("files", fileInputRef);
        break;
      case "chatAttachmentPreviews": {
        const previewReceivedAt = performance.now();
        const availableSlots = Math.max(0, MAX_IMAGE_ATTACHMENTS - attachedImagesRef.current.length);
        const previews = (Array.isArray(attachments) ? attachments : []).slice(0, availableSlots);
        if (!previews.length) break;
        const optimisticImages = previews.map((attachment) => {
          const id = String(attachment?.id || crypto.randomUUID());
          pendingNativePhotoIdsRef.current.add(id);
          return {
            id,
            clientId: id,
            name: String(attachment?.name || "Photo"),
            previewData: `data:${String(attachment?.mimeType || "image/jpeg")};base64,${String(attachment?.previewBase64 || "")}`,
            previewUrl: `data:${String(attachment?.mimeType || "image/jpeg")};base64,${String(attachment?.previewBase64 || "")}`,
            assetIdentifier: String(attachment?.assetIdentifier || ""),
            uploadState: "uploading",
            isOptimistic: true,
          };
        });
        const optimisticIds = new Set(optimisticImages.map((image) => image.clientId));
        const retainedImages = attachedImagesRef.current.filter((image) => !optimisticIds.has(image.clientId || image.id));
        const nextImages = [...retainedImages, ...optimisticImages].slice(0, MAX_IMAGE_ATTACHMENTS);
        attachedImagesRef.current = nextImages;
        setAttachedImages(nextImages);
        setIsUploadingImages(true);
        if (import.meta.env.DEV) {
          window.requestAnimationFrame(() => {
            console.info(`[BlueMindCameraTiming] native-preview-to-render-ms=${Math.round(performance.now() - previewReceivedAt)}`);
          });
        }
        break;
      }
      case "chatToolCreateImage":
        enterImageMode();
        break;
      case "chatToolWebSearch":
        enterSearchMode();
        break;
      case "chatToolResearch":
        await selectResponseMode("research");
        break;
      case "chatToolWriteEdit":
        openWriteEditCategories();
        break;
      case "askSelectedText": {
        const selectedText = String(text || "");
        if (!selectedText.trim()) break;
        setMessage(`Explain this:\n\n"${selectedText}"`);
        setChatHomeDismissed(true);
        window.requestAnimationFrame(() => {
          composerInputRef.current?.focus?.();
          resizeChatComposer(composerInputRef.current);
        });
        break;
      }
      case "writingCamera":
        await openWritingAttachmentPicker("camera", cameraInputRef);
        break;
      case "writingPhotos":
        await openWritingAttachmentPicker("photos", imageInputRef);
        break;
      case "writingFiles":
        await openWritingAttachmentPicker("files", fileInputRef);
        break;
      case "writingAttachmentsPicked": {
        const nativeAttachments = Array.isArray(attachments) ? attachments : [];
        if (nativeAttachments.some((attachment) => attachment?.clientId)) {
          await processOptimisticNativeImages(nativeAttachments);
          break;
        }
        const files = nativeAttachments
          .map((attachment) => {
            try { return fileFromNativeAttachment(attachment); } catch { return null; }
          })
          .filter(Boolean);
        if (!files.length) break;
        if (source === "files") await processWriteAttachmentFiles(files);
        else await processImageFiles(files, { isCameraCapture: source === "camera" });
        break;
      }
      case "removeAttachment":
        if (attachmentId) {
          const normalizedId = String(attachmentId);
          if (writeAttachments.some((file) => (file.clientId || file.id) === normalizedId)) {
            removeWriteAttachment(normalizedId);
          } else {
            removeAttachedImage(normalizedId);
          }
        }
        break;
      case "conversationRenameConfirmed": {
        const conversation = conversations.find((item) => item.conversationId === conversationId);
        if (conversation) await performRenameConversation(conversation, text);
        break;
      }
      case "conversationDeleteConfirmed": {
        const conversation = conversations.find((item) => item.conversationId === conversationId);
        if (conversation) await performDeleteConversation(conversation);
        break;
      }
      case "conversationPin":
        break;
      case "conversationAddToProject":
        await openMoveToProject(conversationId);
        break;
      case "microphone":
        if (nativeGlassMicrophoneLockRef.current) break;
        nativeGlassMicrophoneLockRef.current = true;
        try {
          await startVoiceInput();
        } finally {
          nativeGlassMicrophoneLockRef.current = false;
        }
        break;
      case "voiceCancel":
        await handleCancelVoiceInput();
        break;
      case "voiceStop":
        handleStopVoiceInput();
        break;
      case "voiceSend":
        handleSendVoiceInput();
        break;
      case "stop":
        stopChatGeneration();
        break;
      case "send": {
        if (nativeGlassSendLockRef.current || sendLockRef.current) break;
        const nativeText = String(text || "").trim();
        if (!nativeText && attachedImages.length === 0) break;

        nativeGlassSendLockRef.current = true;
        try {
          await sendChatPrompt({
            prompt: nativeText || "Please analyze these images.",
            imageIds: attachedImages.map((image) => image.id).filter(Boolean),
            displayAttachments: attachedImages,
          });
        } finally {
          nativeGlassSendLockRef.current = false;
        }
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    if (!nativeGlassSupported) return undefined;

    let listenerHandle;
    let cancelled = false;

    addNativeGlassActionListener((event) => {
      if (event?.eventId) nativeGlassAckEventIdRef.current = String(event.eventId);
      console.info("[BlueMindNativeGlass][React] receive", event?.action || "missing-action", event?.eventId || "missing-event-id");
      void nativeGlassActionRef.current(event);
    })
      .then((handle) => {
        if (cancelled) {
          void handle.remove();
          return;
        }
        listenerHandle = handle;
        setNativeGlassBridgeReady(true);
      })
      .catch(() => {
        if (!cancelled) setNativeGlassBridgeReady(false);
      });

    return () => {
      cancelled = true;
      setNativeGlassBridgeReady(false);
      if (listenerHandle) void listenerHandle.remove();
    };
  }, [nativeGlassSupported]);

  const handleCancelVoiceInput = useCallback(async () => {
    await cancelVoiceInput();
    setMessage(voiceBaseTextRef.current);
    voicePreviewRef.current = "";
    setVoicePreview("");
    setVoiceStatus("idle");
    voiceSendLockRef.current = false;
    window.requestAnimationFrame(() => resizeChatComposer(composerInputRef.current));
  }, [cancelVoiceInput, resizeChatComposer]);

  const handleStopVoiceInput = useCallback((previewOverride = "") => {
    void finalizeVoiceInput({ send: false, previewOverride });
  }, [finalizeVoiceInput]);

  const handleSendVoiceInput = useCallback((previewOverride = "") => {
    void finalizeVoiceInput({ send: true, previewOverride });
  }, [finalizeVoiceInput]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (isListening || voiceStatus === "requesting" || voiceStatus === "transcribing")) {
        void handleCancelVoiceInput();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleCancelVoiceInput, isListening, voiceStatus]);

  const renderComposerArea = (centered = false, separatePlus = centered) => {
    const composerModePill = isImageMode
      ? { label: selectedImageTemplate?.title ? `Create Image • ${selectedImageTemplate.title}` : "Create Image", onClear: exitImageMode, clearLabel: "Exit image mode" }
      : (isWriteEditMode || activeWriteTask)
        ? { label: "Writing Mode", onClear: exitWriteEditMode, clearLabel: "Exit writing mode" }
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
      { label: "Write / Edit", icon: PenLine, onClick: openWriteEditCategories },
      { label: "Create Images", icon: Image, onClick: enterImageMode },
      { label: "Search", icon: Search, onClick: enterSearchMode },
      { label: "Open Camera", icon: Camera, onClick: () => openFileInput(cameraInputRef, "camera") },
      { label: "Files / Photos", icon: FileText, onClick: () => openFileInput(imageInputRef, "photos") },
    ];
    const writingQuickActions = ["Write an email", "Improve text", "Rewrite professionally", "Translate"];

    return (
    <motion.div
      layout
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`bm-web-chat-composer ${
        centered
          ? "mx-auto w-full max-w-[430px] px-1"
          : "px-4 pb-[calc(env(safe-area-inset-bottom)+8px)]"
      }`}
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
            className="mb-1 w-full max-w-full overflow-x-auto overscroll-x-contain px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    className={cn(
                      "bm-mobile-glass-control bm-mobile-glass-chip shrink-0 text-[13px] font-bold",
                      isDark ? "text-white/84" : "text-[var(--bm-text-primary)]",
                    )}
                    aria-label={action.label}
                  >
                    <ActionIcon className={cn("h-4 w-4 shrink-0 stroke-[2.3]", isDark ? "text-white/74" : "text-[var(--bm-icon-primary)]")} />
                    <span className="whitespace-nowrap">{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {shouldShowWritingModeHome && (
        <div
          className="mb-2 w-full max-w-full overflow-x-auto overscroll-x-contain px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="mobile-writing-quick-actions"
        >
          <div className="flex w-max min-w-full items-center gap-2">
            {writingQuickActions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={cn(
                  "bm-mobile-glass-control bm-mobile-glass-chip shrink-0 text-[12px] font-semibold",
                  isDark ? "text-white/72" : "text-[var(--bm-text-secondary)]",
                )}
                onClick={() => {
                  setMessage(`${suggestion}: `);
                  setChatHomeDismissed(true);
                  window.requestAnimationFrame(() => composerInputRef.current?.focus?.());
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

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
            : (chatSessionMode === "writing" || isWriteEditMode || activeWriteTask)
              ? "Ask BlueMind to write..."
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
        voiceStatus={voiceStatus}
        voiceTranscript={voicePreview}
        onCancelVoice={handleCancelVoiceInput}
        onStopVoice={handleStopVoiceInput}
        onSendVoice={handleSendVoiceInput}
        canSendVoice={Boolean(voicePreview.trim()) || isListening}
        isBusy={isGeneratingImage || isChatSending || voiceStatus === "transcribing" || voiceStatus === "sending"}
        isSubmitting={isChatSubmitting && !isGeneratingImage}
        canSend={hasComposerContent}
        onSendAction={isChatSending ? stopChatGeneration : undefined}
        isDark={isDark}
        variant="mobile"
        glassTone="chat-light"
        minimalVoiceUi
        minRows={isImageMode || activeWriteTask || isSearchMode ? 3 : 1}
        maxTextHeight={isImageMode || chatSessionMode === "writing" || isWriteEditMode || activeWriteTask || isSearchMode ? 180 : 128}
        testId="mobile-chat-input"
      />

    </motion.div>
    );
  };

  const renderHomeQuickActions = () => {
    const quickActions = [
      { label: "Create Image", icon: Image, onClick: enterImageMode },
      { label: "Write / Edit", icon: PenLine, onClick: openWriteEditCategories },
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
              className={cn(
                "bm-mobile-glass-control bm-mobile-glass-chip text-[13px] font-bold",
                isDark ? "text-white/84" : "text-[var(--bm-text-primary)]",
              )}
            >
              <ActionIcon className={cn("h-4 w-4 shrink-0 stroke-[2.2]", isDark ? "text-white/74" : "text-[var(--bm-icon-primary)]")} />
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </motion.div>
    );
  };

  const focusWritingStyleRequest = () => {
    setMessage("Help me create or edit my personal writing style. Ask me for writing samples and guide me step by step.");
    setChatHomeDismissed(true);
    window.requestAnimationFrame(() => {
      composerInputRef.current?.focus?.();
      resizeChatComposer(composerInputRef.current);
    });
  };

  const openWritingTypeSelector = async (event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const shown = nativeGlassSupported && nativeGlassBridgeReady && await presentNativeIOSSelection({
      title: "Writing Type",
      selectedValue: selectedWritingCategoryId,
      requestId: "writing-type",
      anchorRect: rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : undefined,
      options: writingCategories.map((category) => ({
        value: category.id,
        label: category.label,
        symbol: category.id === "email" ? "envelope" : category.id === "story" ? "book" : category.id === "professional" ? "briefcase" : "doc.text",
      })),
    });
    if (!shown) setIsWriteEditCategoryBrowserOpen(true);
  };

  const openWritingTools = async (event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const shown = nativeGlassSupported && nativeGlassBridgeReady && await presentNativeIOSSelection({
      title: "Writing Tools",
      selectedValue: "",
      requestId: "writing-tools",
      anchorRect: rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : undefined,
      options: [
        { value: "style", label: "Personal Writing Style", symbol: "person.text.rectangle" },
        { value: "type", label: "Change Writing Type", symbol: "doc.text" },
        { value: "new", label: "Start New Writing Chat", symbol: "square.and.pencil" },
      ],
    });
    if (!shown) focusWritingStyleRequest();
  };

  const renderWritingModeHome = () => (
    <div className="flex min-h-[52vh] flex-col items-center justify-center px-4 pb-24 text-center" data-testid="mobile-writing-mode-home">
      <span className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-full", isDark ? "bg-white/[0.07] text-white" : "bg-black/[0.05] text-[var(--bm-primary)]")}>
        <PenLine className="h-5 w-5 stroke-[2.3]" />
      </span>
      <h1 className={cn("text-[22px] font-bold tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Writing Mode</h1>
      <p className={cn("mt-2 text-[14px] font-medium", mutedText)}>Write, rewrite, improve, or translate anything.</p>
    </div>
  );

  const renderMobileConversationRow = (item, context = "menu") => {
    const menuId = `${context}:${item.conversationId}`;
    const isActive = item.conversationId === activeConversationId;
    const rowUsesDarkAppearance = isDark || (nativeGlassSupported && context === "menu");

    return (
      <div
        key={menuId}
        className="relative py-2.5"
        data-native-conversation-id={nativeGlassSupported && isDark && context === "menu" ? item.conversationId : undefined}
        data-native-conversation-title={nativeGlassSupported && isDark && context === "menu" ? item.title || t("newChat") : undefined}
        style={nativeGlassSupported && isDark && context === "menu" ? { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } : undefined}
      >
        <button
          type="button"
          onClick={() => openConversation(item.conversationId)}
          className={cn("flex w-full min-w-0 items-start text-left", nativeGlassSupported && isDark && context === "menu" ? "pr-0" : "pr-12")}
          data-testid={`mobile-chat-row-${item.conversationId}`}
        >
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-semibold ${typeClasses.body} ${isActive ? rowUsesDarkAppearance ? "text-white" : "text-[var(--bm-primary)]" : rowUsesDarkAppearance ? "text-white" : textColor}`}>
              {item.title || t("newChat")}
            </span>
            <span className={`mt-1 block truncate font-medium ${typeClasses.small} ${rowUsesDarkAppearance ? "text-white/58" : "text-[var(--bm-text-secondary)]"}`}>
              {formatConversationTime(item.lastMessageAt || item.updatedAt, uiLanguage)}
            </span>
          </span>
        </button>

        {!(nativeGlassSupported && isDark && context === "menu") && <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setChatMenuTarget((current) => current === menuId ? null : menuId);
          }}
          className="absolute right-0 top-2 flex h-10 w-10 items-center justify-center rounded-full text-current transition-transform active:scale-90"
          aria-label="Conversation actions"
          data-testid={`mobile-chat-menu-${item.conversationId}`}
        >
          <MoreVertical className={iconClasses.button} />
        </button>}

        {!(nativeGlassSupported && isDark && context === "menu") && <AnimatePresence>
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
                {Capacitor.getPlatform() === "ios" ? <button
                  type="button"
                  onClick={() => { setChatMenuTarget(null); void openMoveToProject(item.conversationId); }}
                  className={isDark ? `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold active:bg-white/[0.08] ${typeClasses.small} ${iconClasses.iconText}` : `bm-glass-menu-item flex min-h-[42px] w-full items-center rounded-[15px] px-3 py-2 text-left font-semibold active:bg-[var(--bm-hover-bg)] ${typeClasses.small} ${iconClasses.iconText}`}
                  role="menuitem"
                >
                  <FolderKanban className={iconClasses.button} />
                  Move to Project
                </button> : null}
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
        </AnimatePresence>}
      </div>
    );
  };

  const renderFeatureCarousel = () => {
    const carouselCards = [...mobileFeatureCards, mobileFeatureCards[0]];
    const activeFeatureIndex = featureCarouselIndex % featureCarouselCount;

    return (
      <motion.section
        key="mobile-feature-carousel"
        className="w-full max-w-full shrink-0 overflow-hidden pb-3 pt-[calc(env(safe-area-inset-top)+5rem)]"
        data-testid="mobile-feature-carousel"
        initial={{ opacity: 0, height: 0, y: -8 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0, y: -8 }}
        transition={{ duration: 0.23, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-full overflow-hidden">
          <motion.div
            ref={featureCarouselTrackRef}
            className="flex max-w-full gap-3 px-4"
            style={{ x: featureCarouselX }}
            drag="x"
            dragConstraints={featureCarouselStep ? { left: -featureCarouselStep * featureCarouselCount, right: 0 } : undefined}
            dragMomentum={false}
            dragElastic={0.04}
            onDragStart={handleFeatureCarouselDragStart}
            onDragEnd={handleFeatureCarouselDragEnd}
          >
            {carouselCards.map((card, index) => {
              return (
                <article
                  key={`${card.title}-${index}`}
                  data-feature-card="true"
                  className={cn(
                    "relative h-[clamp(122px,16.5dvh,159px)] w-[86dvw] max-w-[calc(100dvw-2rem)] shrink-0 overflow-hidden rounded-[28px] border",
                    isDark
                      ? "border-white/[0.055] text-white/90"
                      : "border-transparent text-[var(--bm-text-primary)]",
                  )}
                >
                  <img
                    src={card.image}
                    alt=""
                    aria-hidden="true"
                    loading="eager"
                    draggable="false"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {isDark && (
                    <div
                      className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.34)_42%,rgba(0,0,0,0.08)_72%,rgba(0,0,0,0.02)_100%)]"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative z-10 flex h-full max-w-[58%] flex-col px-4 py-3">
                    <h3 className={cn("truncate text-base font-black tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{card.title}</h3>
                    <p className={cn("mt-1 line-clamp-2 text-[12px] font-semibold leading-4", isDark ? "text-white/78" : "text-[var(--bm-text-secondary)]")}>
                      {card.description}
                    </p>
                  </div>

                  <div className="absolute bottom-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={() => goTo(card.path)}
                      className={cn(
                        "bm-mobile-glass-control bm-mobile-glass-chip inline-flex h-8 min-h-8 w-fit min-w-0 items-center gap-1 px-3 text-[12px] font-black transition-all active:scale-95",
                        isDark
                          ? "text-white/90"
                          : "text-[var(--bm-text-primary)]",
                      )}
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

        <div className="mt-3 flex items-center justify-center" aria-label="Feature carousel pages">
          <div className="bm-mobile-glass-control bm-mobile-carousel-indicator" role="presentation">
            {mobileFeatureCards.map((card, index) => {
              const active = activeFeatureIndex === index;
              return (
                <motion.span
                  key={card.title}
                  className={cn("block rounded-full", isDark ? "bg-white" : "bg-black")}
                  animate={{
                    height: active ? 7 : 5,
                    width: active ? 7 : 5,
                    opacity: active ? 0.86 : 0.28,
                    scale: active ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        </div>
      </motion.section>
    );
  };

  const renderMobilePlusMenu = () => {
    const writingAttachmentActions = [
      { label: "Camera", icon: Camera, onClick: () => void openWritingAttachmentPicker("camera", cameraInputRef) },
      { label: "Photos", icon: Image, onClick: () => void openWritingAttachmentPicker("photos", imageInputRef) },
      { label: "Files", icon: FileText, onClick: () => void openWritingAttachmentPicker("files", fileInputRef) },
    ];
    const plusActions = chatSessionMode === "writing" ? writingAttachmentActions : [
      ...writingAttachmentActions,
      { label: "Write / Edit", icon: PenLine, onClick: openWriteEditCategories },
      { label: "Create Images", icon: Sparkles, onClick: enterImageMode },
      { label: "Search", icon: Search, onClick: enterSearchMode },
    ];

    return (
      <BlueMindOverlay
        open={attachmentSheetOpen}
        kind="sheet"
        className="z-[88] flex items-end justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+118px)]"
        backdropClassName="bg-black/38 backdrop-blur-[5px]"
        contentAs="section"
        contentClassName={cn(
                "relative z-10 w-full max-w-[356px] rounded-[32px] border p-4 backdrop-blur-[42px]",
                isDark
                  ? "border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.016),inset_1px_0_0_rgba(255,255,255,0.032),inset_-1px_0_0_rgba(255,255,255,0.026),0_24px_68px_rgba(0,0,0,0.34)]"
                  : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)]",
        )}
        contentStyle={isDark ? undefined : mobileGlassPanelStyle}
        onClose={closeAttachmentSheet}
        closeLabel="Dismiss action menu"
        contentProps={{ "data-testid": "mobile-plus-action-menu" }}
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
                      className={cn(
                        "flex h-[88px] min-w-0 flex-col items-center justify-center rounded-[24px] border px-2 text-center font-extrabold transition-colors",
                        isDark
                          ? "border-white/[0.05] bg-[rgba(255,255,255,0.032)] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] active:bg-[rgba(255,255,255,0.065)]"
                          : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)] active:bg-[var(--bm-active-bg)]",
                      )}
                      style={isDark ? undefined : mobileGlassControlStyle}
                    >
                      <ActionIcon className={cn("mb-2 h-7 w-7 stroke-[2.25]", isDark ? "text-white/78" : "text-[var(--bm-icon-primary)]")} />
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
      </BlueMindOverlay>
    );
  };

  return (
    <main
      className={`bm-mobile-chat-shell fixed inset-0 flex max-w-full flex-col overflow-hidden ${textColor}`}
      style={{
        backgroundColor: surfaceColor,
        minHeight: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onTouchStart={handlePageTouchStart}
      onTouchMove={handlePageTouchMove}
      onTouchEnd={handlePageTouchEnd}
      data-testid="mobile-chat-page"
    >
      <motion.div
        className="fixed inset-0 flex max-w-full flex-col overflow-hidden"
        style={nativeGlassSupported ? {
          x: chatSurfaceX,
          borderRadius: chatSurfaceRadius,
          boxShadow: isDark && menuOpen
            ? (isRtl ? "18px 0 48px rgba(0,0,0,0.72)" : "-18px 0 48px rgba(0,0,0,0.72)")
            : "none",
          backgroundColor: isDark && menuOpen ? "#050505" : surfaceColor,
          clipPath: isDark && menuOpen
            ? "inset(env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0 round 30px)"
            : "inset(0 round 0px)",
          WebkitClipPath: isDark && menuOpen
            ? "inset(env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0 round 30px)"
            : "inset(0 round 0px)",
          zIndex: isDark && menuOpen ? 82 : 72,
        } : { backgroundColor: surfaceColor }}
        data-testid="mobile-chat-surface"
      >
      <header className="bm-web-chat-header pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-40 flex h-16 items-center justify-between bg-transparent px-4 shadow-none backdrop-blur-0">
        <div className="flex w-12 items-center justify-start">
          <button
            ref={activeProjectId ? undefined : menuButtonRef}
            type="button"
            onClick={activeProjectId ? () => navigate(projectReturnPath) : openMenu}
            className={`pointer-events-auto ${mobileGlassControlClass}`}
            aria-label={activeProjectId ? `Back to ${activeProjectName}` : "Open menu"}
          >
            {activeProjectId ? <ArrowLeft /> : <Menu />}
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-3 flex items-center justify-center">
          <button
            ref={aiSelectorButtonRef}
            type="button"
            onClick={(chatSessionMode === "writing" || isWriteEditMode) ? openWritingTypeSelector : toggleResponseModeMenu}
            className={`pointer-events-auto ${mobileGlassSelectorClass}`}
            aria-label={(chatSessionMode === "writing" || isWriteEditMode) ? "Select writing type" : "Select AI mode"}
            aria-expanded={(chatSessionMode === "writing" || isWriteEditMode) ? undefined : responseModeMenuOpen}
          >
            {(chatSessionMode === "writing" || isWriteEditMode) ? (
              <>
                <PenLine className="h-[17px] w-[17px] stroke-[2.25]" />
                <span className="truncate">Writing · {selectedWritingCategory.label}</span>
              </>
            ) : (() => {
              const SelectedModeIcon = getAiMode(responseMode).icon;
              return <SelectedModeIcon className="h-[17px] w-[17px] stroke-[2.25]" />;
            })()}
            {!(chatSessionMode === "writing" || isWriteEditMode) && <span className="truncate">{getAiSpecializationLabel(responseMode)}</span>}
            <ChevronDown className={`h-4 w-4 transition-transform ${responseModeMenuOpen ? "rotate-180" : ""}`} />
          </button>

          <BlueMindOverlay
            open={responseModeMenuOpen && Boolean(responseModeMenuPosition)}
            kind="popupUp"
            className="pointer-events-auto z-[45]"
            backdropClassName="bm-mobile-ai-menu-backdrop cursor-default bg-transparent"
            contentClassName={cn(
                    "bm-mobile-ai-menu pointer-events-auto fixed z-50 overflow-hidden rounded-[28px] border",
                    isDark ? "text-white" : "text-[var(--bm-text-primary)]",
            )}
            contentStyle={responseModeMenuPosition ? {
              left: responseModeMenuPosition.left,
              top: responseModeMenuPosition.top,
              width: responseModeMenuPosition.width,
              maxHeight: responseModeMenuPosition.maxHeight,
              transformOrigin: "top center",
              ...mobileGlassPanelStyle,
            } : undefined}
            initial={{ opacity: 0, x: "-50%", y: -8, scale: 0.98 }}
            animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
            exit={{ opacity: 0, x: "-50%", y: -8, scale: 0.98 }}
            transition={overlayMotion.transition.popup}
            onClose={closeResponseModeMenu}
            onExitComplete={() => setResponseModeMenuPosition(null)}
            closeLabel="Dismiss AI mode menu"
            contentProps={{ role: "menu" }}
          >
                  <div className="max-h-[inherit] overflow-y-auto px-5 py-4">
                    <section>
                      <div className={cn("pb-2 text-[11px] font-black uppercase tracking-[0.16em]", isDark ? "text-[#D7D7D7]" : "text-[var(--bm-text-secondary)]")}>
                        BlueMind Models
                      </div>
                      <div className={cn("divide-y", isDark ? "divide-white/[0.075]" : "divide-[var(--bm-border)]")}>
                        {MOBILE_HEADER_MODELS.map((model) => {
                          const selected = headerModelId === model.id;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                setHeaderModelId(model.id);
                                closeResponseModeMenu();
                              }}
                              className={cn("bm-mobile-ai-menu-row flex min-h-[50px] w-full items-center justify-between gap-3 py-3 text-left text-[15px] font-extrabold", selected && "is-selected")}
                              role="menuitemradio"
                              aria-checked={selected}
                            >
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="truncate">{model.label}</span>
                                {model.badge && <span className={cn("shrink-0 text-[10px] font-black uppercase tracking-[0.14em]", isDark ? "text-white/58" : "text-[var(--bm-text-secondary)]")}>{model.badge}</span>}
                              </span>
                              {selected && <Check className="h-5 w-5 shrink-0 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="mt-4">
                      <div className={cn("pb-2 text-[11px] font-black uppercase tracking-[0.16em]", isDark ? "text-[#D7D7D7]" : "text-[var(--bm-text-secondary)]")}>
                        AI Modes
                      </div>
                      <div className={cn("divide-y", isDark ? "divide-white/[0.075]" : "divide-[var(--bm-border)]")}>
                        {AI_MODES.map((mode) => {
                          const ModeIcon = mode.icon;
                          const selected = responseMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => selectResponseMode(mode.id)}
                              className={cn("bm-mobile-ai-menu-row flex min-h-[50px] w-full items-center justify-between gap-3 py-3 text-left text-[15px] font-extrabold", selected && "is-selected")}
                              title={mode.description}
                              role="menuitemradio"
                              aria-checked={selected}
                            >
                              <ModeIcon className="h-[18px] w-[18px] shrink-0 stroke-[2.3]" />
                              <span className="min-w-0 flex-1 truncate">{getAiSpecializationLabel(mode)}</span>
                              {selected && <Check className="h-5 w-5 shrink-0 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="mt-4">
                      <div className={cn("pb-2 text-[11px] font-black uppercase tracking-[0.16em]", isDark ? "text-[#D7D7D7]" : "text-[var(--bm-text-secondary)]")}>
                        Thinking
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeaderThinkingEnabled((enabled) => !enabled)}
                        className={cn("bm-mobile-ai-menu-row flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-left text-[15px] font-extrabold", headerThinkingEnabled && "is-selected")}
                        role="menuitemcheckbox"
                        aria-checked={headerThinkingEnabled}
                      >
                        <span>Enable Thinking</span>
                        {headerThinkingEnabled && <Check className="h-5 w-5 shrink-0 stroke-[3]" />}
                      </button>
                    </section>
                  </div>
          </BlueMindOverlay>
        </div>

        <div className="flex w-12 items-center justify-end">
          <button
            type="button"
            onClick={(chatSessionMode === "writing" || isWriteEditMode) ? openWritingTools : startNewChat}
            className={`pointer-events-auto ${mobileGlassControlClass}`}
            aria-label={(chatSessionMode === "writing" || isWriteEditMode) ? "Writing tools" : "New chat"}
          >
            {(chatSessionMode === "writing" || isWriteEditMode) ? <Wand2 className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {shouldShowChatHome && renderFeatureCarousel()}
      </AnimatePresence>

      {!nativeGlassActive && (chatSessionMode === "private" || chatSessionMode === "hidden") && (
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
          style={{
            paddingTop: shouldShowChatHome
              ? undefined
              : `calc(env(safe-area-inset-top) + ${shouldShowWritingModeHome || isSmartFocusMode || shouldUseChatMessageSafeArea ? "5rem" : "1rem"})`,
          }}
          className={
            shouldShowWritingModeHome
              ? "min-h-0 flex-1 overflow-y-auto px-4 pb-[190px] pt-20"
              : isSmartFocusMode
              ? "min-h-0 flex-1 overflow-y-auto px-4 pb-[132px] pt-20"
              : shouldUseChatMessageSafeArea
                ? "min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+190px)] pt-20"
              : shouldShowChatHome
                ? "min-h-0 flex-1 overflow-y-auto px-4 pb-[132px] pt-5"
                : "min-h-0 flex-1 overflow-y-auto px-4 pb-[132px] pt-4"
          }
        >

          <AnimatePresence initial={false}>
            {shouldShowWritingModeHome && renderWritingModeHome()}
          </AnimatePresence>

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

          {isWriteEditMode && !shouldShowWritingModeHome && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={`text-lg font-bold tracking-tight ${textColor}`}>Writing Mode</h2>
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
                className={cn(
                  "fixed inset-x-4 z-40 mx-auto max-w-[398px] rounded-[28px] border p-4 backdrop-blur-[34px]",
                  isDark
                    ? "border-white/[0.06] bg-[rgba(28,28,28,0.72)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_54px_rgba(0,0,0,0.34)]"
                    : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)]",
                )}
                style={{
                  bottom: "calc(env(safe-area-inset-bottom) + 112px)",
                  ...(isDark ? {} : mobileGlassPanelStyle),
                }}
                role="dialog"
                aria-label="Use selected image style"
              >
                <p className="text-center text-[15px] font-extrabold">Use this image?</p>
                <p className={cn("mt-1 truncate text-center text-xs font-semibold", isDark ? "text-white/58" : "text-[var(--bm-text-secondary)]")}>
                  {imageTemplateConfirm.title}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={cancelImageTemplateUse}
                    className={cn(
                      "min-h-11 rounded-full border text-sm font-bold backdrop-blur-[24px] active:scale-[0.98]",
                      isDark
                        ? "border-white/[0.055] bg-white/[0.08] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]"
                        : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)]",
                    )}
                    style={isDark ? undefined : mobileGlassControlStyle}
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

          {isWriteEditCategoryBrowserOpen && (
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className={`text-lg font-bold tracking-tight ${textColor}`}>Write / Edit</h2>
                  <p className={`mt-1 max-w-[330px] text-xs font-semibold leading-5 ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>
                    Choose a writing tool, then BlueMind will open Writing Mode with the right template ready.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeWriteEditCategories}
                  className="bm-mobile-glass-control"
                  aria-label="Close write edit categories"
                >
                  <X className="h-5 w-5" />
                </button>
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
              <div className="mb-5 px-1">
                <p className={`text-sm font-bold ${textColor}`}>Can&apos;t find what you are looking for?</p>
                <button
                  type="button"
                  onClick={() => openSearchAskConfirm({
                    category: selectedSearchCategory,
                    intent: "item_not_found",
                  })}
                  className="mt-3 h-11 w-full rounded-2xl border border-[#7DB7FF]/[0.18] bg-[rgba(25,59,104,0.94)] text-sm font-extrabold !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.20),inset_0_-1px_0_rgba(0,0,0,0.08),0_10px_24px_rgba(15,23,42,0.10)] backdrop-blur-[24px] transition-transform duration-150 ease-out active:scale-[0.98]"
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
            <div
              className={cn(
                "space-y-4 pb-4",
                shouldUseChatMessageSafeArea && "flex min-h-[calc(100dvh-302px)] flex-col",
              )}
            >
              {messages.map((item, index) => {
                const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;
                const hasText = Boolean(String(item.content || "").trim());
                const isImageOnlyUser = item.role === "user" && hasAttachments && !hasText;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={item.role === "user" ? "flex justify-end" : "w-full"}
                  >
                    <div
                      dir="auto"
                      data-chat-selection-message-id={item.id}
                      data-chat-selection-role={item.role}
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
                      (chatSessionMode === "writing" || isWriteEditMode) && (
                        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Writing actions">
                          {[
                            ["clearer", "Improve"],
                            ["shorter", "Shorter"],
                            ["longer", "Longer"],
                            ["professional", "Professional"],
                            ["simpler", "Simpler"],
                            ["rewrite", "Rewrite"],
                            ["translate", "Translate"],
                          ].map(([option, label]) => (
                            <button key={option} type="button" className="bm-mobile-glass-control bm-mobile-glass-chip shrink-0 text-[12px] font-semibold" onClick={() => handleWritingResponseAction(item, option)}>
                              {label}
                            </button>
                          ))}
                        </div>
                      )
                    )}

                    {item.role !== "user" && !item.isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative mt-2 flex flex-wrap items-center gap-1 px-1 transition-opacity duration-200 ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}
                        data-testid={`message-actions-${item.id}`}
                      >
                        {[
                          { id: "copy", icon: messageFeedback[item.id]?.copied ? Check : Clipboard, label: t("copy"), onClick: () => handleCopyMessage(item) },
                          { id: "like", icon: ThumbsUp, label: t("like"), onClick: () => handleLikeMessage(item), active: messageFeedback[item.id]?.rating === "like" },
                          { id: "dislike", icon: ThumbsDown, label: t("dislike"), onClick: (event) => handleDislikeMessage(item, event), active: messageFeedback[item.id]?.rating === "dislike" },
                          { id: "edit", icon: PenLine, label: t("edit"), onClick: () => handleEditMessage(item) },
                          { id: "regenerate", icon: RotateCcw, label: t("regenerate"), onClick: () => handleRegenerateMessage(item) },
                          { id: "share", icon: Share2, label: t("share"), onClick: () => handleShareMessage(item) },
                          { id: "more", icon: MoreVertical, label: t("more"), onClick: () => handleMoreMessage(item) },
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
                        {messageMoreTarget === item.id && !improveTarget && !reportTarget && (
                            <>
                              <button
                                type="button"
                                className="fixed inset-0 z-[75]"
                                onClick={() => setMessageMoreTarget(null)}
                                aria-label="Close message actions"
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                className={cn(
                                  "bm-glass-panel absolute right-1 top-10 z-[80] w-56 overflow-hidden rounded-[24px] border p-1.5",
                                  isDark ? "text-white" : "text-[var(--bm-text-primary)]",
                                )}
                                role="menu"
                                data-testid={`message-more-menu-${item.id}`}
                              >
                                {[
                                  { id: "branch", icon: GitBranch, label: "Branch in new chat", onClick: () => handleBranchMessage(item) },
                                  { id: "retry", icon: RotateCcw, label: "Retry", onClick: () => handleRegenerateMessage(item) },
                                  { id: "improve", icon: Wand2, label: "Improve answer", onClick: () => handleOpenImproveMenu(item) },
                                  { id: "report", icon: Flag, label: "Report problem", onClick: () => handleOpenReportDialog(item), danger: true },
                                ].map((action) => (
                                  <button
                                    key={action.id}
                                    type="button"
                                    onClick={action.onClick}
                                    className={cn(
                                      "bm-glass-menu-item flex min-h-[44px] w-full items-center gap-3 rounded-[17px] px-3 py-2.5 text-left text-sm font-bold transition-transform active:scale-[0.98]",
                                      action.danger
                                        ? isDark ? "text-red-300 active:bg-red-950/30" : "text-red-500 active:bg-red-50"
                                        : isDark ? "text-white/88 active:bg-white/[0.08]" : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]",
                                    )}
                                    role="menuitem"
                                  >
                                    <action.icon className="h-4 w-4 shrink-0 stroke-[2.35]" />
                                    <span>{action.label}</span>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                        )}
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
              {renderComposerArea(false, shouldShowChatHome)}
            </div>
          </div>
        )}

        <AnimatePresence>
          {!menuSearchOpen && !chatEntrySheetOpen && showScrollToBottom && (
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

      <BlueMindOverlay
        open={Boolean(searchConfirm)}
        kind="modal"
        className="z-50 flex items-center justify-center px-5"
        backdropClassName="bg-black/40"
        contentClassName={`relative z-10 w-full max-w-[340px] rounded-[28px] border p-5 shadow-2xl ${isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-white bg-white text-[var(--bm-text-primary)]"}`}
        onClose={() => setSearchConfirm(null)}
        closeLabel="Dismiss Ask AI"
      >
        {searchConfirm && (
          <>
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
          </>
        )}
      </BlueMindOverlay>

      <BlueMindOverlay
        open={Boolean(improveTarget)}
        kind="modal"
        className="z-[92] flex items-center justify-center px-5"
        backdropClassName="bg-black/34 backdrop-blur-[8px]"
        contentClassName={cn(
                "w-full max-w-[340px] rounded-[30px] border p-4 shadow-2xl",
                isDark ? "border-white/[0.08] bg-[rgba(38,38,38,0.92)] text-white" : "border-black/[0.07] bg-white/[0.96] text-[var(--bm-text-primary)]",
        )}
        onClose={() => setImproveTarget(null)}
        closeLabel="Dismiss improve answer"
        contentProps={{
          onClick: (event) => event.stopPropagation(),
          "data-testid": improveTarget ? `improve-answer-dialog-${improveTarget.id}` : undefined,
        }}
      >
        {improveTarget && (
          <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[17px] font-black tracking-tight">Improve answer</p>
                  <p className={cn("mt-1 text-xs font-semibold", isDark ? "text-white/58" : "text-[var(--bm-text-secondary)]")}>
                    Choose how BlueMind should rewrite this response.
                  </p>
                </div>
                <button type="button" className="bm-mobile-glass-control" onClick={() => setImproveTarget(null)} aria-label="Close improve answer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {[
                  ["clearer", "Clearer"],
                  ["shorter", "Shorter"],
                  ["more_detailed", "More detailed"],
                  ["simpler", "Simpler"],
                ].map(([option, label]) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelectImproveOption(option)}
                    className={cn(
                      "flex min-h-[46px] w-full items-center justify-between rounded-[18px] border px-3.5 text-left text-sm font-extrabold transition-transform active:scale-[0.985]",
                      isDark ? "border-white/[0.07] bg-white/[0.055] text-white active:bg-white/[0.09]" : "border-black/[0.06] bg-white/85 text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]",
                    )}
                  >
                    <span>{label}</span>
                    <Wand2 className="h-4 w-4 stroke-[2.35]" />
                  </button>
                ))}
              </div>
          </>
        )}
      </BlueMindOverlay>

      <BlueMindOverlay
        open={Boolean(reportTarget)}
        kind="modal"
        className="z-[92] flex items-center justify-center px-5"
        backdropClassName="bg-black/34 backdrop-blur-[8px]"
        contentAs="form"
        contentClassName={cn(
                "w-full max-w-[354px] rounded-[30px] border p-4 shadow-2xl",
                isDark ? "border-white/[0.08] bg-[rgba(38,38,38,0.92)] text-white" : "border-black/[0.07] bg-white/[0.96] text-[var(--bm-text-primary)]",
        )}
        onClose={() => setReportTarget(null)}
        closeLabel="Dismiss report problem"
        contentProps={{
          onClick: (event) => event.stopPropagation(),
          onSubmit: handleSubmitMessageReport,
          "data-testid": reportTarget ? `report-problem-dialog-${reportTarget.id}` : undefined,
        }}
      >
        {reportTarget && (
          <>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[17px] font-black tracking-tight">Report problem</p>
                  <p className={cn("mt-1 text-xs font-semibold leading-5", isDark ? "text-white/58" : "text-[var(--bm-text-secondary)]")}>
                    Tell us what went wrong. The message will not be changed.
                  </p>
                </div>
                <button type="button" className="bm-mobile-glass-control" onClick={() => setReportTarget(null)} aria-label="Close report problem">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {[
                  ["incorrect", "Incorrect answer"],
                  ["not_helpful", "Not helpful"],
                  ["unsafe", "Unsafe / inappropriate"],
                  ["other", "Other"],
                ].map(([reason, label]) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReportReason(reason)}
                    className={cn(
                      "flex min-h-[42px] w-full items-center justify-between rounded-[17px] border px-3 text-left text-sm font-bold transition-transform active:scale-[0.985]",
                      reportReason === reason
                        ? "border-[#7DB7FF]/[0.24] bg-[var(--bm-primary)] text-white"
                        : isDark ? "border-white/[0.07] bg-white/[0.055] text-white/86" : "border-black/[0.06] bg-white/85 text-[var(--bm-text-primary)]",
                    )}
                    style={reportReason === reason ? { color: "#fff", WebkitTextFillColor: "#fff" } : undefined}
                  >
                    <span>{label}</span>
                    {reportReason === reason && <Check className="h-4 w-4 stroke-[3]" />}
                  </button>
                ))}
              </div>
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                placeholder="Optional details"
                rows={3}
                className={cn(
                  "mt-3 w-full resize-none rounded-[20px] border px-3.5 py-3 text-sm font-semibold outline-none transition-shadow focus:ring-2 focus:ring-[var(--bm-primary)]/25",
                  isDark ? "border-white/[0.08] bg-white/[0.055] text-white placeholder:text-white/38" : "border-black/[0.07] bg-white/88 text-[var(--bm-text-primary)] placeholder:text-[var(--bm-text-muted)]",
                )}
              />
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className={cn(
                    "min-h-11 rounded-full border text-sm font-bold transition-transform active:scale-[0.98]",
                    isDark ? "border-white/[0.07] bg-white/[0.055] text-white/84" : "border-black/[0.06] bg-white/86 text-[var(--bm-text-primary)]",
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="min-h-11 rounded-full border border-[#7DB7FF]/[0.22] bg-[var(--bm-primary)] text-sm font-black !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_12px_28px_rgba(0,0,0,0.14)] transition-transform active:scale-[0.98] disabled:opacity-70"
                  style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
                >
                  {isSubmittingReport ? "Submitting..." : "Submit"}
                </button>
              </div>
          </>
        )}
      </BlueMindOverlay>

      {renderMobilePlusMenu()}

      <BlueMindOverlay
        open={imageSourceSheetOpen}
        kind="sheet"
        className="z-50"
        backdropClassName="bg-black/35"
        contentAs="section"
        contentClassName={`absolute inset-x-0 bottom-0 rounded-t-[28px] border-t px-4 pb-5 pt-3 shadow-[0_-24px_70px_rgba(15,23,42,0.2)] ${borderColor}`}
        contentStyle={{
          backgroundColor: panelColor,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
        }}
        onClose={closeImageSourceSheet}
        closeLabel="Dismiss image source"
        contentProps={{
          onTouchStart: handleSheetTouchStart,
          onTouchEnd: handleSheetTouchEnd,
          "data-testid": "mobile-image-source-sheet",
        }}
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
      </BlueMindOverlay>

      <BlueMindOverlay
        open={Boolean(dislikeTarget)}
        kind={dislikeMenuPosition.placement === "above" ? "popup" : "popupUp"}
        className="z-[95]"
        backdropClassName="bg-transparent"
        contentClassName={`fixed w-[min(78vw,248px)] overflow-y-auto rounded-[24px] border p-2.5 backdrop-blur-[18px] ${
                isDark
                  ? "border-white/[0.09] bg-[rgba(38,38,38,0.74)] text-white shadow-[0_14px_34px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-black/[0.07] bg-white/[0.76] text-[var(--bm-text-primary)] shadow-[0_14px_34px_rgba(15,23,42,0.11),inset_0_1px_0_rgba(255,255,255,0.72)]"
        }`}
        contentStyle={{
          left: dislikeMenuPosition.left,
          top: dislikeMenuPosition.y,
          maxHeight: dislikeMenuPosition.maxHeight,
          translate: dislikeMenuPosition.placement === "above" ? "0 -100%" : "0 0",
          transformOrigin: dislikeMenuPosition.placement === "above" ? "bottom center" : "top center",
        }}
        onClose={() => setDislikeTarget(null)}
        closeLabel="Dismiss feedback"
        contentProps={{
          onPointerDown: (event) => event.stopPropagation(),
          onClick: (event) => event.stopPropagation(),
          "data-testid": dislikeTarget ? `dislike-feedback-${dislikeTarget.id}` : undefined,
        }}
      >
        {dislikeTarget && (
          <>
              <div className="px-2 pb-1.5 pt-1">
                <p className="text-sm font-semibold">{t("tellUsMore")}</p>
                <p className={`mt-1 text-xs ${isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]"}`}>{t("feedbackHelps")}</p>
              </div>
              <div className="space-y-1">
                {DISLIKE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleDislikeReason(reason)}
                    className={`flex w-full items-center justify-between rounded-[17px] px-3 py-2.5 text-left text-sm font-semibold transition-all duration-150 active:scale-[0.985] ${
                      isDark ? "active:bg-white/10" : "active:bg-white/60"
                    }`}
                  >
                    {t(reason)}
                    <span className={`h-1.5 w-1.5 rounded-full ${isDark ? "bg-white/30" : "bg-[var(--bm-border-strong)]"}`} />
                  </button>
                ))}
              </div>
          </>
        )}
      </BlueMindOverlay>

      <BlueMindOverlay
        open={privateSpaceModalOpen && !(nativeGlassSupported && nativeGlassBridgeReady)}
        kind="sheet"
        className="z-[90] flex items-end"
        backdropClassName="bg-black/40 backdrop-blur-[6px]"
        contentClassName={privateSheetClass}
        onClose={() => setPrivateSpaceModalOpen(false)}
        closeLabel="Dismiss private chat"
        contentProps={{ onClick: (event) => event.stopPropagation() }}
      >
        {privateSpaceModalOpen && (
          <>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-black leading-tight tracking-tight">Private Chat</h2>
                  <p className={`mt-1 text-sm font-semibold leading-5 ${mutedText}`}>Open or create a protected private chat inside your account.</p>
                </div>
                <button type="button" className="bm-mobile-glass-control" onClick={() => setPrivateSpaceModalOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {privateSpaceError && <div className="mb-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500">{privateSpaceError}</div>}
              {privateSpaceStep === "list" && (
                <div className="space-y-3.5">
                  {isLoadingPrivateSpaces && <p className={`rounded-[20px] border px-4 py-4 text-sm font-semibold ${borderColor} ${mutedText}`}>Loading private chats...</p>}
                  {!isLoadingPrivateSpaces && privateSpaces.length === 0 && <p className={`rounded-[22px] border px-4 py-5 text-sm font-semibold leading-6 ${borderColor} ${mutedText}`}>No private chats yet.</p>}
                  {privateSpaces.map((space) => (
                    <div key={space.privateSpaceId} className="relative">
                      <button key={space.privateSpaceId} type="button" className={privateListCardClass} onClick={() => {
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
                        <div className={`absolute right-2 top-12 z-10 w-40 overflow-hidden rounded-[22px] border p-1.5 shadow-xl backdrop-blur-[28px] ${isDark ? "border-white/[0.08] bg-[rgba(38,38,38,0.92)]" : "border-black/[0.07] bg-white/[0.96]"}`}>
                          {[
                            ["Rename", () => { setSelectedPrivateSpace(space); setPrivateSpaceRenameName(space.name); setPrivateSpaceStep("rename"); }],
                            ["Change PIN", () => { setSelectedPrivateSpace(space); setPrivateSpacePinForm({ currentPin: "", newPin: "", confirmNewPin: "" }); setPrivateSpaceStep("changePin"); }],
                            ["Delete", () => { setPrivateSpaceDeleteTarget(space); setPrivateSpaceStep("delete"); }],
                          ].map(([label, action]) => (
                            <button key={label} type="button" className={`w-full rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${label === "Delete" ? "text-red-500" : isDark ? "text-white/88 active:bg-white/[0.07]" : "text-[var(--bm-text-primary)] active:bg-black/[0.035]"}`} onClick={() => { setPrivateSpaceActionMenuId(null); action(); }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" className={cn("min-h-[48px] rounded-[22px] border px-4 text-sm font-black", isDark ? "border-white/[0.08] bg-white/[0.055] text-white/86" : "border-black/[0.07] bg-black/[0.035] text-[var(--bm-text-primary)]")} onClick={() => setPrivateSpaceModalOpen(false)}>Cancel</button>
                    <button type="button" className={privatePrimaryButtonClass} style={privatePrimaryButtonStyle} onClick={startCreatePrivateSpace}>Create Private Chat</button>
                  </div>
                </div>
              )}
              {privateSpaceStep === "create" && (
                <form className="space-y-3.5" onSubmit={handleCreatePrivateSpace}>
                  <button type="button" className={privateBackButtonClass} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <input className={privateInputClass} placeholder="Chat Name" value={privateSpaceForm.name} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, name: event.target.value }))} />
                  <input className={privateInputClass} placeholder="PIN" inputMode="numeric" type="password" value={privateSpaceForm.pin} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, pin: event.target.value.replace(/\D/g, "") }))} />
                  <input className={privateInputClass} placeholder="Confirm PIN" inputMode="numeric" type="password" value={privateSpaceForm.confirmPin} onChange={(event) => setPrivateSpaceForm((prev) => ({ ...prev, confirmPin: event.target.value.replace(/\D/g, "") }))} />
                  <button type="submit" disabled={isCreatingPrivateSpace} className={privatePrimaryButtonClass} style={privatePrimaryButtonStyle}>{isCreatingPrivateSpace ? "Creating..." : "Create"}</button>
                </form>
              )}
              {privateSpaceStep === "rename" && selectedPrivateSpace && (
                <form className="space-y-3.5" onSubmit={handleRenamePrivateSpace}>
                  <button type="button" className={privateBackButtonClass} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <input className={privateInputClass} placeholder="Chat Name" value={privateSpaceRenameName} onChange={(event) => setPrivateSpaceRenameName(event.target.value)} />
                  <button type="submit" className={privatePrimaryButtonClass} style={privatePrimaryButtonStyle}>Save</button>
                </form>
              )}
              {privateSpaceStep === "changePin" && selectedPrivateSpace && (
                <form className="space-y-3.5" onSubmit={handleChangePrivateSpacePin}>
                  <button type="button" className={privateBackButtonClass} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <input className={privateInputClass} placeholder="Current PIN" inputMode="numeric" type="password" value={privateSpacePinForm.currentPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, currentPin: event.target.value.replace(/\D/g, "") }))} />
                  <input className={privateInputClass} placeholder="New PIN" inputMode="numeric" type="password" value={privateSpacePinForm.newPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, newPin: event.target.value.replace(/\D/g, "") }))} />
                  <input className={privateInputClass} placeholder="Confirm New PIN" inputMode="numeric" type="password" value={privateSpacePinForm.confirmNewPin} onChange={(event) => setPrivateSpacePinForm((prev) => ({ ...prev, confirmNewPin: event.target.value.replace(/\D/g, "") }))} />
                  <button type="submit" className={privatePrimaryButtonClass} style={privatePrimaryButtonStyle}>Change PIN</button>
                </form>
              )}
              {privateSpaceStep === "delete" && privateSpaceDeleteTarget && (
                <div className="space-y-4">
                  <button type="button" className={privateBackButtonClass} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <p className="text-[17px] font-black tracking-tight">Delete this private chat?</p>
                  <p className={`text-sm font-semibold leading-6 ${mutedText}`}>All conversations inside it will be permanently deleted.</p>
                  <button type="button" className="w-full rounded-[22px] border border-red-500/20 bg-red-600 px-4 py-3.5 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_rgba(0,0,0,0.14)] transition-transform active:scale-[0.985]" onClick={handleDeletePrivateSpace}>Delete</button>
                </div>
              )}
              {privateSpaceStep === "pin" && selectedPrivateSpace && (
                <form className="space-y-3.5" onSubmit={handleUnlockPrivateSpace}>
                  <button type="button" className={privateBackButtonClass} onClick={() => setPrivateSpaceStep("list")}>Back</button>
                  <h3 className="text-[17px] font-black tracking-tight">Enter PIN for {selectedPrivateSpace.name}</h3>
                  <input className={privateInputClass} placeholder="PIN" inputMode="numeric" type="password" value={privatePinInput} onChange={(event) => setPrivatePinInput(event.target.value.replace(/\D/g, ""))} />
                  <button type="submit" className={privatePrimaryButtonClass} style={privatePrimaryButtonStyle}>Unlock</button>
                </form>
              )}
          </>
        )}
      </BlueMindOverlay>

      <BlueMindOverlay
        open={hiddenChatModalOpen && !(nativeGlassSupported && nativeGlassBridgeReady)}
        kind="sheet"
        className="z-[90] flex items-end"
        backdropClassName="bg-black/42 backdrop-blur-[10px]"
        contentClassName={privateSheetClass}
        onClose={() => setHiddenChatModalOpen(false)}
        closeLabel="Dismiss hidden chat"
        contentProps={{ onClick: (event) => event.stopPropagation() }}
      >
        {hiddenChatModalOpen && (
          <>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--bm-primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <Glasses className="h-5 w-5 stroke-[2.35]" />
                  </span>
                  <h2 className="text-[20px] font-black leading-tight tracking-tight">Hidden Chat</h2>
                </div>
                <button type="button" className="bm-mobile-glass-control" onClick={() => setHiddenChatModalOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className={`mb-5 text-sm font-semibold leading-6 ${mutedText}`}>This chat is temporary. Messages are not saved, do not appear in History or Search, and are deleted when you leave.</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className={cn("min-h-[48px] rounded-[22px] border px-4 text-sm font-black", isDark ? "border-white/[0.08] bg-white/[0.055] text-white/86" : "border-black/[0.07] bg-black/[0.035] text-[var(--bm-text-primary)]")} onClick={() => setHiddenChatModalOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className={privatePrimaryButtonClass}
                  style={privatePrimaryButtonStyle}
                  onClick={startHiddenChat}
                >
                  Start Hidden Chat
                </button>
              </div>
          </>
        )}
      </BlueMindOverlay>

        {nativeGlassSupported && menuOpen && (
          <button
            type="button"
            className="absolute inset-0 z-[120] cursor-default bg-transparent"
            onClick={closeMenu}
            aria-label="Close menu"
          />
        )}
      </motion.div>

      <AnimatePresence>
        {menuOpen && (
          <div className={cn("fixed inset-0 overflow-hidden", nativeGlassSupported && isDark ? "z-[80]" : "z-[70]")}>
            {!nativeGlassSupported && (
              <motion.button
                type="button"
                className={cn("absolute inset-y-0 z-0 bg-black/14 backdrop-blur-[3px]", isRtl ? "left-0" : "right-0")}
                style={{
                  width: `calc(100vw - ${drawerWidth}px)`,
                  opacity: drawerScrimOpacity,
                }}
                onClick={closeMenu}
                aria-label="Close menu"
              />
            )}
            <motion.section
              ref={menuDrawerRef}
              className={cn(
                "absolute inset-y-0 z-10 flex flex-col overflow-hidden outline-none",
                isRtl ? "right-0" : "left-0",
                nativeGlassSupported && isDark ? "bg-black text-white" : nativeGlassSupported ? "bg-black text-white" : isDark ? "bg-black text-white" : "bg-[#FFFFFF] text-[var(--bm-text-primary)]",
              )}
              style={{
                x: drawerX,
                opacity: 1,
                width: drawerWidth,
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                touchAction: "pan-y",
                boxShadow: nativeGlassSupported && isDark
                  ? "none"
                  : nativeGlassSupported ? "none" : (isRtl ? "-10px 0 26px rgba(0,0,0,0.14)" : "10px 0 26px rgba(0,0,0,0.14)"),
              }}
              tabIndex={-1}
              drag={nativeGlassSupported ? false : "x"}
              dragConstraints={isRtl ? { left: 0, right: drawerWidth } : { left: -drawerWidth, right: 0 }}
              dragElastic={nativeGlassSupported && isDark ? 0 : 0.02}
              dragMomentum={!(nativeGlassSupported && isDark)}
              onDragStart={() => {
                drawerAnimationRef.current?.stop?.();
                drawerGestureActiveRef.current = true;
              }}
              onDragEnd={(_, info) => {
                drawerGestureActiveRef.current = false;
                const progress = isRtl ? (drawerWidth - drawerX.get()) / drawerWidth : (drawerX.get() + drawerWidth) / drawerWidth;
                const closingFast = isRtl ? info.velocity.x > 520 : info.velocity.x < -520;
                if (progress < 0.56 || closingFast) {
                  closeMenu();
                } else {
                  animateDrawerTo(0);
                }
              }}
              data-testid="mobile-side-menu"
              role="navigation"
              aria-label="BlueMind menu"
              dir={isRtl ? "rtl" : "ltr"}
            >
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0",
                nativeGlassSupported
                  ? "top-0 z-30 h-[calc(env(safe-area-inset-top)+108px)] backdrop-blur-[22px]"
                  : "top-0 z-10 h-[calc(env(safe-area-inset-top)+74px)] backdrop-blur-[6px]",
              )}
              style={nativeGlassSupported ? {
                background: isDark
                  ? "linear-gradient(to bottom, rgba(8,8,8,0.62) 0%, rgba(8,8,8,0.48) 56%, rgba(8,8,8,0.18) 78%, rgba(8,8,8,0) 100%)"
                  : "linear-gradient(to bottom, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.52) 56%, rgba(255,255,255,0.18) 78%, rgba(255,255,255,0) 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.72) 76%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.72) 76%, transparent 100%)",
              } : {
                background: isDark
                  ? "linear-gradient(to bottom, rgba(0,0,0,0.96), rgba(0,0,0,0.76), rgba(0,0,0,0))"
                  : "linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(255,255,255,0.76), rgba(255,255,255,0))",
              }}
              aria-hidden="true"
            />

            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 z-40 pt-[calc(env(safe-area-inset-top)+22px)]",
                isRtl ? "pl-[88px] pr-5 text-right" : "pl-5 pr-[88px] text-left",
              )}
            >
              <h2 className={cn("truncate text-[20px] font-semibold leading-none tracking-tight", isDark || nativeGlassSupported ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind AI</h2>
            </div>

            {nativeGlassSupported ? (
              <IOSNativeGlassButton
                id="chat-menu-search"
                symbol="magnifyingglass"
                label="Search"
                onClick={openMenuSearch}
                className={cn("bm-mobile-glass-control absolute top-[calc(env(safe-area-inset-top)+14px)] z-50", isRtl ? "left-5" : "right-5")}
                isDark={isDark}
              >
                <Search className="h-5 w-5 stroke-[2.35]" />
              </IOSNativeGlassButton>
            ) : (
              <button
                type="button"
                onClick={openMenuSearch}
                className={cn("bm-mobile-glass-control absolute top-[calc(env(safe-area-inset-top)+14px)] z-50", isRtl ? "left-5" : "right-5")}
                aria-label="Search"
              >
                <Search className="h-5 w-5 stroke-[2.35]" />
              </button>
            )}

            <nav className="relative z-20 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+76px)]">
              <section className="space-y-1">
                <p className={`pb-2 font-bold uppercase tracking-wide ${typeClasses.small} ${mobileSectionTitleClass}`}>CHAT MODES</p>
                <button
                  type="button"
                  onClick={selectNormalChat}
                  className={mobileMenuItemClass(chatSessionMode === "normal")}
                >
                  <MessageSquare className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Normal Chat</span>
                </button>
                <button
                  type="button"
                  onClick={openPrivateChatModal}
                  className={mobileMenuItemClass(chatSessionMode === "private")}
                >
                  <Lock className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Private Chat</span>
                </button>
                <button
                  type="button"
                  onClick={selectWritingMode}
                  className={mobileMenuItemClass(chatSessionMode === "writing")}
                >
                  <PenLine className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Writing Mode</span>
                </button>
                <button
                  type="button"
                  onClick={openHiddenChatModal}
                  className={mobileMenuItemClass(chatSessionMode === "hidden")}
                >
                  <Glasses className={`shrink-0 ${iconClasses.sidebar}`} />
                  <span>Hidden Chat</span>
                </button>
              </section>

              <section className="mt-4 space-y-1">
                <p className={`pb-2 font-bold uppercase tracking-wide ${typeClasses.small} ${mobileSectionTitleClass}`}>BLUEMIND</p>
                {bluemindMenuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => runMenuAction(item)}
                    className={mobileMenuItemClass(false)}
                  >
                    <item.icon className={`shrink-0 ${iconClasses.sidebar}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
                {nativeGlassSupported && isDark && (
                  <button type="button" onClick={() => goTo("/mobile/projects")} className={mobileMenuItemClass(false)}>
                    <FolderKanban className={`shrink-0 ${iconClasses.sidebar}`} />
                    <span>Projects</span>
                  </button>
                )}
              </section>

              <section id="mobile-history-chats" className="mt-5">
                {nativeGlassSupported && isDark && (
                  <div className="mb-5">
                    <p className={`pb-2 font-bold tracking-wide ${typeClasses.small} ${mobileSectionTitleClass}`}>Pinned</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleChatHistory}
                  className="flex min-h-9 w-full items-center justify-between pb-2 text-left"
                  aria-expanded={chatHistoryExpanded}
                  aria-controls="mobile-history-chat-list"
                >
                  <span className={`font-bold tracking-wide ${typeClasses.small} ${mobileSectionTitleClass}`}>Recent Chats</span>
                  <motion.span
                    animate={{ rotate: chatHistoryExpanded ? 0 : -90 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("flex h-7 w-7 items-center justify-center", isDark ? "text-white/68" : "text-[var(--bm-text-muted)]")}
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
                        <div className={`py-3 font-medium ${typeClasses.small} ${mobileSubtleTextClass}`}>{t("loadingConversation")}</div>
                      )}

                      {!isLoadingConversations && historyError && (
                        <div className={`py-3 font-medium text-red-500 ${typeClasses.small}`}>{historyError}</div>
                      )}

                      {!isLoadingConversations && !historyError && conversations.length === 0 && (
                        <div className={`py-3 font-medium ${typeClasses.small} ${mobileSubtleTextClass}`}>{t("noChatsFound")}</div>
                      )}

                      {conversations.slice(0, 18).map((item) => renderMobileConversationRow(item, "menu"))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </nav>

            <div className={cn("absolute inset-x-0 bottom-0 z-20 flex items-center justify-start px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4", nativeGlassSupported && isDark ? "gap-5" : "gap-3")}>
              <button
                type="button"
                onClick={startNewChat}
                className={cn("flex items-center justify-center gap-2.5 rounded-full border border-white/[0.20] bg-[var(--bm-primary)] px-4 text-[14px] font-extrabold !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.025),0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-[24px] transition-transform active:scale-[0.98]", nativeGlassSupported && isDark ? "h-[46px] w-[54%]" : "h-[50px] w-[58%]")}
                aria-label={t("newChat")}
              >
                <PenLine className="h-5 w-5 stroke-[2.35] text-white" />
                <span className="text-white" style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>{t("newChat")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsSheetOpen(true);
                }}
                className={nativeGlassSupported ? "bm-mobile-glass-control p-[4px]" : cn(
                  "flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full border p-[5px] backdrop-blur-[42px] transition-transform active:scale-95",
                  isDark
                    ? "border-white/[0.055] bg-[rgba(78,78,78,0.18)] text-white/88"
                    : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] text-[var(--bm-text-primary)]",
                )}
                aria-label={menuUserName}
                style={nativeGlassSupported ? undefined : mobileGlassControlStyle}
              >
                <span className={cn("flex h-full w-full items-center justify-center overflow-hidden rounded-full text-base font-black", isDark ? "bg-[rgba(255,255,255,0.08)] text-white/88" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>
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
              <label className={cn(
                "bm-search-shell flex h-14 items-center rounded-[24px] border px-4 backdrop-blur-[24px]",
                iconClasses.iconText,
                isDark ? "border-white/[0.08] bg-white/[0.07]" : "border-[var(--bm-border)] bg-[var(--bm-bg-input)]",
              )}>
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

      <BlueMindOverlay
        open={Boolean(renameTarget)}
        kind="modal"
        className="z-[110] flex items-center justify-center px-5"
        backdropClassName="bg-black/40"
        contentAs="form"
        contentClassName={`relative z-10 w-full max-w-[340px] rounded-[26px] border p-5 shadow-2xl ${isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]"}`}
        onClose={() => setRenameTarget(null)}
        closeLabel="Dismiss rename"
        contentProps={{ onSubmit: handleRenameSubmit }}
      >
        {renameTarget && (
          <>
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
          </>
        )}
      </BlueMindOverlay>

      <BlueMindOverlay
        open={Boolean(deleteTarget)}
        kind="modal"
        className="z-[110] flex items-center justify-center px-5"
        backdropClassName="bg-black/40"
        contentClassName={`relative z-10 w-full max-w-[340px] rounded-[26px] border p-5 shadow-2xl ${isDark ? "border-white/[0.1] bg-[var(--bm-bg-card)] text-white" : "border-[var(--bm-border)] bg-white text-[var(--bm-text-primary)]"}`}
        onClose={() => setDeleteTarget(null)}
        closeLabel="Dismiss delete"
      >
        {deleteTarget && (
          <>
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
          </>
        )}
      </BlueMindOverlay>

      <SettingsSheet
        open={settingsSheetOpen}
        mobile
        layeredOverMenu={menuOpen}
        onClose={() => setSettingsSheetOpen(false)}
      />
    </main>
  );
}
