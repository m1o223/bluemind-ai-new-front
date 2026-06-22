import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, Image as ImageIcon, PenLine, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { iconClasses, interactionClasses, typeClasses } from "@/lib/interactions";

export default function DesktopPlusMenu({
  open,
  onClose,
  isDark = false,
  onCamera,
  onAllPhotos,
  onFiles,
  onCreateImage,
  onWriteEdit,
  onSearch,
}) {
  const surfaceClass = isDark
    ? "border-white/[0.1] bg-[var(--bm-bg-card)]/[0.96] text-white shadow-[0_18px_52px_rgba(0,0,0,0.42)]"
    : "border-black/[0.08] bg-white/[0.97] text-[var(--bm-text-primary)] shadow-[0_18px_48px_rgba(15,23,42,0.14)]";
  const groupLabelClass = isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]";
  const iconClass = isDark ? "text-[var(--bm-border)]" : "text-[var(--bm-primary)]";
  const dividerClass = isDark ? "bg-white/[0.1]" : "bg-[var(--bm-border)]";

  const pickerItems = [
    { label: "Camera", description: "Take a photo", icon: Camera, action: onCamera },
    { label: "Photos", description: "Choose images", icon: ImageIcon, action: onAllPhotos },
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
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", isDark ? "bg-white/[0.07]" : "bg-[#EEF4FB]")}>
          <Icon className={cn(iconClasses.button, iconClass)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block font-extrabold", typeClasses.small)}>{item.label}</span>
          <span className={cn("mt-0.5 block font-semibold", typeClasses.small, groupLabelClass)}>{item.description}</span>
        </span>
      </>
    );

    return (
      <button
        key={item.label}
        type="button"
        onClick={item.action}
        className={cn("flex min-h-[48px] w-full items-center rounded-2xl px-2.5 py-1.5 text-left", iconClasses.iconText, interactionClasses.menuItem)}
      >
        {content}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[84] cursor-default bg-transparent"
            onClick={onClose}
            aria-label="Close desktop plus menu"
          />

          <motion.div
            className={cn("absolute bottom-[calc(100%+10px)] left-0 z-[86] w-[286px] rounded-[22px] border p-1.5 backdrop-blur-2xl", surfaceClass)}
            data-testid="desktop-plus-menu"
            initial={{ opacity: 0, y: 8, scale: 0.96, transformOrigin: "18px 100%" }}
            animate={{ opacity: 1, y: 0, scale: 1, transformOrigin: "18px 100%" }}
            exit={{ opacity: 0, y: 6, scale: 0.96, transformOrigin: "18px 100%" }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-2.5 pb-1.5 pt-1.5">
              <p className={cn("font-extrabold", typeClasses.small)}>BlueMind AI</p>
              <p className={cn("mt-0.5 font-semibold leading-4", typeClasses.small, groupLabelClass)}>Add media or choose a tool.</p>
            </div>

            <div className="space-y-0.5">{pickerItems.map(renderRow)}</div>

            <div className={cn("my-1.5 h-px", dividerClass)} />

            <div className="space-y-0.5">{toolItems.map(renderRow)}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
