import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  MessageSquare,
  Megaphone,
  PenLine,
  Sparkles,
  Tags,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BrandLogo from "@/components/BrandLogo";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { iconClasses, interactionClasses, motionTokens, spacingClasses, typeClasses } from "@/lib/interactions";

function getTextOnColor(hex) {
  const normalized = String(hex || "var(--bm-primary)").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(value, 16);
  const red = ((number >> 16) & 255) / 255;
  const green = ((number >> 8) & 255) / 255;
  const blue = (number & 255) / 255;
  const luminance = [red, green, blue]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return luminance > 0.52 ? "var(--bm-text-primary)" : "#FFFFFF";
}

function ShellHeader({ isDark }) {
  const navigate = useNavigate();

  return (
    <header className={cn("sticky top-0 z-20 border-b px-4 py-4 sm:px-6", isDark ? "border-[var(--bm-bg-elevated)] bg-[var(--bm-bg-card)]" : "border-[var(--bm-border)] bg-white")}>
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <button type="button" onClick={() => navigate("/dashboard")} className={cn("flex items-center rounded-2xl px-2 py-1", iconClasses.iconText, interactionClasses.menuItem)}>
          <BrandLogo showName={false} logoClassName={iconClasses.sidebarLogo} />
          <div className="text-left">
            <h1 className={cn("font-semibold", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Smart Hub</h1>
            <p className={cn("hidden font-medium sm:block", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>Fast shortcuts for your day</p>
          </div>
        </button>
      </div>
    </header>
  );
}

function ShortcutCard({ isDark, appColor, accentText, icon: Icon, title, description, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={motionTokens.hover}
      whileTap={motionTokens.tap}
      transition={motionTokens.cardTransition}
      className={cn(
        "group flex min-h-[220px] w-full flex-col justify-between rounded-[28px] border text-left shadow-sm",
        spacingClasses.card,
        interactionClasses.card,
        isDark
          ? "border-white/[0.08] bg-[var(--bm-bg-elevated)] shadow-black/20"
          : "border-[var(--bm-border)] bg-white shadow-slate-200/80",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: appColor, color: accentText }}
        >
          <Icon className={iconClasses.card} />
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-full border opacity-70 transition-all group-hover:translate-x-1 group-hover:opacity-100", isDark ? "border-white/[0.12] text-white" : "border-[var(--bm-border-strong)] text-[var(--bm-text-primary)]")}>
          <ArrowRight className={iconClasses.button} />
        </span>
      </div>

      <div>
        <h2 className={cn("font-extrabold tracking-tight", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{title}</h2>
        <p className={cn("mt-3 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
          {description}
        </p>
      </div>
    </motion.button>
  );
}

function DashboardSection({ title, eyebrow, children, isDark }) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        {eyebrow && (
          <p className={cn("text-xs font-black uppercase tracking-[0.18em]", isDark ? "text-white/44" : "text-[var(--bm-text-muted)]")}>{eyebrow}</p>
        )}
        <h2 className={cn("mt-1 text-2xl font-black tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { prefs, resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const isRTL = /^(ar|fa|he|ur|ku)/i.test(uiLanguage);

  const shortcuts = [
    {
      key: "chat",
      icon: MessageSquare,
      title: "Chat",
      description: "Talk with BlueMind AI",
      path: "/chat",
    },
    {
      key: "reminders",
      icon: Bell,
      title: "Reminders",
      description: "View and manage your reminders",
      path: "/reminders",
    },
    {
      key: "schedule",
      icon: CalendarDays,
      title: "Schedule",
      description: "Build your weekly schedule",
      path: "/schedule",
    },
    {
      key: "write-edit",
      icon: PenLine,
      title: "Write / Edit",
      description: "Draft, rewrite and polish text",
      path: "/chat?mode=write-edit",
    },
  ];
  const learningHighlights = [
    "Interactive lessons",
    "AI teacher",
    "Ask AI during lessons",
    "Multiple school subjects",
    "Language learning",
    "Progress tracking",
    "Practice quizzes",
    "Flashcards",
  ];
  const welcomeTitle = isRTL ? "BlueMind" : "BlueMind Home";
  const welcomeSubtitle = isRTL ? "BlueMind home dashboard." : "Your dashboard for tools, updates, announcements, and future offers.";

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")} dir={isRTL ? "rtl" : "ltr"} data-testid="dashboard-page">
      <ShellHeader isDark={isDark} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mb-7 sm:mb-9">
          <h2 className={cn("font-extrabold tracking-tight", typeClasses.pageTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{welcomeTitle}</h2>
          <p className={cn("mt-3 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{welcomeSubtitle}</p>
        </motion.div>

        <section>
          <div className="mb-4">
            <p className={cn("text-xs font-black uppercase tracking-[0.18em]", isDark ? "text-white/44" : "text-[var(--bm-text-muted)]")}>Quick Access</p>
            <h2 className={cn("mt-1 text-2xl font-black tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Start here</h2>
          </div>
        </section>

        <div className={cn("grid grid-cols-2", spacingClasses.cardGap)}>
          {shortcuts.map((shortcut, index) => (
          <motion.div
              key={shortcut.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionTokens.transition, delay: index * 0.045 }}
            >
              <ShortcutCard
                isDark={isDark}
                appColor={appColor}
                accentText={accentText}
                icon={shortcut.icon}
                title={shortcut.title}
                description={shortcut.description}
                onClick={() => navigate(shortcut.path)}
              />
            </motion.div>
          ))}
        </div>

        <div
          className="my-10 h-px w-full"
          style={{
            background: isDark
              ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)"
              : "linear-gradient(90deg, transparent, rgba(0,0,0,0.14), transparent)",
          }}
          aria-hidden="true"
        />

        <DashboardSection title="What's New" eyebrow="Updates" isDark={isDark}>
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionTokens.transition, delay: 0.16 }}
            className={cn(
              "rounded-[28px] border p-6 shadow-sm",
              isDark
                ? "border-white/[0.075] bg-[rgba(38,38,38,0.34)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-[28px]"
                : "border-black/[0.08] bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-[22px]",
            )}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--bm-primary)] text-white">
                <Sparkles className={iconClasses.card} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xs font-black uppercase tracking-[0.16em]", isDark ? "text-white/46" : "text-[var(--bm-text-muted)]")}>Release Preview</p>
                <h3 className={cn("mt-1 text-2xl font-black leading-tight tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind 5.0 — Coming Soon</h3>
                <p className={cn("mt-3 max-w-3xl text-base font-semibold leading-7", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                  Learning is being prepared as a guided study experience with lessons, practice, and AI support built into every step.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {learningHighlights.map((item) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm font-bold",
                    isDark ? "border-white/[0.07] bg-white/[0.045] text-white/82" : "border-black/[0.06] bg-black/[0.025] text-[var(--bm-text-primary)]",
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
          </motion.article>
        </DashboardSection>

        <DashboardSection title="Announcements" eyebrow="BlueMind News" isDark={isDark}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Megaphone,
                title: "Product updates will appear here",
                description: "Future releases, maintenance notes, and company announcements will be organized in this space.",
              },
              {
                icon: Tags,
                title: "Partner offers space",
                description: "Book stores, education companies, learning platforms, student discounts, and partner promotions can live here later.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...motionTokens.transition, delay: 0.2 }}
                  className={cn(
                    "rounded-[24px] border p-5",
                    isDark
                      ? "border-white/[0.07] bg-white/[0.045] text-white"
                      : "border-black/[0.07] bg-white/80 text-[var(--bm-text-primary)]",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.07] text-white" : "bg-black/[0.04] text-[var(--bm-text-primary)]")}>
                      <Icon className={iconClasses.button} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-black">{item.title}</h3>
                      <p className={cn("mt-2 text-sm font-semibold leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{item.description}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </DashboardSection>
      </main>
    </div>
  );
}

