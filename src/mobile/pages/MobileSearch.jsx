import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MessageResponse from "@/components/MessageResponse";
import { useApp } from "@/context/AppContext";
import { interactionClasses } from "@/lib/interactions";
import { getApiErrorMessage } from "@/services/api";
import { streamChatMessage } from "@/services/chatService";

const SEARCH_SUGGESTIONS = [
  "Latest AI tools",
  "Research a product",
  "Compare travel options",
  "Find learning resources",
];

export default function MobileSearch() {
  const navigate = useNavigate();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const surfaceColor = isDark ? "var(--bm-bg-app)" : "var(--bm-bg-app)";
  const panelColor = isDark ? "var(--bm-bg-card)" : "#FFFFFF";
  const textColor = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const borderColor = isDark ? "border-white/[0.08]" : "border-[var(--bm-border)]";
  const mutedText = isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const currentQuery = query.trim();
    if (!currentQuery || isSearching) return;

    setAnswer("");
    setError("");
    setIsSearching(true);

    try {
      await streamChatMessage({
        message: currentQuery,
        mode: "smart",
        metadata: {
          source: "search",
          chatMode: "web_search",
          mode: "smart",
          responseMode: "smart",
        },
        onDelta: (payload) => {
          if (!payload?.token) return;
          setAnswer((current) => `${current}${payload.token}`);
        },
        onComplete: (payload) => {
          setAnswer((current) => current || payload?.message?.content || "");
        },
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Search request failed"));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main
      className={`fixed inset-0 flex flex-col ${textColor}`}
      style={{
        backgroundColor: surfaceColor,
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      data-testid="mobile-search-page"
    >
      <header className={`flex h-14 items-center gap-3 border-b px-4 ${borderColor}`}>
        <button
          type="button"
          onClick={() => navigate("/mobile/chat")}
          className={isDark ? `flex h-11 w-11 items-center justify-center rounded-full text-white ${interactionClasses.iconButton}` : `flex h-11 w-11 items-center justify-center rounded-full text-[var(--bm-text-primary)] ${interactionClasses.iconButton}`}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold">Search</h1>
          <p className={`text-xs font-semibold ${mutedText}`}>Ask BlueMind to search with backend AI.</p>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 overflow-hidden rounded-[30px] border p-4 shadow-sm ${
            isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-white/80 bg-white/70 shadow-slate-200/70"
          }`}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Discover with BlueMind</h2>
            <p className={`mt-1 text-sm ${mutedText}`}>Use the same backend AI search flow with a compact mobile surface.</p>
          </div>
          <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SEARCH_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuery(item)}
                className={
                  isDark
                    ? `snap-start whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-[var(--bm-text-secondary)] ${interactionClasses.menuItem}`
                    : `snap-start whitespace-nowrap rounded-full border border-black/[0.05] bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--bm-text-secondary)] shadow-sm ${interactionClasses.menuItem}`
                }
              >
                {item}
              </button>
            ))}
          </div>
        </motion.div>

        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[24px] border p-4 text-sm font-medium leading-6 ${borderColor}`}
            style={{ backgroundColor: panelColor }}
          >
            <MessageResponse
              message={{ role: "ai", content: answer, metadata: { chatMode: "web_search", responseMode: "smart" } }}
              previousUserContent={query}
              className="text-[15px] leading-[1.85]"
            />
          </motion.div>
        )}
        {error && (
          <div className={isDark ? "rounded-[24px] bg-red-500/10 p-4 text-sm font-bold text-red-300" : "rounded-[24px] bg-red-50 p-4 text-sm font-bold text-red-600"}>
            {error}
          </div>
        )}
      </section>

      <form className="px-4 pb-3" onSubmit={handleSubmit}>
        <div className={`flex min-h-[58px] items-end gap-2 rounded-[28px] border p-2 shadow-sm ${borderColor}`} style={{ backgroundColor: panelColor }}>
          <Search className={`mb-3 ml-2 h-5 w-5 shrink-0 ${mutedText}`} />
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={1}
            placeholder="Search anything..."
            className={`bm-composer-input max-h-28 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-[16px] leading-5 outline-none placeholder:text-[var(--bm-text-muted)] ${textColor}`}
          />
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-45 ${interactionClasses.iconButton}`}
            style={{ backgroundColor: "var(--bluemind-app-color, var(--bm-primary))" }}
            aria-label="Send search"
          >
            {isSearching ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
