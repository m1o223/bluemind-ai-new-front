import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, SlidersHorizontal } from "lucide-react";

import { addNativeGlassActionListener, setNativeIOSStudioComposer } from "@/mobile/nativeGlassBridge";

export default function IOSStudioComposer({ value, onChange, placeholder, onCustomize, primaryColor }) {
  const onChangeRef = useRef(onChange);
  const onCustomizeRef = useRef(onCustomize);
  const [nativeReady, setNativeReady] = useState(true);
  onChangeRef.current = onChange;
  onCustomizeRef.current = onCustomize;

  const syncNative = useCallback(async () => {
    const shown = await setNativeIOSStudioComposer({
      visible: true,
      text: value,
      placeholder,
      canGenerate: Boolean(value.trim()),
      primaryColor,
    });
    setNativeReady(shown);
  }, [placeholder, primaryColor, value]);

  useEffect(() => {
    let listener;
    addNativeGlassActionListener((event) => {
      if (event?.action === "studioTextChanged") onChangeRef.current(event.text || "");
      if (event?.action === "studioCustomize") onCustomizeRef.current();
      // Generate is intentionally frontend-only in this Studio iteration.
    }).then((handle) => { listener = handle; });
    return () => listener?.remove?.();
  }, []);

  useEffect(() => {
    void syncNative();
  }, [syncNative]);

  useEffect(() => {
    return () => { void setNativeIOSStudioComposer({ visible: false }); };
  }, []);

  return (
    <div className="h-[104px] w-full pointer-events-none" data-testid="ios-studio-composer-anchor">
      {!nativeReady && (
        <div className="pointer-events-auto rounded-[28px] border border-white/[0.10] bg-white/[0.06] p-3 backdrop-blur-2xl">
          <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={1} className="block max-h-36 min-h-11 w-full resize-none bg-transparent px-1 text-[16px] leading-6 text-white outline-none placeholder:text-white/35" />
          <div className="mt-2 flex items-center justify-between">
            <button type="button" onClick={onCustomize} className="inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.09] px-3 text-[13px] font-semibold text-white"><SlidersHorizontal className="h-4 w-4" />Customize</button>
            <button type="button" disabled={!value.trim()} aria-label="Generate" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bm-primary)] text-white disabled:bg-white/[0.08] disabled:text-white/35"><ArrowUp className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
