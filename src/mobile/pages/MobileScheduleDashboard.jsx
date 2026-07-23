import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Clock3,
  Dumbbell,
  Edit3,
  GraduationCap,
  MoreVertical,
  Moon,
  Plus,
  Repeat,
  Sparkles,
  StickyNote,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useApp } from "@/context/AppContext";
import ChatImageAttachments from "@/components/ChatImageAttachments";
import MessageResponse from "@/components/MessageResponse";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import UnifiedComposer from "@/components/UnifiedComposer";
import { cn } from "@/lib/utils";
import { iconClasses, typeClasses } from "@/lib/interactions";
import { getApiErrorMessage } from "@/services/api";
import { streamChatMessage } from "@/services/chatService";
import { uploadChatImage } from "@/services/imageService";

const STORAGE_KEY = "bluemind-mobile-schedule-dashboard-v1";

const mobileBlueGlassControlClass = "border-[#2F7DF6]/[0.24] bg-[rgba(15,62,140,0.42)] text-white shadow-[inset_0_1px_0_rgba(125,182,255,0.18),0_12px_28px_rgba(5,18,45,0.24)] backdrop-blur-[26px] active:bg-[rgba(24,82,175,0.46)]";
const mobileBlueGlassSurfaceClass = "border-[#2F7DF6]/[0.20] bg-[rgba(12,45,102,0.42)] text-white shadow-[inset_0_1px_0_rgba(115,170,255,0.16),0_18px_42px_rgba(5,18,45,0.28)] backdrop-blur-[28px]";
const mobileBlueGlassMenuClass = "border-[#2F7DF6]/[0.22] bg-[rgba(10,42,96,0.72)] text-white shadow-[inset_0_1px_0_rgba(125,182,255,0.16),0_18px_42px_rgba(5,18,45,0.28)] backdrop-blur-[28px]";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const COLOR_OPTIONS = [
  { id: "blue", label: "Sky Blue", value: "#2F7DF6" },
  { id: "emerald", label: "Emerald", value: "#16A876" },
  { id: "lavender", label: "Lavender", value: "#8A6FF7" },
  { id: "coral", label: "Coral", value: "#F97373" },
  { id: "orange", label: "Soft Orange", value: "#F59E42" },
  { id: "rose", label: "Rose", value: "#E85D8A" },
  { id: "teal", label: "Teal", value: "#14A3A3" },
  { id: "indigo", label: "Indigo", value: "#4F65D9" },
];

const ICON_OPTIONS = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "study", label: "Study", Icon: GraduationCap },
  { id: "book", label: "Book", Icon: BookOpen },
  { id: "gym", label: "Gym", Icon: Dumbbell },
  { id: "meal", label: "Meal", Icon: Utensils },
  { id: "work", label: "Work", Icon: Briefcase },
  { id: "sleep", label: "Sleep", Icon: Moon },
  { id: "note", label: "Note", Icon: StickyNote },
];

function readEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function sameDate(a, b) {
  return toDateKey(a) === toDateKey(b);
}

function startOfWeek(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), diff);
}

