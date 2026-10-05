import { useCallback, useEffect, useId, useRef, useState } from "react";

import { isNativeIOSApp } from "@/capacitorRuntime";
import {
  addNativeGlassActionListener,
  prepareNativeGlassExperiment,
  setNativeActionControls,
} from "@/mobile/nativeGlassBridge";
import { cn } from "@/lib/utils";

const controls = new Map();
const callbacks = new Map();
let actionListenerPromise;
let nativeReadyPromise;
let syncFrame = 0;

function ensureNativeReady() {
  if (!nativeReadyPromise) nativeReadyPromise = prepareNativeGlassExperiment();
  return nativeReadyPromise;
}

function ensureActionListener() {
  if (!actionListenerPromise) {
    actionListenerPromise = addNativeGlassActionListener((event) => {
      if (event?.action !== "nativeControl") return;
      callbacks.get(event.text)?.();
    });
  }
  return actionListenerPromise;
}

function scheduleNativeSync() {
  cancelAnimationFrame(syncFrame);
  syncFrame = requestAnimationFrame(() => {
    const values = [...controls.values()];
    setNativeActionControls(values, { isDark: values.every((control) => control.isDark !== false) });
  });
}

export default function IOSNativeGlassButton({
  id,
  symbol,
  label,
  onClick,
  className,
  children,
  isDark = true,
  disabled = false,
  ...buttonProps
}) {
  const generatedID = useId().replaceAll(":", "");
  const controlID = id || `native-glass-${generatedID}`;
  const anchorRef = useRef(null);
  const callbackRef = useRef(onClick);
  const nativeIOS = isNativeIOSApp();
  const [nativeState, setNativeState] = useState(nativeIOS ? "pending" : "fallback");
  const nativeEnabled = nativeState === "enabled";

  callbackRef.current = onClick;

  const measure = useCallback(() => {
    const element = anchorRef.current;
    if (!element || disabled) {
      controls.delete(controlID);
      callbacks.delete(controlID);
      scheduleNativeSync();
      return;
    }

    const rect = element.getBoundingClientRect();
    controls.set(controlID, {
      id: controlID,
      symbol,
      label,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      isDark,
    });
    callbacks.set(controlID, () => callbackRef.current?.({
      currentTarget: anchorRef.current,
      target: anchorRef.current,
      preventDefault() {},
      stopPropagation() {},
    }));
    scheduleNativeSync();
  }, [controlID, disabled, isDark, label, symbol]);

  useEffect(() => {
    if (!nativeIOS) return undefined;
    let cancelled = false;
    Promise.all([ensureNativeReady(), ensureActionListener()]).then(([supported]) => {
      if (cancelled) return;
      setNativeState(supported ? "enabled" : "fallback");
    });
    return () => { cancelled = true; };
  }, [nativeIOS]);

  useEffect(() => {
    if (!nativeEnabled) return undefined;
    measure();
    const observer = new ResizeObserver(measure);
    if (anchorRef.current) observer.observe(anchorRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
      controls.delete(controlID);
      callbacks.delete(controlID);
      scheduleNativeSync();
    };
  }, [controlID, measure, nativeEnabled]);

  if (nativeState !== "fallback") {
    return (
      <span
        ref={anchorRef}
        className={cn(className, "bm-native-glass-control-placeholder")}
        aria-hidden="true"
      >
        {children}
      </span>
    );
  }

  return (
    <button
      {...buttonProps}
      ref={anchorRef}
      type={buttonProps.type || "button"}
      className={className}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
