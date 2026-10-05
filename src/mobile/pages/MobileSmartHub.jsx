import { motion } from "framer-motion";
import {
  Bell, BookOpen, CalendarDays, ChevronRight, ClipboardCheck, FolderKanban,
  GraduationCap, Languages, Layers3, ListChecks, MessageSquare, Mic2,
  PenLine, Search, SlidersHorizontal, Sparkles, WandSparkles, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { motionTokens } from "@/lib/interactions";

const darkGlass = "border-white/[0.075] bg-[rgba(38,38,38,0.38)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_34px_rgba(0,0,0,0.20)] backdrop-blur-[26px]";
const lightGlass = "border-black/[0.07] bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_12px_30px_rgba(15,23,42,0.07)] backdrop-blur-[22px]";

function SectionHeader({ eyebrow, title, isDark }) {
  return (
    <div className="mb-3">
      {eyebrow && <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", isDark ? "text-white/42" : "text-[var(--bm-text-muted)]")}>{eyebrow}</p>}
      <h2 className={cn("mt-1 text-[19px] font-semibold tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{title}</h2>
    </div>
  );
}

function QuickAccessCard({ item, index, isDark, onOpen }) {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(item.path)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...motionTokens.quickTransition, delay: index * 0.025 }}
      className={cn("flex min-h-[126px] min-w-0 flex-col items-start rounded-[22px] border p-4 text-start", isDark ? darkGlass : lightGlass)}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[var(--bm-primary)] text-white"><Icon className="h-[19px] w-[19px]" /></span>
      <span className={cn("mt-3 text-[15px] font-semibold", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{item.title}</span>
      <span className={cn("mt-1 line-clamp-2 text-[12px] font-medium leading-[17px]", isDark ? "text-white/48" : "text-[var(--bm-text-secondary)]")}>{item.description}</span>
    </motion.button>
  );
}

export default function MobileSmartHub() {
  const navigate = useNavigate();
  const { resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const isRTL = /^(ar|fa|he|ur|ku)/i.test(uiLanguage);

  const quickAccess = [
    { icon: MessageSquare, title: "Chat", description: "Talk with BlueMind AI", path: "/mobile/chat" },
    { icon: Bell, title: "Reminders", description: "Manage important reminders", path: "/mobile/reminders" },
    { icon: CalendarDays, title: "Schedule", description: "Plan your week clearly", path: "/mobile/schedule" },
    { icon: PenLine, title: "Writing", description: "Draft, rewrite and polish", path: "/mobile/write-edit" },
    { icon: FolderKanban, title: "Projects", description: "Organize ongoing work", path: "/mobile/projects" },
  ];
  const learningHighlights = [
    { icon: GraduationCap, label: "AI Teacher" }, { icon: BookOpen, label: "Interactive Lessons" },
    { icon: ClipboardCheck, label: "Smart Exams" }, { icon: Languages, label: "Languages" },
    { icon: ListChecks, label: "Study Plans" }, { icon: Layers3, label: "Flashcards" },
  ];
  const comingNext = [
    { icon: Zap, label: "Faster AI" }, { icon: Mic2, label: "Better Voice" },
    { icon: Search, label: "Smarter Search" }, { icon: CalendarDays, label: "Better Planning" },
    { icon: WandSparkles, label: "New AI Tools" }, { icon: SlidersHorizontal, label: "Personalization" },
  ];

  return (
    <main className={cn("min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-[var(--bm-bg-app)] px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))]", isDark ? "text-white" : "text-[var(--bm-text-primary)]")} dir={isRTL ? "rtl" : "ltr"} data-testid="mobile-smart-hub">
      <header className="mx-auto w-full max-w-md">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">Smart Hub</h1>
        <p className={cn("mt-1.5 max-w-[340px] text-[14px] font-medium leading-5", isDark ? "text-white/48" : "text-[var(--bm-text-secondary)]")}>Your intelligent workspace for learning, planning and productivity.</p>
      </header>

      <div className="mx-auto w-full max-w-md">
        <section className="mt-7">
          <SectionHeader eyebrow="BlueMind" title="Quick Access" isDark={isDark} />
          <div className="grid w-full grid-cols-2 gap-3">
            {quickAccess.map((item, index) => <QuickAccessCard key={item.title} item={item} index={index} isDark={isDark} onOpen={navigate} />)}
          </div>
        </section>

        <section className="mt-9">
          <SectionHeader eyebrow="BlueMind 5.0" title="Coming Soon" isDark={isDark} />
          <article className={cn("rounded-[26px] border p-4", isDark ? darkGlass : lightGlass)}>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-[var(--bm-primary)] text-white"><Sparkles className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="text-[18px] font-semibold tracking-tight">BlueMind 5.0</h3>
                <p className={cn("mt-1.5 text-[13px] font-medium leading-5", isDark ? "text-white/50" : "text-[var(--bm-text-secondary)]")}>Learning is coming to BlueMind with AI-guided lessons, exams, languages, flashcards and personalized study plans.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {learningHighlights.map(({ icon: Icon, label }) => (
                <div key={label} className={cn("flex min-w-0 items-center gap-2 rounded-[16px] border px-3 py-2.5", isDark ? "border-white/[0.065] bg-white/[0.035]" : "border-black/[0.055] bg-black/[0.022]")}>
                  <Icon className="h-4 w-4 shrink-0 text-[var(--bm-primary)]" /><span className="min-w-0 text-[12px] font-medium leading-4">{label}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => navigate("/mobile/learning")} className="mt-4 flex min-h-11 w-full items-center justify-between rounded-[16px] bg-[var(--bm-primary)] px-4 text-[13px] font-semibold text-white">
              <span>Explore what&apos;s coming</span><ChevronRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
            </button>
          </article>
        </section>

        <section className="mt-9">
          <SectionHeader eyebrow="Next" title="Coming Next" isDark={isDark} />
          <div className="grid grid-cols-2 gap-2.5">
            {comingNext.map(({ icon: Icon, label }) => (
              <div key={label} className={cn("flex min-h-[58px] min-w-0 items-center gap-2.5 rounded-[18px] border px-3.5 py-3", isDark ? darkGlass : lightGlass)}>
                <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--bm-primary)]" /><span className="min-w-0 text-[13px] font-medium leading-4">{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
