import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Mic,
  Plus,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useApp } from "@/context/AppContext";
import { QUICK_WRITE_TEMPLATES } from "@/data/writeEditTemplates";

function WriteTemplateArtwork({ template }) {
  const artwork = template.artwork || {};
  const from = artwork.from || "#193B68";
  const via = artwork.via || "#4E8EDB";
  const to = artwork.to || "#D8E8FF";

  return (
    <div
      className="relative aspect-[1.35] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${via} 54%, ${to} 100%)`,
      }}
    >
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-sm" />
      <div className="absolute right-3 top-5 h-16 w-24 rotate-[-10deg] rounded-[24px] border border-white/18 bg-white/18" />
      <div className="absolute bottom-4 left-4 h-16 w-20 rotate-[8deg] rounded-[22px] border border-white/16 bg-white/14" />
      <div className="absolute -bottom-12 right-[-18px] h-28 w-28 rounded-full bg-white/16" />
      <svg
        className="absolute inset-x-0 bottom-2 h-24 w-full text-white/75"
        viewBox="0 0 220 110"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 76C42 32 70 101 103 56C129 20 154 35 181 69C194 85 204 88 216 78"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M36 35H122"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.48"
        />
        <path
          d="M50 50H154"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.32"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
        {artwork.category || "Write/Edit"}
      </span>
    </div>
  );
}

export default function MobileWriteEdit() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [message, setMessage] = useState("");

  const surfaceColor = isDark ? "#1a1a1a" : "#FAFBFC";
  const borderColor = isDark ? "border-white/[0.08]" : "border-[#E5E7EB]";
  const mutedText = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const textColor = isDark ? "text-white" : "text-[#111827]";
  const hasComposerContent = message.trim().length > 0;

  const cards = useMemo(() => QUICK_WRITE_TEMPLATES, []);

  const closeWriteEdit = () => {
    navigate("/mobile/chat");
  };

  const clearWriteEdit = () => {
    setSelectedTemplate(null);
    setMessage("");
    navigate("/mobile/chat");
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setMessage(template.prompt || "");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!hasComposerContent) return;

    const params = new URLSearchParams({
      prompt: message.trim(),
      writeMode: "true",
    });

    navigate(`/mobile/chat?${params.toString()}`);
  };

  return (
    <main
      className={`fixed inset-0 flex flex-col overflow-hidden ${textColor}`}
      style={{
        backgroundColor: surfaceColor,
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      data-testid="mobile-write-edit-page"
    >
      <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-[210px] pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className={`text-lg font-bold tracking-tight ${textColor}`}>Write/Edit</h1>
          <button
            type="button"
            onClick={closeWriteEdit}
            className={isDark ? "flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
            aria-label="Exit write edit mode"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((template, index) => (
            <motion.button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.16) }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.985 }}
              className={`group overflow-hidden rounded-[24px] border text-left shadow-sm transition ${
                isDark
                  ? "border-white/[0.08] bg-white/[0.06] hover:border-white/[0.16] hover:bg-white/[0.1]"
                  : "border-white/75 bg-white/82 shadow-slate-200/70 hover:border-[#D8E1F4] hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
              }`}
            >
              <WriteTemplateArtwork template={template} />
              <div className="p-3">
                <span className={`block text-sm font-bold leading-5 ${textColor}`}>
                  {template.title}
                </span>
                <span className={`mt-1 line-clamp-2 block text-[11px] font-medium leading-4 ${mutedText}`}>
                  {template.description}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <form className="mx-auto w-full max-w-[430px] space-y-2" onSubmit={handleSubmit}>
          <div className="flex items-end gap-3">
            <button
              type="button"
              className={isDark ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)] active:bg-white/[0.12]" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#193B68] shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#E5E7EB] active:bg-[#EEF2F7]"}
              style={{
                backgroundColor: isDark ? "rgba(32,32,32,0.82)" : "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
              aria-label="Add attachment"
            >
              <Plus className="h-5 w-5" />
            </button>

            <div
              className={`min-w-0 flex-1 rounded-[28px] border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ${borderColor}`}
              style={{
                backgroundColor: isDark ? "rgba(32,32,32,0.82)" : "rgba(255,255,255,0.64)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <div
                className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold"
                style={{
                  color: isDark ? "#FFFFFF" : "var(--bluemind-app-color, #193B68)",
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(25,59,104,0.08)",
                }}
              >
                <span>Write/Edit</span>
                <button
                  type="button"
                  onClick={clearWriteEdit}
                  className="flex h-5 w-5 items-center justify-center rounded-full active:bg-current/10"
                  aria-label="Exit write edit mode"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {selectedTemplate && (
                <p className={`mb-2 text-xs font-semibold ${mutedText}`}>
                  {selectedTemplate.title}
                </p>
              )}

              <textarea
                ref={inputRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder="Write, paste, or choose a productivity tool..."
                className={`max-h-[180px] min-h-[86px] w-full resize-none bg-transparent text-[16px] font-medium leading-6 outline-none placeholder:text-[#9CA3AF] ${textColor}`}
                style={{ caretColor: "var(--bluemind-app-color, #193B68)" }}
              />

              <div className="mt-1 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  className={isDark ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#D7D7D7] active:bg-white/[0.08]" : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#64748B] active:bg-[#EEF2F7]"}
                  aria-label="Voice"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <button
                  type="submit"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(25,59,104,0.18)] transition-colors duration-200 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: hasComposerContent
                      ? "var(--bluemind-app-color, #193B68)"
                      : isDark ? "#4B5563" : "#9CA3AF",
                  }}
                  disabled={!hasComposerContent}
                  aria-label="Send"
                >
                  <ArrowUp className="h-[20px] w-[18px] -translate-y-[2px] stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
