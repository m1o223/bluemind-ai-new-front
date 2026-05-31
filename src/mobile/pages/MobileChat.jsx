import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Brain,
  History,
  Image,
  Menu,
  Mic,
  PenLine,
  Plus,
  Search,
  Send,
  User,
  X,
} from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { useApp } from "@/context/AppContext";

const MOBILE_MENU_ITEMS = [
  { label: "Previous Chats", path: "/mobile/chat", icon: History },
  { label: "Profile", path: "/mobile/profile", icon: User },
  { label: "Reminders", path: "/mobile/reminders", icon: Bell },
  { label: "Search", path: "/mobile/search", icon: Search },
  { label: "Learning", path: "/mobile/learning", icon: BookOpen },
  { label: "Smart Hub", path: "/mobile/smart-hub", icon: Brain },
];

const QUICK_ACTIONS = [
  { label: "Create Image", path: "/mobile/create-image", icon: Image },
  { label: "Write/Edit", path: "/mobile/write-edit", icon: PenLine },
  { label: "Search", path: "/mobile/search", icon: Search },
];

export default function MobileChat() {
  const navigate = useNavigate();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");

  const surfaceColor = isDark ? "#1a1a1a" : "#FAFBFC";
  const panelColor = isDark ? "#202020" : "#FFFFFF";
  const borderColor = isDark ? "border-white/[0.08]" : "border-[#E5E7EB]";
  const mutedText = isDark ? "text-[#D7D7D7]" : "text-[#64748B]";
  const textColor = isDark ? "text-white" : "text-[#111827]";

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
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
      data-testid="mobile-chat-page"
    >
      <header
        className={`flex h-14 items-center justify-between border-b px-4 ${borderColor}`}
        style={{ backgroundColor: surfaceColor }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={isDark ? "flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button type="button" onClick={() => navigate("/mobile/chat")} className="flex items-center gap-2">
          <BrandLogo showName={false} logoClassName="h-7 w-7" />
          <span className="text-base font-bold tracking-tight">BlueMind</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/mobile/search")}
          className={isDark ? "flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-11 w-11 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" />

        <div className="px-4 pb-3">
          <div className="mb-3 flex flex-col items-start gap-2">
            {QUICK_ACTIONS.map(({ label, path, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(path)}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full px-1 text-sm font-semibold transition-opacity active:opacity-70 ${
                  isDark ? "text-[#D7D7D7]" : "text-[#193B68]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <form
            className={`flex min-h-[58px] items-end gap-2 rounded-[28px] border p-2 shadow-sm ${borderColor}`}
            style={{ backgroundColor: panelColor }}
            onSubmit={(event) => event.preventDefault()}
          >
            <button
              type="button"
              className={isDark ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white active:bg-white/[0.12]" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[#193B68] active:bg-[#E1E7F0]"}
              aria-label="Attach"
            >
              <Plus className="h-5 w-5" />
            </button>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={1}
              placeholder="Ask anything..."
              className={`max-h-28 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-[16px] leading-5 outline-none placeholder:text-[#9CA3AF] ${textColor}`}
            />

            <button
              type="button"
              className={isDark ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#D7D7D7] active:bg-white/[0.08]" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#64748B] active:bg-[#EEF2F7]"}
              aria-label="Voice"
            >
              <Mic className="h-5 w-5" />
            </button>

            <button
              type="submit"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-45"
              style={{ backgroundColor: "var(--bluemind-app-color, #193B68)" }}
              disabled={!message.trim()}
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </section>

      {menuOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <aside
            className={`absolute bottom-0 left-0 top-0 flex w-[82vw] max-w-[340px] flex-col border-r shadow-2xl ${borderColor}`}
            style={{
              backgroundColor: panelColor,
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className={`flex h-16 shrink-0 items-center justify-between border-b px-4 ${borderColor}`}>
              <div className="flex items-center gap-2">
                <BrandLogo showName={false} logoClassName="h-8 w-8" />
                <span className="text-base font-bold">BlueMind</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className={isDark ? "flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/[0.08]" : "flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-[#EEF2F7]"}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              {MOBILE_MENU_ITEMS.map(({ label, path, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => goTo(path)}
                  className={isDark ? "mb-1 flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#E5E7EB] active:bg-white/[0.08]" : "mb-1 flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#111827] active:bg-[#EEF2F7]"}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}

              <div className={`mt-5 border-t pt-4 ${borderColor}`}>
                <p className={`px-3 text-xs font-semibold uppercase tracking-wide ${mutedText}`}>Previous Chats</p>
                {["Today", "Yesterday", "This Week", "Older"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => goTo("/mobile/chat")}
                    className={isDark ? "mt-2 block w-full truncate rounded-2xl px-3 py-3 text-left text-sm text-[#D7D7D7] active:bg-white/[0.08]" : "mt-2 block w-full truncate rounded-2xl px-3 py-3 text-left text-sm text-[#475569] active:bg-[#EEF2F7]"}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </nav>
          </aside>
        </div>
      )}
    </main>
  );
}