function getWeekDays(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatDateLabel(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
}

function getIcon(iconId) {
  return ICON_OPTIONS.find((item) => item.id === iconId)?.Icon || CalendarDays;
}

function getColor(colorId) {
  return COLOR_OPTIONS.find((item) => item.id === colorId)?.value || COLOR_OPTIONS[0].value;
}

function createInitialManualEvent(date) {
  return {
    title: "",
    date: toDateKey(date),
    startTime: "08:00",
    endTime: "09:00",
    duration: "",
    color: "blue",
    icon: "calendar",
    reminder: "None",
    repeat: "Never",
    notes: "",
  };
}

function ScheduleActionSheet({ open, isDark, onClose, onManual, onAi }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.button
            type="button"
            aria-label="Close create options"
            className="absolute inset-0 bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute bottom-0 left-0 right-0 rounded-t-[32px] border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl",
              isDark ? "border-white/10 bg-[#202020] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]",
            )}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--bm-text-muted)]/35" />
            <div className="space-y-2">
              <button type="button" onClick={onManual} className={cn("flex min-h-[58px] w-full items-center gap-3 rounded-3xl px-4 text-left font-bold", isDark ? "bg-white/[0.07] active:bg-white/[0.12]" : "bg-[var(--bm-hover-bg)] active:bg-[var(--bm-active-bg)]")}>
                <Edit3 className={iconClasses.card} />
                <span>Create manually</span>
              </button>
              <button type="button" onClick={onAi} className="flex min-h-[58px] w-full items-center gap-3 rounded-3xl bg-[var(--bm-primary)] px-4 text-left font-bold text-white active:opacity-90">
                <Sparkles className={iconClasses.card} />
                <span>Let BlueMind create it</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MobileModalShell({ open, isDark, title, onClose, children, contentClassName = "" }) {
  useEffect(() => {
    if (!open) return undefined;

    const bodyOverflow = document.body.style.overflow;
    const bodyTouchAction = document.body.style.touchAction;
    const htmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.body.style.touchAction = bodyTouchAction;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex touch-none items-end justify-center overflow-hidden bg-black/55 p-0 backdrop-blur-[14px] md:items-center md:p-6"
          onClick={onClose}
        >
          <div className="box-border w-full max-w-full min-w-0 md:flex md:justify-center" onClick={(event) => event.stopPropagation()}>
            <motion.div
              initial={{ y: "100%", opacity: 0.96 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative box-border flex h-[88dvh] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-t-[34px] shadow-[0_-28px_90px_rgba(0,0,0,0.18)] md:mx-auto md:h-[86dvh] md:max-w-[560px] md:rounded-[34px]",
                isDark ? "bg-[var(--bm-bg-card)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]",
              )}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              <div className="flex h-14 shrink-0 items-center justify-between px-5 pt-2">
                <span className="w-10" />
                <h2 className="truncate text-base font-extrabold">{title}</h2>
                <button type="button" onClick={onClose} className={cn("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "text-white active:bg-white/[0.08]" : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]")} aria-label={`Close ${title}`}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className={cn("box-border min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-2 sm:px-6", contentClassName)}>
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ManualEventSheet({ open, isDark, form, setForm, onClose, onCreate }) {
  const fieldClassName = "bm-field bm-input-interactive box-border h-12 w-full min-w-0 max-w-full rounded-2xl px-3 font-semibold";

  return (
    <MobileModalShell open={open} isDark={isDark} title="Create event" onClose={onClose}>
      <form
        className="box-border w-full max-w-full min-w-0"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
            <p className={cn("mb-4 font-medium", typeClasses.small, "text-[var(--bm-text-muted)]")}>Add it to your mobile Schedule dashboard.</p>

            <div className="space-y-3">
              <label className="block min-w-0">
                <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Event title</span>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Datakommunikation" className={fieldClassName} />
              </label>
              <div className="grid min-w-0 grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Date</span>
                  <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className={fieldClassName} />
                </label>
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Duration</span>
                  <input value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} placeholder="Optional" className={fieldClassName} />
                </label>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>Start time</span>
                  <input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className={fieldClassName} />
                </label>
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 block font-bold", typeClasses.small)}>End time</span>
                  <input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className={fieldClassName} />
                </label>
              </div>

              <div>
                <span className={cn("mb-2 block font-bold", typeClasses.small)}>Color</span>
                <div className="grid min-w-0 grid-cols-4 gap-2 max-[390px]:grid-cols-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button key={color.id} type="button" onClick={() => setForm((current) => ({ ...current, color: color.id }))} className={cn("box-border flex h-11 min-w-0 items-center justify-center rounded-2xl border", form.color === color.id ? "border-[var(--bm-primary)]" : "border-transparent")} aria-label={color.label}>
                      <span className="h-6 w-6 rounded-full" style={{ backgroundColor: color.value }} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={cn("mb-2 block font-bold", typeClasses.small)}>Icon</span>
                <div className="grid min-w-0 grid-cols-4 gap-2 max-[390px]:grid-cols-3">
                  {ICON_OPTIONS.map(({ id, label, Icon }) => (
                    <button key={id} type="button" onClick={() => setForm((current) => ({ ...current, icon: id }))} className={cn("box-border flex h-12 min-w-0 items-center justify-center rounded-2xl border", form.icon === id ? "border-[var(--bm-primary)] bg-[var(--bm-active-bg)] text-[var(--bm-primary)]" : isDark ? "border-white/10 bg-white/[0.05]" : "border-[var(--bm-border)] bg-white")} aria-label={label}>
                      <Icon className={iconClasses.button} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><Bell className="h-3.5 w-3.5" /> Reminder</span>
                  <select value={form.reminder} onChange={(event) => setForm((current) => ({ ...current, reminder: event.target.value }))} className={fieldClassName}>
                    <option>None</option>
                    <option>10 minutes before</option>
                    <option>30 minutes before</option>
                    <option>1 hour before</option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><Repeat className="h-3.5 w-3.5" /> Repeat</span>
                  <select value={form.repeat} onChange={(event) => setForm((current) => ({ ...current, repeat: event.target.value }))} className={fieldClassName}>
                    <option>Never</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                  <option>Monthly</option>
                  </select>
                </label>
              </div>
              <label className="block min-w-0">
                <span className={cn("mb-1.5 flex items-center gap-1.5 font-bold", typeClasses.small)}><StickyNote className="h-3.5 w-3.5" /> Notes</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes" className="bm-field bm-input-interactive box-border min-h-[86px] w-full min-w-0 max-w-full resize-none rounded-2xl px-4 py-3 font-semibold" />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={onClose} className={cn("h-12 rounded-2xl font-bold", isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]")}>Cancel</button>
              <button type="submit" className="h-12 rounded-2xl bg-[var(--bm-primary)] font-bold text-white">Create</button>
            </div>
      </form>
    </MobileModalShell>
  );
}

function AiCreateSheet({ open, isDark, selectedDate, events, onClose }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const scrollRef = useRef(null);
  const photosInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const filesInputRef = useRef(null);
  const conversationIdRef = useRef("");
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, open]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const removeAttachment = (attachmentId) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === attachmentId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== target.previewUrl);
      }
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const handleAttachmentFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setAttachmentMenuOpen(false);
    if (!files.length) return;

    setIsUploading(true);
    const accepted = [];

    try {
      for (const file of files.slice(0, 6)) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        const isImage = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
        const isText = file.type === "text/plain" || ["txt", "md", "csv"].includes(extension);
        const isPdf = file.type === "application/pdf" || extension === "pdf";

        if (!isImage && !isText && !isPdf) {
          toast.error(`${file.name} is not supported here yet.`);
          continue;
        }

        if (isImage && file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is too large.`);
          continue;
        }

        let uploadedImage = null;
        let content = "";
        let previewUrl = "";

        if (isImage) {
          previewUrl = URL.createObjectURL(file);
          objectUrlsRef.current.push(previewUrl);
          uploadedImage = await uploadChatImage(file, conversationIdRef.current || undefined);
        } else if (isText) {
          content = await file.text().catch(() => "");
        }

        accepted.push({
          id: uploadedImage?.id || `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          imageId: uploadedImage?.id || "",
          name: file.name,
          type: isImage ? "image" : isPdf ? "pdf" : "text",
          size: file.size,
          content,
          previewUrl,
        });
      }

      if (accepted.length) {
        setAttachments((current) => [...current, ...accepted].slice(0, 8));
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Attachment upload failed"));
    } finally {
      setIsUploading(false);
    }
  };

  const sendScheduleChatMessage = async (event) => {
    event?.preventDefault?.();
    const text = message.trim();
    if ((!text && !attachments.length) || isSending || isUploading) return;

    const currentAttachments = attachments;
    const imageIds = currentAttachments.map((attachment) => attachment.imageId || attachment.id).filter(Boolean);
    const fileContext = currentAttachments
      .filter((attachment) => attachment.type !== "image")
      .map((attachment) => attachment.content
        ? `\n\nAttached file: ${attachment.name}\n${attachment.content.slice(0, 8000)}`
        : `\n\nAttached file: ${attachment.name} (${attachment.type}).`)
      .join("");
    const outgoingText = `${text || "Please analyze the attached schedule context."}${fileContext}`;
    const userMessage = {
      id: `schedule-user-${Date.now()}`,
      role: "user",
      content: text,
      attachments: currentAttachments,
    };
    const aiMessageId = `schedule-ai-${Date.now()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      { id: aiMessageId, role: "ai", content: "", isStreaming: true },
    ]);
    setMessage("");
    setAttachments([]);
    setIsSending(true);

    try {
      await streamChatMessage({
        message: outgoingText,
        imageIds,
        conversationId: conversationIdRef.current || undefined,
        mode: "general",
        metadata: {
          source: "mobile_schedule_dashboard",
          scheduleContext: {
            selectedDate: toDateKey(selectedDate),
            events: sortEvents(events).slice(0, 40),
          },
        },
        onReady: (payload) => {
          if (payload?.conversation?.conversationId) {
            conversationIdRef.current = payload.conversation.conversationId;
          }
        },
        onDelta: (payload) => {
          const token = payload?.token || "";
          if (!token) return;
          setMessages((current) => current.map((item) => (
            item.id === aiMessageId ? { ...item, content: `${item.content || ""}${token}` } : item
          )));
        },
        onComplete: (payload) => {
          if (payload?.conversation?.conversationId) {
            conversationIdRef.current = payload.conversation.conversationId;
          }
          setMessages((current) => current.map((item) => (
            item.id === aiMessageId
              ? { ...item, content: item.content || payload?.message?.content || "", isStreaming: false }
              : item
          )));
        },
      });
    } catch (error) {
      setMessages((current) => current.map((item) => (
        item.id === aiMessageId
          ? { ...item, content: getApiErrorMessage(error, "BlueMind could not respond."), isStreaming: false }
          : item
      )));
    } finally {
      setIsSending(false);
    }
  };

  const attachmentMenu = attachmentMenuOpen ? (
    <div className="fixed inset-0 z-[160]">
      <button type="button" className="absolute inset-0 cursor-default" onClick={() => setAttachmentMenuOpen(false)} aria-label="Close attachment menu" />
      <div className={cn("absolute bottom-[118px] left-6 right-6 overflow-hidden rounded-[24px] border p-2 shadow-2xl", isDark ? "border-white/10 bg-[#202020] text-white" : "border-black/10 bg-white text-[var(--bm-text-primary)]")}>
        {[
          ["Camera", () => cameraInputRef.current?.click()],
          ["Photos", () => photosInputRef.current?.click()],
          ["Files", () => filesInputRef.current?.click()],
        ].map(([label, action]) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className={cn("h-11 w-full rounded-2xl px-3 text-left text-sm font-bold transition-colors", isDark ? "active:bg-white/[0.08]" : "active:bg-[var(--bm-hover-bg)]")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <MobileModalShell open={open} isDark={isDark} title="BlueMind AI" onClose={onClose} contentClassName="flex flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-3 text-center">
            <img
              src="/bluemind-schedule-ai-create.png"
              alt=""
              className="h-auto w-[min(82vw,330px)] max-w-full select-none object-contain"
              draggable="false"
            />
            <h3 className={cn("mt-3 font-black", typeClasses.cardTitle)}>How should BlueMind help?</h3>
            <p className={cn("mt-2 max-w-[290px] font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-muted)]")}>
              Ask BlueMind to create, edit, or improve your schedule. You can include images for analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((item, index) => {
              const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;
              const hasText = Boolean(String(item.content || "").trim());

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={item.role === "user" ? "flex justify-end" : "w-full"}
                >
                  <div className={cn("max-w-[86%] break-words text-sm font-medium leading-6", item.role === "user" ? "rounded-[22px] bg-[var(--bm-primary)] px-4 py-3 text-white" : isDark ? "w-full text-white" : "w-full text-[var(--bm-text-primary)]")}>
                    {item.role === "user" ? (
                      <>
                        {hasAttachments && (
                          <ChatImageAttachments
                            attachments={item.attachments}
                            hasText={hasText}
                            isDark={isDark}
                            className="mb-2 gap-2"
                            imageClassName="max-h-[180px]"
                          />
                        )}
                        {hasText ? <MessageResponse message={item} previousUserContent={messages[index - 1]?.content || ""} /> : null}
                      </>
                    ) : item.isStreaming && !item.content ? (
                      <ThinkingIndicator className="mb-0" />
                    ) : (
                      <MessageResponse message={item} previousUserContent={messages[index - 1]?.content || ""} className="text-[15px] leading-[1.75]" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <UnifiedComposer
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onSubmit={sendScheduleChatMessage}
        placeholder="Ask BlueMind..."
        attachments={attachments}
        onRemoveAttachment={removeAttachment}
        onClearAttachments={() => {
          attachments.forEach((attachment) => {
            if (attachment.previewUrl) {
              URL.revokeObjectURL(attachment.previewUrl);
              objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== attachment.previewUrl);
            }
          });
          setAttachments([]);
        }}
        isUploading={isUploading}
        onAdd={() => setAttachmentMenuOpen(true)}
        onVoice={() => toast.info("Voice input will use the shared BlueMind voice system when enabled here.")}
        isBusy={isSending}
        canSend={Boolean(message.trim()) || attachments.length > 0}
        isDark={isDark}
        variant="mobile"
        maxTextHeight={120}
        actionMenu={attachmentMenu}
        testId="mobile-schedule-ai-input"
      />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAttachmentFiles} />
      <input ref={photosInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleAttachmentFiles} />
      <input ref={filesInputRef} type="file" accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/csv" multiple className="hidden" onChange={handleAttachmentFiles} />
    </MobileModalShell>
  );
}

function ScheduleContextMenuPortal({ open, rect, isDark, onClose, onEdit, onDelete }) {
  if (!open || !rect || typeof document === "undefined") return null;

  const menuWidth = 144;
  const menuHeight = 88;
  const margin = 10;
  const viewportWidth = window.innerWidth || 390;
  const viewportHeight = window.innerHeight || 760;
  const hasSpaceAbove = rect.top >= menuHeight + margin + 8;
  const desiredTop = hasSpaceAbove ? rect.top - menuHeight - 8 : rect.bottom + 8;
  const top = Math.min(Math.max(desiredTop, margin), viewportHeight - menuHeight - margin);
  const desiredLeft = rect.right - menuWidth;
  const left = Math.min(Math.max(desiredLeft, margin), viewportWidth - menuWidth - margin);

  return createPortal(
    <AnimatePresence>
      <button type="button" className="fixed inset-0 z-[190] cursor-default bg-transparent" onClick={onClose} aria-label="Close schedule actions" />
      <motion.div
        initial={{ opacity: 0, y: hasSpaceAbove ? 4 : -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: hasSpaceAbove ? 4 : -4, scale: 0.98 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className={cn("fixed z-[191] w-36 overflow-hidden rounded-2xl border p-1 shadow-2xl", isDark ? mobileBlueGlassMenuClass : "border-[#2F7DF6]/[0.16] bg-white/85 text-[var(--bm-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_16px_36px_rgba(15,85,170,0.12)] backdrop-blur-[22px]")}
        style={{ top, left }}
      >
        <button
          type="button"
          onClick={onEdit}
          className={cn("flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold transition-colors", isDark ? "text-white hover:bg-white/[0.08] active:bg-white/[0.08]" : "hover:bg-[#2F7DF6]/[0.08] active:bg-[#2F7DF6]/[0.08]")}
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={cn("flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-red-500 transition-colors", isDark ? "hover:bg-white/[0.08] active:bg-white/[0.08]" : "hover:bg-red-50 active:bg-red-50")}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function AllSchedulesModal({ open, isDark, events, onClose, onOpenMenu }) {
  return (
    <MobileModalShell open={open} isDark={isDark} title="All schedules" onClose={onClose} contentClassName="flex flex-col">
            <p className={cn("mb-4 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
              Sorted by date and time automatically.
            </p>
              {events.length ? (
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
                  {events.map((event) => {
                    const Icon = getIcon(event.icon);
                    const color = getColor(event.color);

                    return (
                      <div
                        key={event.id}
                        className={cn("relative flex items-center gap-3 rounded-[24px] border p-3", isDark ? mobileBlueGlassSurfaceClass : "border-[#2F7DF6]/[0.10] bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(15,85,170,0.08)] backdrop-blur-[18px]")}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: color }}>
                          <Icon className={iconClasses.button} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-black", typeClasses.body)}>{event.title}</span>
                          <span className={cn("mt-1 flex items-center gap-1.5 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateLabel(fromDateKey(event.date))}, {event.startTime}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={(clickEvent) => onOpenMenu(event.id, clickEvent)}
                          className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out", isDark ? mobileBlueGlassControlClass : "border-[#2F7DF6]/[0.14] bg-white/80 text-[var(--bm-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_22px_rgba(15,85,170,0.10)] backdrop-blur-[18px] active:bg-[#2F7DF6]/[0.08]")}
                          aria-label={`Open actions for ${event.title}`}
                        >
                          <MoreVertical className={iconClasses.button} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={cn("rounded-[24px] border p-5 text-center", isDark ? "border-white/10 bg-white/[0.05]" : "border-[var(--bm-border)] bg-[var(--bm-bg-elevated)]")}>
                  <CalendarDays className="mx-auto h-8 w-8 text-[var(--bm-primary)]" />
                  <p className={cn("mt-3 font-black", typeClasses.body)}>No schedules yet</p>
                  <p className={cn("mx-auto mt-1 max-w-[240px] font-semibold leading-5", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                    Use the plus button to add your first schedule.
                  </p>
                </div>
              )}
    </MobileModalShell>
  );
}

export default function MobileScheduleDashboard() {
  const navigate = useNavigate();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState(readEvents);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(() => createInitialManualEvent(new Date()));
  const [editingEventId, setEditingEventId] = useState("");
  const [eventMenuId, setEventMenuId] = useState("");
  const [eventMenuAnchorEl, setEventMenuAnchorEl] = useState(null);
  const [eventMenuRect, setEventMenuRect] = useState(null);
  const [scheduleListOpen, setScheduleListOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);
  const sortedEvents = useMemo(() => sortEvents(events), [events]);
  const selectedEvents = useMemo(() => sortEvents(events.filter((event) => event.date === toDateKey(selectedDate))), [events, selectedDate]);
  const selectedMenuEvent = useMemo(() => events.find((event) => event.id === eventMenuId) || null, [eventMenuId, events]);
  const monthDates = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const selectedWeekRow = Math.max(0, Math.floor(monthDates.findIndex((date) => sameDate(date, selectedDate)) / 7));
  const calendarRowHeight = 50;
  const calendarRowGap = 6;
  const calendarCollapsedHeight = calendarRowHeight;
  const calendarExpandedHeight = (calendarRowHeight * 6) + (calendarRowGap * 5);
  const calendarOffset = isExpanded ? 0 : -(selectedWeekRow * (calendarRowHeight + calendarRowGap));
  const selectedMonth = MONTH_NAMES[selectedDate.getMonth()];
  const selectedYear = selectedDate.getFullYear();

  useEffect(() => {
    if (!eventMenuAnchorEl || !eventMenuId) return undefined;

    const updateRect = () => {
      if (!document.body.contains(eventMenuAnchorEl)) {
        setEventMenuId("");
        setEventMenuAnchorEl(null);
        setEventMenuRect(null);
        return;
      }
      setEventMenuRect(eventMenuAnchorEl.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [eventMenuAnchorEl, eventMenuId]);

  const closeEventMenu = () => {
    setEventMenuId("");
    setEventMenuAnchorEl(null);
    setEventMenuRect(null);
  };

  const openEventMenu = (eventId, clickEvent) => {
    clickEvent.stopPropagation();
    const anchor = clickEvent.currentTarget;
    setEventMenuId((current) => {
      if (current === eventId) {
        setEventMenuAnchorEl(null);
        setEventMenuRect(null);
        return "";
      }
      setEventMenuAnchorEl(anchor);
      setEventMenuRect(anchor.getBoundingClientRect());
      return eventId;
    });
  };

  const saveEvent = (eventData) => {
    if (!eventData.title.trim()) {
      toast.error("Add an event title first.");
      return;
    }

    if (editingEventId) {
      const nextEvents = events.map((event) => (
        event.id === editingEventId
          ? { ...event, ...eventData, title: eventData.title.trim(), updatedAt: new Date().toISOString() }
          : event
      ));
      setEvents(nextEvents);
      persistEvents(nextEvents);
      setSelectedDate(fromDateKey(eventData.date));
      setEditingEventId("");
      toast.success("Schedule event updated.");
      return;
    }

    const nextEvent = {
      ...eventData,
      id: `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: eventData.title.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextEvents = [...events, nextEvent];
    setEvents(nextEvents);
    persistEvents(nextEvents);
    setSelectedDate(fromDateKey(nextEvent.date));
    toast.success("Schedule event created.");
  };

  const openManualCreate = () => {
    setActionSheetOpen(false);
    setEditingEventId("");
    setManualForm(createInitialManualEvent(selectedDate));
    setManualOpen(true);
  };

  const openEditEvent = (event) => {
    closeEventMenu();
    setScheduleListOpen(false);
    setEditingEventId(event.id);
    setManualForm({
      title: event.title || "",
      date: event.date || toDateKey(selectedDate),
      startTime: event.startTime || "08:00",
      endTime: event.endTime || "09:00",
      duration: event.duration || "",
      color: event.color || "blue",
      icon: event.icon || "calendar",
      reminder: event.reminder || "None",
      repeat: event.repeat || "Never",
      notes: event.notes || "",
    });
    setManualOpen(true);
  };

  const deleteEvent = (eventId) => {
    const nextEvents = events.filter((event) => event.id !== eventId);
    setEvents(nextEvents);
    persistEvents(nextEvents);
    closeEventMenu();
    toast.success("Schedule event deleted.");
  };

  const openAiCreate = () => {
    setActionSheetOpen(false);
    setAiOpen(true);
  };

  const createManualEvent = () => {
    saveEvent(manualForm);
    setManualOpen(false);
  };

  const renderCalendarDay = (date) => {
    const key = toDateKey(date);
    const selected = sameDate(date, selectedDate);
    const inMonth = date.getMonth() === selectedDate.getMonth();
    const hasEvents = eventDates.has(key);

    return (
      <button
        key={key}
        type="button"
        onClick={() => setSelectedDate(date)}
        className={cn(
          "relative flex min-h-[50px] flex-col items-center justify-center rounded-[18px] transition-colors duration-150 ease-out",
          selected
            ? "border border-[#2F7DF6]/[0.26] bg-[rgba(47,125,246,0.92)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_rgba(47,125,246,0.24)]"
            : isDark
              ? "text-white active:bg-white/[0.08]"
              : "text-[var(--bm-text-primary)] active:bg-[var(--bm-hover-bg)]",
          !inMonth && isExpanded && !selected && "opacity-35",
        )}
      >
        <span className="text-[15px] font-extrabold leading-none">{date.getDate()}</span>
        <span className="mt-1 flex h-1.5 items-center gap-1">
          {hasEvents && <span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-white" : "bg-[var(--bm-primary)]")} />}
        </span>
      </button>
    );
  };

  return (
    <main className={cn("min-h-screen overflow-x-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.875rem,env(safe-area-inset-top))]", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[#F7FAFF] text-[var(--bm-text-primary)]")}>
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => navigate(-1)} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 ease-out", isDark ? "bg-white/[0.08] text-white active:bg-white/[0.13]" : "bg-white text-[var(--bm-text-primary)] shadow-sm active:bg-[var(--bm-hover-bg)]")} aria-label="Back">
          <ArrowLeft className={iconClasses.button} />
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setScheduleListOpen(true)} className={cn("flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-150 ease-out", isDark ? mobileBlueGlassControlClass : "border-[#2F7DF6]/[0.14] bg-white/80 text-[var(--bm-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_22px_rgba(15,85,170,0.10)] backdrop-blur-[18px] active:bg-[#2F7DF6]/[0.08]")} aria-label="View all schedules">
            <CalendarDays className={iconClasses.button} />
          </button>
          <button type="button" onClick={() => setActionSheetOpen(true)} className={cn("flex h-10 w-10 items-center justify-center rounded-full border transition-transform duration-150 ease-out active:scale-[0.98]", mobileBlueGlassControlClass)} aria-label="Create schedule">
            <Plus className={iconClasses.button} />
          </button>
        </div>
      </header>

      <section className="mt-5">
        <button type="button" onClick={() => setIsExpanded((value) => !value)} className="flex w-full items-end justify-between text-left">
          <div>
            <p className={cn("text-[19px] font-extrabold leading-none", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{selectedYear}</p>
            <p className="mt-1 flex items-center gap-1 text-[26px] font-extrabold leading-none">
              {selectedMonth}
              <ChevronDown className={cn("h-5 w-5 transition-transform duration-200 ease-out", isExpanded && "rotate-180")} />
            </p>
          </div>
          <span className={cn("mb-1 rounded-full px-3 py-1.5 font-bold", typeClasses.small, isDark ? "bg-white/[0.08] text-white" : "bg-white text-[var(--bm-primary)] shadow-sm")}>
            {isExpanded ? "Month" : "Week"}
          </span>
        </button>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="text-center text-[10.5px] font-medium tracking-wide text-[var(--bm-text-muted)]/75">{day}</div>
          ))}
        </div>
        <motion.div
          initial={false}
          animate={{ height: isExpanded ? calendarExpandedHeight : calendarCollapsedHeight }}
          transition={{ duration: 0.34, ease: [0.25, 1, 0.5, 1] }}
          className="mt-1.5 overflow-hidden"
          style={{ willChange: "height" }}
        >
          <motion.div
            initial={false}
            animate={{ y: calendarOffset }}
            transition={{ duration: 0.34, ease: [0.25, 1, 0.5, 1] }}
            className="grid grid-cols-7 gap-1.5"
            style={{ willChange: "transform" }}
          >
            {monthDates.map(renderCalendarDay)}
          </motion.div>
        </motion.div>
      </section>

      <section className="mt-6">
        <div className="mb-3">
          <div>
            <h1 className={cn("text-[22px] font-black", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{formatDateLabel(selectedDate)}</h1>
            <p className={cn("mt-1 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>{selectedEvents.length ? `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}` : "No events yet"}</p>
          </div>
        </div>

        {selectedEvents.length ? (
          <>
            <div className="space-y-3">
              {selectedEvents.map((event) => {
                const Icon = getIcon(event.icon);
                const color = getColor(event.color);
                return (
                  <motion.div
                    key={event.id}
                    layout
                    whileTap={{ scale: 0.99 }}
                    className={cn("relative flex w-full items-center gap-3 rounded-[26px] border p-3 text-left shadow-sm transition-colors duration-150 ease-out", isDark ? mobileBlueGlassSurfaceClass : "border-[#2F7DF6]/[0.10] bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(15,85,170,0.08)] backdrop-blur-[18px]")}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: color }}>
                      <Icon className={iconClasses.button} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-black", typeClasses.body)}>{event.title}</span>
                      <span className={cn("mt-1 flex items-center gap-1.5 font-semibold", typeClasses.small, "text-[var(--bm-text-muted)]")}>
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDateLabel(fromDateKey(event.date))}, {event.startTime}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(clickEvent) => openEventMenu(event.id, clickEvent)}
                      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out", isDark ? mobileBlueGlassControlClass : "border-[#2F7DF6]/[0.14] bg-white/80 text-[var(--bm-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_22px_rgba(15,85,170,0.10)] backdrop-blur-[18px] active:bg-[#2F7DF6]/[0.08]")}
                      aria-label={`Open actions for ${event.title}`}
                    >
                      <MoreVertical className={iconClasses.button} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={cn("rounded-[30px] border p-4 text-center", isDark ? "border-white/10 bg-white/[0.05]" : "border-white bg-white shadow-sm")}>
            <div className="mx-auto flex h-[168px] max-w-[238px] items-end justify-center overflow-hidden">
              <img
                src="/bluemind-schedule-empty-character.jpg"
                alt="BlueMind relaxing on a beach chair"
                className="h-full w-full object-contain mix-blend-multiply"
                draggable={false}
              />
            </div>
            <h2 className="mt-3 text-lg font-black">No events today!</h2>
            <p className={cn("mx-auto mt-2 max-w-[260px] font-semibold leading-6", typeClasses.small, "text-[var(--bm-text-muted)]")}>
              Looks like a good day to relax and recharge.
            </p>
            <div className="mt-4 grid gap-2.5">
              <button type="button" onClick={openManualCreate} className="h-11 rounded-2xl bg-[var(--bm-primary)] font-bold text-white transition-transform duration-150 ease-out active:scale-[0.99]">
                {events.length ? "Add Schedule" : "Create Schedule"}
              </button>
              <button type="button" onClick={openAiCreate} className={cn("h-11 rounded-2xl font-bold transition-transform duration-150 ease-out active:scale-[0.99]", isDark ? "bg-white/[0.08] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-primary)]")}>
                {events.length ? "Improve with BlueMind" : "Let BlueMind create it"}
              </button>
            </div>
          </div>
        )}
      </section>

      <ScheduleActionSheet open={actionSheetOpen} isDark={isDark} onClose={() => setActionSheetOpen(false)} onManual={openManualCreate} onAi={openAiCreate} />
      <ManualEventSheet open={manualOpen} isDark={isDark} form={manualForm} setForm={setManualForm} onClose={() => setManualOpen(false)} onCreate={createManualEvent} />
      <AiCreateSheet open={aiOpen} isDark={isDark} selectedDate={selectedDate} events={events} onClose={() => setAiOpen(false)} />
      <AllSchedulesModal
        open={scheduleListOpen}
        isDark={isDark}
        events={sortedEvents}
        onClose={() => {
          closeEventMenu();
          setScheduleListOpen(false);
        }}
        onOpenMenu={openEventMenu}
      />
      <ScheduleContextMenuPortal
        open={Boolean(eventMenuId && selectedMenuEvent)}
        rect={eventMenuRect}
        isDark={isDark}
        onClose={closeEventMenu}
        onEdit={() => {
          if (selectedMenuEvent) openEditEvent(selectedMenuEvent);
        }}
        onDelete={() => {
          if (selectedMenuEvent) deleteEvent(selectedMenuEvent.id);
        }}
      />
    </main>
  );
}
