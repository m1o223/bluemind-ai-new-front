import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, Image as ImageIcon, PenLine, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { iconClasses, interactionClasses, motionTokens, typeClasses } from "@/lib/interactions";

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
    ? "border-white/[0.1] bg-[var(--bm-bg-card)]/[0.94] text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
    : "border-black/[0.08] bg-white/[0.94] text-[var(--bm-text-primary)] shadow-[0_24px_70px_rgba(15,23,42,0.16)]";
  const groupLabelClass = isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]";
  const iconClass = isDark ? "text-[var(--bm-border)]" : "text-[var(--bm-primary)]";
  const dividerClass = isDark ? "bg-white/[0.1]" : "bg-[var(--bm-border)]";

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
          <Icon className={cn(iconClasses.button, iconClass)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block font-extrabold", typeClasses.small)}>{item.label}</span>
          <span className={cn("mt-0.5 block font-semibold", typeClasses.small, groupLabelClass)}>{item.description}</span>
        </span>
      </>
    );

    if (item.kind === "photos" && photosInputProps) {
      return (
        <label
          key={item.label}
          className={cn(
            "relative flex min-h-[54px] cursor-pointer items-center rounded-2xl px-3 py-2 text-left transition-colors",
            iconClasses.iconText,
            interactionClasses.menuItem,
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
        className={cn("flex min-h-[54px] w-full items-center rounded-2xl px-3 py-2 text-left", iconClasses.iconText, interactionClasses.menuItem)}
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
              transition={motionTokens.transition}
            >
              <div className="px-3 pb-2 pt-2">
                <p className={cn("font-extrabold", typeClasses.small)}>BlueMind AI</p>
                <p className={cn("mt-0.5 font-semibold", typeClasses.small, groupLabelClass)}>Add media or choose a tool.</p>
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
