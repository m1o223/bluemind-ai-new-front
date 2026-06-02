import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useApp } from "@/context/AppContext";
import {
  QUICK_WRITE_TEMPLATES,
  WRITE_EDIT_SECTIONS,
  WRITE_UPLOAD_ACTIONS,
} from "@/data/writeEditTemplates";

export default function MobileWriteEdit() {
  const navigate = useNavigate();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const surfaceColor = isDark ? "#1a1a1a" : "#FAFBFC";
  const panelClass = isDark
    ? "border-white/[0.08] bg-white/[0.045] text-white"
    : "border-white/80 bg-white/70 text-[#111827] shadow-slate-200/70";
  const cardClass = isDark
    ? "border-white/[0.08] bg-white/[0.06] text-white active:bg-white/[0.1]"
    : "border-white/75 bg-white/82 text-[#111827] shadow-slate-200/70 active:bg-white";
  const mutedText = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const textColor = isDark ? "text-white" : "text-[#111827]";

  const openPrompt = (prompt) => {
    navigate(`/mobile/chat?prompt=${encodeURIComponent(prompt)}`);
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
      <header className={`flex h-14 items-center gap-3 border-b px-4 ${isDark ? "border-white/[0.08]" : "border-[#E5E7EB]"}`}>
        <button
          type="button"
          onClick={() => navigate("/mobile/chat")}
          className={isDark ? "flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold">Write/Edit</h1>
          <p className={`text-xs font-semibold ${mutedText}`}>Desktop tools, tuned for mobile.</p>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[28px] border p-4 shadow-sm ${panelClass}`}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Productivity workspace</h2>
              <p className={`mt-1 text-sm ${mutedText}`}>Draft, rewrite, summarize, translate, and polish text.</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#193B68] text-white">
              <FileText className="h-5 w-5" />
            </span>
          </div>

          <section className="mb-7">
            <h3 className="mb-3 px-1 text-base font-semibold">Quick templates</h3>
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUICK_WRITE_TEMPLATES.map(({ title, icon: Icon, prompt }, index) => (
                <motion.button
                  key={title}
                  type="button"
                  onClick={() => openPrompt(prompt)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.14) }}
                  whileTap={{ scale: 0.985 }}
                  className={`flex min-w-[220px] snap-start items-center gap-3 rounded-2xl border p-3 text-left transition ${cardClass}`}
                >
                  <span className={isDark ? "flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF2FF]"}>
                    <Icon className={isDark ? "h-5 w-5 text-[#D7D7D7]" : "h-5 w-5 text-[#193B68]"} />
                  </span>
                  <span className="text-sm font-semibold">{title}</span>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="mb-7">
            <h3 className="mb-3 px-1 text-base font-semibold">Smart suggestions</h3>
            <div className="grid grid-cols-1 gap-3">
              {WRITE_UPLOAD_ACTIONS.map(({ title, icon: Icon, prompt }, index) => (
                <motion.button
                  key={title}
                  type="button"
                  onClick={() => openPrompt(prompt)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.14) }}
                  whileTap={{ scale: 0.985 }}
                  className={`rounded-2xl border p-4 text-left transition ${cardClass}`}
                >
                  <Icon className={isDark ? "mb-3 h-5 w-5 text-[#D7D7D7]" : "mb-3 h-5 w-5 text-[#193B68]"} />
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className={`mt-1 block text-xs leading-5 ${mutedText}`}>Upload or paste content for smarter context.</span>
                </motion.button>
              ))}
            </div>
          </section>

          <div className="space-y-7">
            {WRITE_EDIT_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              return (
                <section key={section.title}>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <SectionIcon className={isDark ? "h-5 w-5 text-[#D7D7D7]" : "h-5 w-5 text-[#193B68]"} />
                    <h3 className="text-base font-semibold">{section.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {section.items.map(({ title, description, prompt }, index) => (
                      <motion.button
                        key={`${section.title}-${title}-${index}`}
                        type="button"
                        onClick={() => openPrompt(prompt)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.018, 0.12) }}
                        whileTap={{ scale: 0.985 }}
                        className={`group min-h-[132px] rounded-[26px] border p-4 text-left shadow-sm transition ${cardClass}`}
                      >
                        <div className={isDark ? "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08]" : "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]"}>
                          <SectionIcon className={isDark ? "h-5 w-5 text-[#D7D7D7]" : "h-5 w-5 text-[#193B68]"} />
                        </div>
                        <span className="block text-sm font-semibold">{title}</span>
                        <span className={`mt-2 block text-xs leading-5 ${mutedText}`}>{description}</span>
                      </motion.button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </motion.div>
      </section>
    </main>
  );
}
