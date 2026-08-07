import { motion } from "framer-motion";
import { ArrowUp, LoaderCircle, Square } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export default function BlueMindSendButton({
  isBusy = false,
  isSubmitting = false,
  canSend = false,
  onClick,
  appColor = "var(--bm-primary)",
  sendLabel = "Send",
  stopLabel = "Stop",
  compact = false,
  className,
}) {
  const [showSubmittingSpinner, setShowSubmittingSpinner] = useState(false);
  const isActive = isBusy || isSubmitting || canSend;
  const shouldShowSubmittingSpinner = !isBusy && isSubmitting && showSubmittingSpinner;

  useEffect(() => {
    if (!isSubmitting) {
      setShowSubmittingSpinner(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowSubmittingSpinner(true);
    }, 380);

    return () => window.clearTimeout(timer);
  }, [isSubmitting]);

  return (
    <motion.button
      type={isBusy ? "button" : "submit"}
      onClick={onClick}
      disabled={!isBusy && !isSubmitting && !canSend}
      whileTap={!isBusy && !isSubmitting && canSend ? { scale: compact ? 0.92 : 0.93 } : undefined}
      transition={{ duration: compact ? 0.18 : 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed",
        compact
          ? "bm-mobile-glass-control"
          : "h-11 w-11 text-white shadow-[0_12px_28px_rgba(25,59,104,0.22)] disabled:opacity-45",
        isActive ? "text-white hover:opacity-95" : compact ? "" : "",
        className,
      )}
      style={compact ? undefined : { backgroundColor: isActive ? appColor : "var(--bm-text-muted)" }}
      data-send-state={shouldShowSubmittingSpinner ? "submitting" : isBusy ? "stopping" : isSubmitting ? "sending" : canSend ? "ready" : "disabled"}
      aria-label={isBusy ? stopLabel : isSubmitting ? "Sending" : sendLabel}
    >
      {shouldShowSubmittingSpinner ? (
        <LoaderCircle className={compact ? "bm-send-spinner" : "h-4 w-4 animate-spin"} />
      ) : isBusy ? (
        <Square className={compact ? "bm-send-stop-icon fill-current" : "h-3 w-3 fill-current"} />
      ) : (
        <ArrowUp className={compact ? "bm-send-arrow-icon -translate-y-[1px] scale-y-[1.06]" : "h-5 w-5 -translate-y-[1px] stroke-[2.7]"} />
      )}
    </motion.button>
  );
}
