import { useCallback, useEffect, useRef, useState } from "react";

import {
  addNativeGlassActionListener,
  setNativeIOSStudioSegmentedControl,
} from "@/mobile/nativeGlassBridge";

const DEFAULT_ITEMS = [
  { id: "image", label: "Create Image" },
  { id: "video", label: "Create Video" },
  { id: "history", label: "History" },
];

export default function IOSStudioSegmentedControl({ value, onChange, primaryColor, items = DEFAULT_ITEMS, controlID = "studio-sections", ariaLabel = "BlueMind Studio sections" }) {
  const anchorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [nativeReady, setNativeReady] = useState(true);
  onChangeRef.current = onChange;
  valueRef.current = value;

  const syncNativeControl = useCallback(async () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const shown = await setNativeIOSStudioSegmentedControl({
      visible: true,
      controlID,
      items,
      selectedIndex: Math.max(0, items.findIndex((item) => item.id === valueRef.current)),
      frame: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      primaryColor,
      ariaLabel,
    });
    setNativeReady(shown);
  }, [ariaLabel, controlID, items, primaryColor]);

  useEffect(() => {
    let listener;
    addNativeGlassActionListener((event) => {
      if (event?.action === "studioSection" && event.controlID === controlID && items.some((item) => item.id === event.value)) {
        onChangeRef.current(event.value);
      }
    }).then((handle) => { listener = handle; });
    return () => listener?.remove?.();
  }, [controlID, items]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return undefined;
    void syncNativeControl();
    const observer = new ResizeObserver(() => { void syncNativeControl(); });
    observer.observe(anchor);
    window.visualViewport?.addEventListener("resize", syncNativeControl);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", syncNativeControl);
      void setNativeIOSStudioSegmentedControl({ visible: false, controlID });
    };
  }, [controlID, syncNativeControl]);

  useEffect(() => { void syncNativeControl(); }, [syncNativeControl, value]);

  return (
    <div ref={anchorRef} className="relative h-10 w-full" aria-label={ariaLabel}>
      {!nativeReady && (
        <div className="grid h-full grid-cols-3 rounded-[10px] bg-white/[0.07] p-[2px]" role="tablist">
          <span
            className="pointer-events-none absolute bottom-[2px] top-[2px] w-[calc((100%_-_4px)/3)] rounded-[8px] bg-[var(--bm-primary)] transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${Math.max(0, items.findIndex((item) => item.id === value)) * 100}%)` }}
          />
          {items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={value === item.id} onClick={() => onChange(item.id)} className={`relative z-10 text-[12px] font-semibold ${value === item.id ? "text-white" : "text-white/60"}`}>{item.label}</button>)}
        </div>
      )}
    </div>
  );
}
