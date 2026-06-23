import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, Image as ImageIcon, PenLine, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { iconClasses, interactionClasses, typeClasses } from "@/lib/interactions";

export default function DesktopPlusMenu({
  open,
  onClose,
  isDark = false,
  onCamera,
  onFiles,
  onCreateImage,
  onWriteEdit,
  onSearch,
}) {
  const menuRef = useRef(null);
  const [placement, setPlacement] = useState("above");

  const surfaceClass = isDark
    ? "border-white/[0.08] bg-[var(--bm-bg-card)] text-white shadow-[0_10px_22px_rgba(0,0,0,0.26)]"
    : "border-black/[0.07] bg-white text-[var(--bm-text-primary)] shadow-[0_10px_22px_rgba(15,23,42,0.10)]";
  const groupLabelClass = isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]";
  const iconClass = "text-[var(--bm-icon-primary)]";
  const dividerClass = isDark ? "bg-white/[0.08]" : "bg-[var(--bm-border)]";

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePlacement = () => {
      const trigger = menuRef.current?.parentElement;
      if (!trigger) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 276;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const availableBelow = viewportHeight - triggerRect.bottom;
      const availableAbove = triggerRect.top;
      setPlacement(availableBelow >= menuHeight + 12 || availableBelow >= availableAbove ? "below" : "above");
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open]);

  const pickerItems = [
    { label: "Camera", description: "Take a photo", icon: Camera, action: onCamera },
    { label: "Photos & Files", description: "Upload images or documents", icon: FileText, action: onFiles },
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
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", isDark ? "bg-white/[0.07]" : "bg-[var(--bm-hover-bg)]")}>
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
        className={cn("flex min-h-[44px] w-full items-center rounded-[16px] px-2 py-1 text-left", iconClasses.iconText, interactionClasses.menuItem)}
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
            ref={menuRef}
            className={cn(
              "absolute left-0 z-[86] w-[258px] rounded-[20px] border p-1",
              placement === "below" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]",
              surfaceClass,
            )}
            data-testid="desktop-plus-menu"
            initial={{ opacity: 0, y: placement === "below" ? -4 : 4, scale: 0.98, transformOrigin: placement === "below" ? "18px 0%" : "18px 100%" }}
            animate={{ opacity: 1, y: 0, scale: 1, transformOrigin: placement === "below" ? "18px 0%" : "18px 100%" }}
            exit={{ opacity: 0, y: placement === "below" ? -4 : 4, scale: 0.98, transformOrigin: placement === "below" ? "18px 0%" : "18px 100%" }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-0.5">{pickerItems.map(renderRow)}</div>

            <div className={cn("my-1 h-px", dividerClass)} />

            <div className="space-y-0.5">{toolItems.map(renderRow)}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
