import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, FolderKanban, Image, MessageSquare, Search, Send, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import MessageResponse from "@/components/MessageResponse";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { iconClasses, interactionClasses } from "@/lib/interactions";
import { getApiErrorMessage } from "@/services/api";
import { streamChatMessage } from "@/services/chatService";
import { isNativeIOSApp } from "@/capacitorRuntime";
import { IOS_SEARCH_CATEGORIES, searchIOSCatalog } from "@/mobile/iosSearchCatalog";
import IOSNativeGlassButton from "@/mobile/components/IOSNativeGlassButton";

const SEARCH_SUGGESTIONS = [
  "Latest AI tools",
  "Research a product",
  "Compare travel options",
  "Find learning resources",
];

const mobileSearchGlassSurfaceClass = "border-white/[0.075] bg-[rgba(78,78,78,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-[32px]";

const SEARCH_RESULT_ICONS = {
  chats: MessageSquare,
  images: Image,
  documents: FileText,
  projects: FolderKanban,
};

function IOSMobileSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const inputRef = useRef(null);
  const requestRef = useRef(0);
  const savedState = (() => { try { return JSON.parse(sessionStorage.getItem("bluemind-universal-search") || "{}"); } catch { return {}; } })();
  const [query, setQuery] = useState(savedState.query || "");
  const [category, setCategory] = useState(savedState.category || "all");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const originRef = useRef(location.state?.from || "/mobile/chat");

  useEffect(() => {
    sessionStorage.setItem("bluemind-universal-search", JSON.stringify({ query, category }));
  }, [category, query]);

  useEffect(() => {
    const normalized = query.trim();
    const requestId = ++requestRef.current;
    if (!normalized) {
      setResults([]);
      setIsSearching(false);
      return undefined;
    }

    setIsSearching(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const nextResults = await searchIOSCatalog(normalized, category);
        if (requestRef.current !== requestId) return;
        setResults(nextResults);
      } catch (requestError) {
        if (requestRef.current !== requestId) return;
        setResults([]);
        setError(getApiErrorMessage(requestError, "Search is unavailable. Please try again."));
      } finally {
        if (requestRef.current === requestId) setIsSearching(false);
      }
    }, 240);

    return () => window.clearTimeout(timer);
  }, [category, query]);

  const openResult = (result) => {
    if (result.route) navigate(result.route, { state: { searchReturn: { query, category } } });
  };

  const exitSearch = () => {
    inputRef.current?.blur();
    sessionStorage.removeItem("bluemind-universal-search");
    navigate(originRef.current, { replace: true });
  };

  return (
    <main
      className={cn("fixed inset-0 flex min-w-0 flex-col overflow-hidden", isDark ? "bg-black text-white" : "bg-white text-[var(--bm-text-primary)]")}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="ios-search-page"
    >
      <header className="shrink-0 px-4 pb-3 pt-2">
        <div className="mb-3 flex h-11 items-center justify-between">
          <IOSNativeGlassButton id="universal-search-back" symbol="arrow.left" label="Back" onClick={() => navigate(-1)} className="bm-mobile-glass-control" isDark={isDark}><ArrowLeft className="h-5 w-5 stroke-[2.35]" /></IOSNativeGlassButton>
          <h1 className="text-[17px] font-bold tracking-tight">Search</h1>
          <IOSNativeGlassButton id="universal-search-close" symbol="xmark" label="Close Search" onClick={exitSearch} className="bm-mobile-glass-control" isDark={isDark}><X className="h-5 w-5 stroke-[2.35]" /></IOSNativeGlassButton>
        </div>

        <label className={cn(
          "flex h-12 w-full min-w-0 items-center gap-2.5 rounded-[17px] border px-3.5 transition-colors",
          isDark ? "border-white/[0.08] bg-[#191919] focus-within:border-white/20" : "border-black/[0.07] bg-[#F1F3F5] focus-within:border-black/15",
        )}>
          <Search className="h-[18px] w-[18px] shrink-0 text-[var(--bm-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            enterKeyHint="search"
            autoCorrect="off"
            placeholder="Search BlueMind…"
            dir="auto"
            className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-[var(--bm-text-muted)] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-current/10 active:scale-90" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Search categories">
          {IOS_SEARCH_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              onClick={() => setCategory(item.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-transform active:scale-95",
                category === item.id
                  ? "bg-[var(--bm-primary)] text-white"
                  : isDark ? "bg-white/[0.07] text-white/72" : "bg-black/[0.055] text-[var(--bm-text-secondary)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6" aria-live="polite">
        {!query.trim() && (
          <div className="flex min-h-[44vh] flex-col items-center justify-center px-8 text-center">
            <Search className="mb-4 h-9 w-9 text-[var(--bm-text-muted)]" />
            <h2 className="text-lg font-bold">Find anything in BlueMind</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--bm-text-secondary)]">Search conversations and images. Documents and Projects are ready to join the same index as those libraries become available.</p>
          </div>
        )}

        {query.trim() && isSearching && <div className="flex justify-center py-12"><BlueMindLoadingDots /></div>}

        {query.trim() && !isSearching && error && <div className="py-14 text-center text-sm font-semibold text-[var(--bm-text-secondary)]">Search is unavailable. Please try again.</div>}

        {query.trim() && !isSearching && !error && results.length === 0 && (
          <div className="py-16 text-center"><p className="text-base font-bold">No results found</p><p className="mt-2 text-sm font-medium text-[var(--bm-text-secondary)]">Try another word or search another category.</p></div>
        )}

        {!isSearching && results.map((result) => {
          const ResultIcon = SEARCH_RESULT_ICONS[result.category] || Search;
          return (
            <button key={result.id} type="button" onClick={() => openResult(result)} className={cn("flex w-full min-w-0 items-start gap-3 border-b py-4 text-left active:opacity-65", isDark ? "border-white/[0.07]" : "border-black/[0.06]")}>
              <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px]", isDark ? "bg-white/[0.07]" : "bg-black/[0.05]")}>{result.thumbnail ? <img src={result.thumbnail} alt="" className="h-full w-full object-cover" /> : <ResultIcon className="h-[19px] w-[19px]" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{result.title}</span>
                <span className="mt-1 block line-clamp-2 text-[13px] font-medium leading-5 text-[var(--bm-text-secondary)]">{result.detail}</span>
                <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--bm-text-muted)]">{result.category}</span>
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}

function LegacyMobileSearch() {
  const navigate = useNavigate();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const surfaceColor = isDark ? "var(--bm-bg-app)" : "var(--bm-bg-app)";
  const textColor = isDark ? "text-white" : "text-[var(--bm-text-primary)]";
  const borderColor = isDark ? "border-white/[0.08]" : "border-[var(--bm-border)]";
  const mutedText = isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]";
  const glassSurface = isDark
    ? mobileSearchGlassSurfaceClass
    : "border-[var(--bm-border)] bg-[var(--bm-bg-card)] shadow-[var(--bm-light-glass-shadow-soft)] backdrop-blur-[24px]";

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
          className={cn("bm-mobile-glass-control", interactionClasses.iconButton)}
          aria-label="Back"
        >
          <ArrowLeft className={iconClasses.button} />
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
          className={cn("mb-4 overflow-hidden rounded-[30px] border p-4", glassSurface)}
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
                    ? `snap-start whitespace-nowrap rounded-full border border-white/[0.07] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-[var(--bm-text-secondary)] backdrop-blur-[22px] ${interactionClasses.menuItem}`
                    : `snap-start whitespace-nowrap rounded-full border border-[var(--bm-border)] bg-[var(--bm-bg-card)] px-4 py-2 text-sm font-semibold text-[var(--bm-text-secondary)] shadow-[var(--bm-light-glass-shadow-soft)] backdrop-blur-[22px] ${interactionClasses.menuItem}`
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
            className={cn("rounded-[24px] border p-4 text-sm font-medium leading-6", glassSurface)}
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
        <div className={cn("flex min-h-[58px] items-end gap-2 rounded-[28px] border py-2 pl-4 pr-2", glassSurface)}>
          <Search className={`mb-3 h-5 w-5 shrink-0 ${mutedText}`} />
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
            className={`bm-mobile-glass-control ${interactionClasses.iconButton}`}
            aria-label="Send search"
          >
            {isSearching ? <BlueMindLoadingDots /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function MobileSearch() {
  return isNativeIOSApp() ? <IOSMobileSearch /> : <LegacyMobileSearch />;
}
