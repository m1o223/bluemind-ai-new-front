import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Brain,
  Camera,
  Clock3,
  FileText,
  Image,
  Menu,
  MessageSquare,
  Mic,
  PenLine,
  Pencil,
  Plus,
  Search,
  Send,
  UserCircle,
  X,
} from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { useApp } from "@/context/AppContext";
import { getApiErrorMessage } from "@/services/api";
import { listConversations, searchConversations } from "@/services/chatService";
import { analyzeImage, generateImage, getImageUrl, uploadChatImage } from "@/services/imageService";

const QUICK_ACTIONS = [
  { label: "Create Image", path: "/mobile/create-image", icon: Image },
  { label: "Write/Edit", path: "/mobile/write-edit", icon: PenLine },
  { label: "Search", path: "/mobile/search", icon: Search },
];

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
    if (!hasComposerContent || isGeneratingImage) return;

    if (!isImageMode) {
      setMessage("");
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
          onClick={() => navigate("/mobile/search")}
          className={isDark ? "flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4">
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
                {IMAGE_TEMPLATES.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => selectImageTemplate(item)}
                    className={`relative h-32 overflow-hidden rounded-[24px] bg-gradient-to-br ${item.gradient} p-4 text-left shadow-sm active:scale-[0.99]`}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/20 blur-xl" />
                    <div className="absolute -bottom-8 left-4 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
                    <span className="relative z-10 block max-w-[8rem] text-sm font-bold leading-5 text-white drop-shadow">
                      {item.title}
                    </span>
                    <span className="absolute bottom-3 left-4 z-10 rounded-full bg-black/25 px-2 py-1 text-[10px] font-bold text-white/90 backdrop-blur">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
          {!isImageMode && (
            <div className="mb-3 flex flex-col items-start gap-2">
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

          <form
            className={`flex min-h-[58px] flex-col gap-2 rounded-[28px] border p-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ${borderColor}`}
            style={{
              backgroundColor: isDark ? "rgba(32,32,32,0.9)" : "rgba(255,255,255,0.88)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
            onSubmit={handleComposerSubmit}
          >
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
                className={isDark ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white active:bg-white/[0.12]" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[#193B68] active:bg-[#E1E7F0]"}
                aria-label="Attach"
              >
                <Plus className="h-5 w-5" />
              </button>

              <textarea
                ref={composerInputRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={1}
                placeholder={isImageMode ? "Describe an image..." : "Ask anything..."}
                className={`max-h-[132px] min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-[16px] leading-5 outline-none placeholder:text-[#9CA3AF] ${textColor}`}
              />

              <button
                type="button"
                className={isDark ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#D7D7D7] active:bg-white/[0.08]" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#64748B] active:bg-[#EEF2F7]"}
                aria-label="Voice"
              >
                <Mic className="h-5 w-5" />
              </button>

              <button
                type="submit"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-45"
                style={{ backgroundColor: "var(--bluemind-app-color, #193B68)" }}
                disabled={!hasComposerContent || isGeneratingImage}
                aria-label="Send"
              >
                {isGeneratingImage ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
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
        </div>
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

