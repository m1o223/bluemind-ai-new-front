import { AnimatePresence, motion } from "framer-motion";
import { Camera, Image, PenLine, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

function getPreviewUrl(item) {
  return item.previewUrl || item.url || item.thumbnail || item.src || "";
}

export default function BlueMindMediaPicker({
  open,
  onClose,
  isDark = false,
  variant = "mobile",
  selectedImages = [],
  onCamera,
  onAllPhotos,
  onToggleImage,
  onCreateImage,
  onWriteEdit,
  onSearch,
}) {
  const isMobile = variant === "mobile";
  const backdrop = isDark ? "bg-black/45" : "bg-slate-900/20";
  const panelClass = isDark
    ? "border-white/[0.1] bg-[#171717]/[0.96] text-white"
    : "border-black/[0.08] bg-white/[0.96] text-[#111827]";
  const mutedText = isDark ? "text-[#BDBDBD]" : "text-[#64748B]";
  const divider = isDark ? "bg-white/[0.1]" : "bg-[#D6DEE9]";
  const rowClass = isDark
    ? "active:bg-white/[0.08]"
    : "active:bg-[#EEF2F7] hover:bg-[#F8FAFC]";

  const toolRows = [
    {
      label: "Create Image",
      description: "Generate images from ideas and references.",
      icon: Image,
      action: onCreateImage,
    },
    {
      label: "Write/Edit",
      description: "Write, improve, summarize, and edit content.",
      icon: PenLine,
      action: onWriteEdit,
    },
    {
      label: "Search",
      description: "Find information and discover knowledge.",
      icon: Search,
      action: onSearch,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85]">
          <motion.button
            type="button"
            className={cn("absolute inset-0 backdrop-blur-[3px]", backdrop)}
            onClick={onClose}
            aria-label="Close media picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <motion.section
            className={cn(
              "absolute inset-x-0 bottom-0 border-t shadow-[0_-26px_80px_rgba(15,23,42,0.24)] backdrop-blur-2xl",
              isMobile ? "rounded-t-[30px] px-4 pb-5 pt-3" : "mx-auto max-w-3xl rounded-t-[32px] px-5 pb-6 pt-4",
              panelClass,
            )}
            style={{
              paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom) + 20px)" : undefined,
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 180 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 600) onClose?.();
            }}
            data-testid="bluemind-media-picker"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#9CA3AF]/55" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-extrabold tracking-tight">BlueMind AI</h2>
              <button
                type="button"
                onClick={onAllPhotos}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-bold transition-colors",
                  isDark ? "text-white active:bg-white/[0.08]" : "text-[#193B68] active:bg-[#EEF2FF]",
                )}
              >
                All Photos
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={onCamera}
                className={cn(
                  "flex h-[78px] w-[78px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[22px] border text-xs font-bold",
                  isDark ? "border-white/[0.1] bg-white/[0.06] text-white" : "border-[#D6DEE9] bg-[#F8FAFC] text-[#193B68]",
                )}
              >
                <Camera className="h-6 w-6" />
                Camera
              </button>

              {selectedImages.slice(0, 20).map((item, index) => {
                const preview = getPreviewUrl(item);
                return (
                  <button
                    key={item.id || `${preview}-${index}`}
                    type="button"
                    onClick={() => onToggleImage?.(item)}
                    className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-[22px] bg-[#111827]"
                    title={item.name || `Photo ${index + 1}`}
                  >
                    {preview ? (
                      <img src={preview} alt="" className="h-full w-full object-cover" draggable="false" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#193B68] to-[#75A7FF]" />
                    )}
                    <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#193B68] px-1.5 text-xs font-extrabold text-white shadow-lg">
                      {index + 1}
                    </span>
                    <span className="absolute inset-0 ring-2 ring-inset ring-[#193B68]/80" />
                  </button>
                );
              })}
            </div>

            <div className={cn("mb-3 h-px", divider)} />

            <div className="space-y-1">
              {toolRows.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  onClick={tool.action}
                  className={cn("flex min-h-[64px] w-full items-center gap-3 rounded-[20px] px-2.5 text-left transition-colors", rowClass)}
                >
                  <tool.icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold">{tool.label}</span>
                    <span className={cn("mt-0.5 block text-xs font-semibold leading-5", mutedText)}>
                      {tool.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-full",
                isDark ? "text-white active:bg-white/[0.08]" : "text-[#111827] active:bg-[#EEF2F7]",
              )}
              aria-label="Close media picker"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
