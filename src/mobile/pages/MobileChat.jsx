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
import { listConversations, searchConversations } from "@/services/chatService";

const QUICK_ACTIONS = [
  { label: "Create Image", path: "/mobile/create-image", icon: Image },
  { label: "Write/Edit", path: "/mobile/write-edit", icon: PenLine },
  { label: "Search", path: "/mobile/search", icon: Search },
];

const MAX_IMAGE_ATTACHMENTS = 6;

const IMAGE_INSPIRATIONS = [
  {
    title: "Improve Your Desk Setup",
    gradient: "from-[#193B68] via-[#315F9C] to-[#8FB7FF]",
  },
  {
    title: "Logo Design",
    gradient: "from-[#102A43] via-[#1D4E89] to-[#7AB8FF]",
  },
  {
    title: "App UI",
    gradient: "from-[#243B53] via-[#3B6EA8] to-[#C7D9FF]",
  },
  {
    title: "Product Mockup",
    gradient: "from-[#16324F] via-[#496C95] to-[#DCE9FF]",
  },
  {
    title: "Infographic",
    gradient: "from-[#1F3A5F] via-[#5077AA] to-[#A9C7EF]",
  },
  {
    title: "Fantasy Art",
    gradient: "from-[#182B49] via-[#345C8E] to-[#9EBCE3]",
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
  const [attachedImages, setAttachedImages] = useState([]);
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
    setAttachmentSheetOpen(false);
  };

  const exitImageMode = () => {
    setIsImageMode(false);
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

  const handleComposerSubmit = (event) => {
    event.preventDefault();
    if (!hasComposerContent) return;

    setMessage("");
    setAttachedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setIsImageMode(false);
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
          {isImageMode && !message.trim() && (
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
                {IMAGE_INSPIRATIONS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setMessage(item.title)}
                    className={`relative h-32 overflow-hidden rounded-[24px] bg-gradient-to-br ${item.gradient} p-4 text-left shadow-sm active:scale-[0.99]`}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/20 blur-xl" />
                    <div className="absolute -bottom-8 left-4 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
                    <span className="relative z-10 block max-w-[8rem] text-sm font-bold leading-5 text-white drop-shadow">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
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
                  label === "Create Image" && isImageMode
                    ? "text-[var(--bluemind-app-color,#193B68)]"
                    : isDark ? "text-[#D7D7D7]" : "text-[#193B68]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <form
            className={`flex min-h-[58px] flex-col gap-2 rounded-[28px] border p-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ${borderColor}`}
            style={{
              backgroundColor: isDark ? "rgba(32,32,32,0.9)" : "rgba(255,255,255,0.88)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
            onSubmit={handleComposerSubmit}
          >
            {isImageMode && (
              <div className="flex items-center justify-between px-1 pt-1">
                <span
                  className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold text-white"
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

            {attachedImages.length > 0 && (
              <div
                className="flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1"
                data-testid="mobile-image-preview-strip"
              >
                {attachedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={
                      attachedImages.length === 1
                        ? "relative h-36 min-w-full overflow-hidden rounded-[22px]"
                        : "relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px]"
                    }
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
                disabled={!hasComposerContent}
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
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
                  onClick={() => openFileInput(cameraInputRef)}
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
                  onClick={() => openFileInput(cameraInputRef)}
                  className={isDark ? "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Camera className="h-5 w-5" />
                  </span>
                  <span>Take a photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => openFileInput(imageInputRef)}
                  className={isDark ? "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white active:bg-white/[0.08]" : "flex h-[56px] items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <span className={isDark ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-white" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#193B68]"}>
                    <Image className="h-5 w-5" />
                  </span>
                  <span>Choose a photo</span>
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

