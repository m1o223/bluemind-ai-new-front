import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Search, Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import languages from "@/data/languages";
import { useApp } from "@/context/AppContext";

export default function LanguageSelector({ currentLang, onSelect, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const modalRef = useRef(null);
  const searchRef = useRef(null);
  const { t } = useApp();

  const currentLanguage = languages.find((l) => l.code === currentLang) || languages.find((l) => l.code === "en");

  const filtered = languages.filter((lang) => {
    const q = search.toLowerCase();
    return lang.name.toLowerCase().includes(q) || lang.native.toLowerCase().includes(q) || lang.code.includes(q);
  });

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setIsOpen(false); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 cursor-pointer",
          isDark ? "bg-[var(--bm-bg-app)] border-[var(--bm-bg-elevated)] hover:border-[var(--bm-border-strong)]" : "bg-[var(--bm-bg-elevated)] border-[var(--bm-border)] hover:border-[var(--bm-border-strong)]"
        )}
        data-testid="language-selector-trigger"
      >
        <div className="flex items-center gap-3">
          <Globe className={cn("w-4 h-4", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")} />
          <div className="text-left">
            <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{currentLanguage.native}</p>
            <p className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{currentLanguage.name}</p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")} />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "relative w-full max-w-md max-h-[70vh] rounded-2xl border shadow-xl flex flex-col overflow-hidden z-10",
                isDark ? "bg-[var(--bm-bg-card)] border-[var(--bm-bg-elevated)]" : "bg-white border-[var(--bm-border)]"
              )}
              data-testid="language-modal"
            >
              {/* Header */}
              <div className={cn("flex items-center justify-between px-5 py-4 border-b", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
                <h3 className={cn("text-base font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{t("selectLanguage")}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer", isDark ? "text-[var(--bm-text-muted)] hover:text-white hover:bg-[var(--bm-bg-elevated)]" : "text-[var(--bm-text-muted)] hover:text-[var(--bm-text-primary)] hover:bg-[var(--bm-hover-bg)]")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className={cn("px-5 py-3 border-b", isDark ? "border-[var(--bm-bg-elevated)]" : "border-[var(--bm-border)]")}>
                <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border", isDark ? "bg-[var(--bm-bg-app)] border-[var(--bm-bg-elevated)]" : "bg-[var(--bm-bg-elevated)] border-[var(--bm-border)]")}>
                  <Search className={cn("w-4 h-4 flex-shrink-0", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")} />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchLanguages")}
                    className={cn("flex-1 bg-transparent outline-none text-sm", isDark ? "text-white placeholder-[var(--bm-text-muted)]" : "text-[var(--bm-text-primary)] placeholder-[var(--bm-text-muted)]")}
                    data-testid="language-search-input"
                  />
                </div>
              </div>

              {/* Language List */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {filtered.length === 0 ? (
                  <div className="text-center py-8">
                    <p className={cn("text-sm", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{t("noLanguagesFound")}</p>
                  </div>
                ) : (
                  filtered.map((lang) => {
                    const isSelected = lang.code === currentLang;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => { onSelect(lang.code); setIsOpen(false); setSearch(""); }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 cursor-pointer mb-0.5",
                          isSelected
                            ? (isDark ? "bg-[var(--bm-primary)]/30 text-white" : "bg-[var(--bm-active-bg)] text-[var(--bm-primary)]")
                            : (isDark ? "hover:bg-[var(--bm-bg-elevated)] text-[var(--bm-text-secondary)]" : "hover:bg-[var(--bm-bg-elevated)] text-[var(--bm-text-primary)]")
                        )}
                        data-testid={`lang-option-${lang.code}`}
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{lang.native}</span>
                          <span className={cn("text-xs", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-muted)]")}>{lang.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[var(--bm-primary)]" />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
