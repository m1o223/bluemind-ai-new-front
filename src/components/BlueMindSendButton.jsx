import { motion } from "framer-motion";
import { ArrowUp, Square } from "lucide-react";

import { cn } from "@/lib/utils";

export default function BlueMindSendButton({
  isBusy = false,
  canSend = false,
  onClick,
  appColor = "var(--bm-primary)",
  sendLabel = "Send",
  stopLabel = "Stop",
  compact = false,
  className,
}) {
  const isActive = isBusy || canSend;
  const mobileInactiveStyle = compact && !isActive ? {
    backgroundColor: "rgba(62,62,62,0.16)",
    borderColor: "rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.5)",
    backgroundImage: "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.036) 44%, rgba(255,255,255,0.018))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24), inset 1px 0 0 rgba(255,255,255,0.09), inset -1px 0 0 rgba(255,255,255,0.065), inset 0 -16px 30px rgba(255,255,255,0.024), 0 14px 38px rgba(0,0,0,0.3)",
    backdropFilter: "blur(40px) saturate(1.32)",
    WebkitBackdropFilter: "blur(40px) saturate(1.32)",
  } : undefined;
  const mobileActiveStyle = compact && isActive ? {
    backgroundColor: "rgba(37,99,235,0.34)",
    borderColor: "rgba(255,255,255,0.16)",
    backgroundImage: "linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05) 34%, rgba(37,99,235,0.42))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), inset 1px 0 0 rgba(255,255,255,0.1), inset -1px 0 0 rgba(255,255,255,0.07), inset 0 -16px 30px rgba(255,255,255,0.03), 0 14px 38px rgba(37,99,235,0.22), 0 14px 38px rgba(0,0,0,0.3)",
    backdropFilter: "blur(40px) saturate(1.35)",
    WebkitBackdropFilter: "blur(40px) saturate(1.35)",
  } : undefined;

  return (
    <motion.button
      type={isBusy ? "button" : "submit"}
      onClick={onClick}
      disabled={!isBusy && !canSend}
      whileTap={!isBusy && canSend ? { scale: compact ? 0.92 : 0.93 } : undefined}
      transition={{ duration: compact ? 0.18 : 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed",
        compact
          ? "h-10 w-10 border"
          : "h-11 w-11 text-white shadow-[0_12px_28px_rgba(25,59,104,0.22)] disabled:opacity-45",
        isActive ? "text-white hover:opacity-95" : compact ? "" : "",
        className,
      )}
      style={mobileInactiveStyle || mobileActiveStyle || { backgroundColor: isActive ? appColor : "var(--bm-text-muted)" }}
      aria-label={isBusy ? stopLabel : sendLabel}
    >
      {isBusy ? (
        <Square className={compact ? "h-3.5 w-3.5 fill-current" : "h-4 w-4 fill-current"} />
      ) : (
        <ArrowUp className={compact ? "h-[19px] w-[18px] -translate-y-[1px] scale-y-[1.06] stroke-[3]" : "h-5 w-5 -translate-y-[1px] stroke-[2.7]"} />
      )}
    </motion.button>
  );
}
