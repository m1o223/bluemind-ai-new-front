import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, Image as ImageIcon, PenLine, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { iconClasses } from "@/lib/interactions";

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

  const surfaceClass = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const iconClass = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const dividerClass = isDark ? "bg-white/[0.08]" : "bg-[var(--bm-border)]";

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePlacement = () => {
      const trigger = menuRef.current?.parentElement;
      if (!trigger) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 232;
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
    { label: "Camera", icon: Camera, action: onCamera },
    { label: "Photos & Files", icon: FileText, action: onFiles },
  ];

  const toolItems = [
    { label: "Create Image", icon: ImageIcon, action: onCreateImage },
    { label: "Write / Edit", icon: PenLine, action: onWriteEdit },
    { label: "Search", icon: Search, action: onSearch },
  ];

  const renderRow = (item) => {
    const Icon = item.icon;

    return (
      <button
        key={item.label}
        type="button"
        onClick={item.action}
        className={cn(
          "bm-glass-menu-item flex min-h-[48px] w-full items-center gap-3 rounded-[16px] px-3.5 py-2.5 text-left text-sm font-bold transition-colors",
          isDark
            ? "text-white hover:bg-white/[0.07]"
            : "text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]",
        )}
      >
        <Icon className={cn(iconClasses.button, "shrink-0 stroke-[2.2]", iconClass)} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
              "bm-glass-panel absolute left-0 z-[86] w-[240px] overflow-hidden rounded-[24px] border p-2",
              placement === "below" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]",
              surfaceClass,
            )}
            data-testid="desktop-plus-menu"
            initial={{ opacity: 0, y: placement === "below" ? -4 : 4, scale: 0.98, transformOrigin: placement === "below" ? "18px 0%" : "18px 100%" }}
            animate={{ opacity: 1, y: 0, scale: 1, transformOrigin: placement === "below" ? "18px 0%" : "18px 100%" }}
            exit={{ opacity: 0, y: placement === "below" ? -4 : 4, scale: 0.98, transformOrigin: placement === "below" ? "18px 0%" : "18px 100%" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-1">{pickerItems.map(renderRow)}</div>

            <div className={cn("my-1.5 h-px", dividerClass)} />

            <div className="space-y-1">{toolItems.map(renderRow)}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
