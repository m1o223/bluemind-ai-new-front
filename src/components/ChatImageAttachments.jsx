import { useState } from "react";

import { cn } from "@/lib/utils";
import { getImageUrl } from "@/services/imageService";

function isAbsoluteUrl(url) {
  return /^(https?:|blob:|data:)/i.test(String(url || ""));
}

export function resolveAttachmentPreviewUrl(attachment) {
  if (!attachment) return "";
  if (attachment.previewUrl) return attachment.previewUrl;
  if (isAbsoluteUrl(attachment.url)) return attachment.url;
  if (attachment.thumbnail) return attachment.thumbnail;
  if (attachment.src) return attachment.src;
  if (attachment.imageId) return getImageUrl(attachment.imageId);
  if (attachment.id) return getImageUrl(attachment.id);
  return attachment.url || "";
}

function ChatImage({ attachment, isDark, onExpand, imageClassName, buttonClassName }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = resolveAttachmentPreviewUrl(attachment);

  if (!src || failed) return null;

  return (
    <button
      type="button"
      onClick={() => onExpand?.({ src, name: attachment.name || attachment.prompt || "image" })}
      className={cn(
        "group relative block overflow-hidden rounded-3xl text-left shadow-sm transition-transform hover:scale-[1.01]",
        isDark ? "border border-white/10 bg-white/5" : "border border-[var(--bm-border)] bg-white",
        buttonClassName,
      )}
      aria-label={attachment.name || attachment.fileName || "Uploaded image"}
    >
      {!loaded && (
        <div className={cn("absolute inset-0 animate-pulse", isDark ? "bg-white/10" : "bg-[var(--bm-hover-bg)]")} />
      )}
      <img
        src={src}
        alt={attachment.name || "attachment"}
        className={cn("max-h-[360px] w-full max-w-sm object-cover", imageClassName)}
        draggable="false"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true);
          setFailed(true);
        }}
      />
    </button>
  );
}

export default function ChatImageAttachments({
  attachments = [],
  hasText = false,
  isDark = false,
  onExpand,
  className,
  imageClassName,
  buttonClassName,
  testId = "chat-message-attachments",
}) {
  const visibleAttachments = attachments.filter((attachment) => resolveAttachmentPreviewUrl(attachment));

  if (!visibleAttachments.length) return null;

  return (
    <div
      className={cn("grid max-w-sm grid-cols-1 gap-3", hasText ? "mb-4" : "mb-0", className)}
      data-testid={testId}
    >
      {visibleAttachments.map((attachment) => (
        <ChatImage
          key={attachment.id || attachment.imageId || attachment.previewUrl}
          attachment={attachment}
          isDark={isDark}
          onExpand={onExpand}
          imageClassName={imageClassName}
          buttonClassName={buttonClassName}
        />
      ))}
    </div>
  );
}
