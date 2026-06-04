import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, Image, PenLine, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export default function BlueMindMediaPicker({
  open,
  onClose,
  isDark = false,
  variant = "mobile",
  onCamera,
  onAllPhotos,
  onFiles,
  photosInputProps,
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
  const actionCardClass = isDark
    ? "border-white/[0.12] bg-white/[0.075] text-white active:bg-white/[0.11]"
    : "border-[#D6DEE9] bg-[#F8FAFC] text-[#193B68] active:bg-[#EEF2F7]";

  const topActions = [
    {
      label: "Camera",
      icon: Camera,
      action: onCamera,
    },
    {
      label: "Photos",
      icon: Image,
      action: onAllPhotos,
      kind: "photos",
    },
    {
      label: "Files",
      icon: FileText,
      action: onFiles,
    },
  ];

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

            <div className="mb-4 flex items-center justify-center">
              <h2 className="text-[17px] font-extrabold tracking-tight">BlueMind AI</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 pb-4">
              {topActions.map((item) => (
                item.kind === "photos" && photosInputProps ? (
                  <label
                    key={item.label}
                    className={cn(
                      "relative flex aspect-square min-h-[92px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[24px] border text-sm font-extrabold shadow-sm transition-transform active:scale-[0.98]",
                      actionCardClass,
                    )}
                  >
                    <item.icon className="h-7 w-7" />
                    <span>{item.label}</span>
                    <input
                      {...photosInputProps}
                      type="file"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Photos"
                      onClick={(event) => {
                        console.debug("[BlueMind media picker] photos native input tapped", {
                          accept: event.currentTarget.accept,
                          multiple: event.currentTarget.multiple,
                        });
                        photosInputProps.onClick?.(event);
                      }}
                      onChange={(event) => {
                        const fileCount = event.currentTarget.files?.length || 0;
                        console.debug("[BlueMind media picker] photos selected", {
                          count: fileCount,
                          accept: event.currentTarget.accept,
                          multiple: event.currentTarget.multiple,
                        });
                        photosInputProps.onChange?.(event);
                        if (fileCount) {
                          onClose?.();
                        }
                      }}
                    />
                  </label>
                ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={cn(
                    "flex aspect-square min-h-[92px] flex-col items-center justify-center gap-2 rounded-[24px] border text-sm font-extrabold shadow-sm transition-transform active:scale-[0.98]",
                    actionCardClass,
                  )}
                >
                  <item.icon className="h-7 w-7" />
                  <span>{item.label}</span>
                </button>
                )
              ))}
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
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
