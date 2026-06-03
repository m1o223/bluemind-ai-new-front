import { useCallback, useEffect, useRef, useState } from "react";

function getScrollMetrics(node) {
  if (!node) {
    return {
      distanceFromBottom: 0,
      isNearBottom: true,
    };
  }

  const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;

  return {
    distanceFromBottom,
    isNearBottom: distanceFromBottom < 96,
  };
}

export default function useChatAutoScroll({ watch = [], isStreaming = false } = {}) {
  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const shouldAutoFollowRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    shouldAutoFollowRef.current = true;
    setShowScrollToBottom(false);

    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior, block: "end" });
      return;
    }

    const node = scrollRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const { isNearBottom } = getScrollMetrics(node);
    shouldAutoFollowRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    handleScroll();
    node.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      node.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (shouldAutoFollowRef.current) {
      scrollToBottom(isStreaming ? "auto" : "smooth");
    } else {
      setShowScrollToBottom(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch);

  return {
    scrollRef,
    endRef,
    showScrollToBottom,
    scrollToBottom,
  };
}
