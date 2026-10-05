import { isValidElement, useEffect, useRef } from "react";
import { toast, useSonner } from "sonner";

import { showNativeIOSGlobalToast } from "@/mobile/nativeGlassBridge";

function readableText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "function") return readableText(value());
  if (Array.isArray(value)) return value.map(readableText).filter(Boolean).join(" ");
  if (isValidElement(value)) return readableText(value.props?.children);
  return "";
}

function nativeType(type) {
  if (["success", "error", "warning", "info"].includes(type)) return type;
  return "info";
}

export default function IOSGlobalToastBridge() {
  const { toasts } = useSonner();
  const forwarded = useRef(new Map());

  useEffect(() => {
    [...toasts].reverse().forEach((item) => {
      if (item.delete || item.dismiss) return;
      const title = readableText(item.title);
      const description = readableText(item.description);
      const message = [title, description].filter(Boolean).join(" — ").trim();
      if (!message) return;
      const signature = `${item.type || "info"}:${message}`;
      if (forwarded.current.get(item.id) === signature) return;
      forwarded.current.set(item.id, signature);

      const durationMs = Number(item.duration);
      void showNativeIOSGlobalToast({
        type: nativeType(item.type),
        message,
        duration: Number.isFinite(durationMs) ? durationMs / 1000 : undefined,
      });
      toast.dismiss(item.id);
    });
  }, [toasts]);

  return null;
}
