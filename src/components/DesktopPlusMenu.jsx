import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, Image as ImageIcon, PenLine, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export default function DesktopPlusMenu({
  open,
  onClose,
  isDark = false,
  onCamera,
  onAllPhotos,
  onFiles,
  photosInputProps,
  onCreateImage,
  onWriteEdit,
  onSearch,
}) {
  const surfaceClass = isDark
    ? "border-white/[0.1] bg-[#181818]/[0.94] text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
    : "border-black/[0.08] bg-white/[0.94] text-[#111827] shadow-[0_24px_70px_rgba(15,23,42,0.16)]";
  const groupLabelClass = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const rowClass = isDark
    ? "hover:bg-white/[0.08] active:bg-white/[0.12]"
    : "hover:bg-[#F3F6FA] active:bg-[#E8EEF6]";
  const iconClass = isDark ? "text-[#E5E7EB]" : "text-[#193B68]";
  const dividerClass = isDark ? "bg-white/[0.1]" : "bg-[#E5EAF0]";

  const pickerItems = [
    { label: "Camera", description: "Take a photo", icon: Camera, action: onCamera },
    { label: "Photos", description: "Choose images", icon: ImageIcon, action: onAllPhotos, kind: "photos" },
    { label: "Files", description: "Attach documents", icon: FileText, action: onFiles },
  ];

  const toolItems = [
    { label: "Create Image", description: "Generate images from ideas", icon: ImageIcon, action: onCreateImage },
    { label: "Write / Edit", description: "Draft, improve, and refine text", icon: PenLine, action: onWriteEdit },
    { label: "Search", description: "Find information with BlueMind", icon: Search, action: onSearch },
  ];

  const renderRow = (item) => {
    const Icon = item.icon;
    const content = (
      <>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", isDark ? "bg-white/[0.07]" : "bg-[#EEF4FB]")}>
          <Icon className={cn("h-[18px] w-[18px]", iconClass)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold leading-5">{item.label}</span>
          <span className={cn("mt-0.5 block text-xs font-semibold leading-4", groupLabelClass)}>{item.description}</span>
        </span>
      </>
    );

    if (item.kind === "photos" && photosInputProps) {
      return (
        <label
          key={item.label}
          className={cn(
            "relative flex min-h-[54px] cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors",
            rowClass,
          )}
        >
          {content}
          <input
            {...photosInputProps}
            type="file"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Photos"
            onChange={(event) => {
              photosInputProps.onChange?.(event);
              if (event.currentTarget.files?.length) onClose?.();
            }}
          />
        </label>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        onClick={item.action}
        className={cn("flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors", rowClass)}
      >
        {content}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85]" data-testid="desktop-plus-menu">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={onClose}
            aria-label="Close desktop plus menu"
          />

          <div className="fixed bottom-[96px] left-1/2 z-[86] w-[320px] -translate-x-1/2">
            <motion.div
              className={cn("rounded-[24px] border p-2 backdrop-blur-2xl", surfaceClass)}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="px-3 pb-2 pt-2">
                <p className="text-sm font-extrabold leading-5">BlueMind AI</p>
                <p className={cn("mt-0.5 text-xs font-semibold", groupLabelClass)}>Add media or choose a tool.</p>
              </div>

              <div className="space-y-1">{pickerItems.map(renderRow)}</div>

              <div className={cn("my-2 h-px", dividerClass)} />

              <div className="space-y-1">{toolItems.map(renderRow)}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
