import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { overlayMotion } from "@/lib/interactions";
import { cn } from "@/lib/utils";

const motionByKind = {
  popup: overlayMotion.popup,
  popupUp: overlayMotion.popupUp,
  modal: overlayMotion.modal,
  sheet: overlayMotion.sheet,
  sideDrawer: overlayMotion.sideDrawer,
  page: overlayMotion.page,
};

const transitionByKind = {
  popup: overlayMotion.transition.popup,
  popupUp: overlayMotion.transition.popup,
  modal: overlayMotion.transition.modal,
  sheet: overlayMotion.transition.sheet,
  sideDrawer: overlayMotion.transition.sheet,
  page: overlayMotion.transition.page,
};

export function BlueMindOverlay({
  open,
  children,
  kind = "modal",
  className,
  contentClassName,
  backdropClassName,
  contentStyle,
  backdropStyle,
  onClose,
  closeLabel = "Close overlay",
  showBackdrop = true,
  closeOnBackdrop = true,
  contentAs = "div",
  contentProps,
  initial,
  animate,
  exit,
  transition,
  onExitComplete,
  portal = true,
  contained = false,
  instant = false,
}) {
  const Content = motion[contentAs] || motion.div;
  const motionState = motionByKind[kind] || overlayMotion.modal;
  const motionTransition = transition || transitionByKind[kind] || overlayMotion.transition.modal;
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const overlayRootRef = useRef(null);

  const requestClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const requestBackdropClose = useCallback((event) => {
    if (!closeOnBackdrop) return;
    const backdrop = event.target?.closest?.("[data-bm-overlay-backdrop='true']");
    if (!backdrop || backdrop.parentElement !== overlayRootRef.current) return;
    requestClose(event);
  }, [closeOnBackdrop, requestClose]);

  const durationMs = useMemo(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      return 1;
    }

    const duration = typeof motionTransition?.duration === "number"
      ? motionTransition.duration
      : overlayMotion.transition.modal.duration;

    return Math.max(1, duration * 1000);
  }, [motionTransition]);

  useEffect(() => {
    let frameId;
    let timeoutId;

    if (instant) {
      setMounted(open);
      setVisible(open);
      return undefined;
    }

    if (open) {
      setMounted(true);
      frameId = window.requestAnimationFrame(() => setVisible(true));
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (!mounted) return undefined;

    setVisible(false);
    timeoutId = window.setTimeout(() => {
      setMounted(false);
      onExitComplete?.();
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, instant, mounted, onExitComplete, open]);

  if (!mounted) return null;

  const overlay = (
    <motion.div
      ref={overlayRootRef}
      className={cn("bm-overlay-root", contained && "bm-overlay-contained", className)}
      data-bm-overlay-kind={kind}
      initial={false}
      animate={visible ? { opacity: 1 } : { opacity: 0 }}
      transition={instant ? { duration: 0 } : motionTransition}
      onPointerDownCapture={requestBackdropClose}
      onMouseDownCapture={requestBackdropClose}
      onTouchStartCapture={requestBackdropClose}
      onClickCapture={requestBackdropClose}
    >
      {showBackdrop && (
        <motion.button
          type="button"
          data-bm-overlay-backdrop="true"
          data-bm-overlay-kind={kind}
          className={cn("bm-overlay-backdrop", backdropClassName)}
          style={backdropStyle}
          initial={false}
          animate={visible ? overlayMotion.backdrop.animate : overlayMotion.backdrop.exit}
          transition={instant ? { duration: 0 } : motionTransition}
          aria-label={closeLabel}
        />
      )}
      <Content
        {...contentProps}
        data-bm-overlay-panel="true"
        data-bm-overlay-kind={kind}
        className={cn("bm-overlay-panel", contentClassName)}
        style={contentStyle}
        initial={false}
        animate={visible ? (animate || motionState.animate) : (exit || initial || motionState.exit)}
        transition={instant ? { duration: 0 } : motionTransition}
      >
        {children}
      </Content>
    </motion.div>
  );

  if (!portal || typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
