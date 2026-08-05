import { motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  MessageSquare,
  Megaphone,
  PenLine,
  Sparkles,
  Tags,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
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

function HubCard({ item, index, isDark, appColor, accentText }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <motion.button
      type="button"
      onClick={() => navigate(item.path)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...motionTokens.transition, delay: index * 0.045 }}
      whileHover={motionTokens.hover}
      whileTap={motionTokens.tap}
      className={cn(
        "flex min-h-[162px] flex-col justify-between rounded-[24px] border text-left shadow-sm",
        spacingClasses.card,
        interactionClasses.card,
        isDark
          ? "border-white/[0.075] bg-[rgba(38,38,38,0.34)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-[28px]"
          : "border-black/[0.08] bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-[22px]",
      )}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: appColor, color: accentText }}
      >
        <Icon className={iconClasses.card} />
      </div>
      <div>
        <h2 className={cn("font-extrabold tracking-tight", typeClasses.cardTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{item.title}</h2>
        <p className={cn("mt-2 font-semibold", typeClasses.small, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{item.description}</p>
      </div>
    </motion.button>
  );
}

function DashboardSection({ title, children, isDark, eyebrow }) {
  return (
    <section className="mt-7">
      <div className="mb-3">
        {eyebrow && (
          <p className={cn("text-[11px] font-black uppercase tracking-[0.18em]", isDark ? "text-white/44" : "text-[var(--bm-text-muted)]")}>
            {eyebrow}
          </p>
        )}
        <h2 className={cn("mt-1 text-[20px] font-black tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function MobileSmartHub() {
  const { prefs, resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
  const accentText = getTextOnColor(appColor);
  const isRTL = /^(ar|fa|he|ur|ku)/i.test(uiLanguage);
  const welcomeTitle = isRTL ? "BlueMind" : "BlueMind Home";
  const welcomeSubtitle = isRTL ? "BlueMind home dashboard." : "Your dashboard for tools, updates, announcements, and future offers.";

  const items = [
    {
      key: "chat",
      icon: MessageSquare,
      title: "Chat",
      description: "Talk with BlueMind AI",
      path: "/mobile/chat",
    },
    {
      key: "reminders",
      icon: Bell,
      title: "Reminders",
      description: "View and manage your reminders",
      path: "/mobile/reminders",
    },
    {
      key: "schedule",
      icon: CalendarDays,
      title: "Schedule",
      description: "Build your weekly schedule",
      path: "/mobile/schedule",
    },
    {
      key: "write-edit",
      icon: PenLine,
      title: "Write / Edit",
      description: "Draft, rewrite and polish text",
      path: "/mobile/write-edit",
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

  return (
    <main
      className={cn("min-h-[100dvh] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(22px+env(safe-area-inset-top))]", isDark ? "bg-[var(--bm-bg-app)] text-white" : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]")}
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="mobile-smart-hub"
    >
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className={cn("font-extrabold tracking-tight", typeClasses.pageTitle)}>{welcomeTitle}</h1>
        <p className={cn("mt-2 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{welcomeSubtitle}</p>
      </motion.section>

      <section>
        <div className="mb-3">
          <p className={cn("text-[11px] font-black uppercase tracking-[0.18em]", isDark ? "text-white/44" : "text-[var(--bm-text-muted)]")}>Quick Access</p>
          <h2 className={cn("mt-1 text-[20px] font-black tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>Start here</h2>
        </div>
      </section>

      <section className={cn("grid grid-cols-2", spacingClasses.cardGap)}>
        {items.map((item, index) => (
          <HubCard
            key={item.key}
            item={item}
            index={index}
            isDark={isDark}
            appColor={appColor}
            accentText={accentText}
          />
        ))}
      </section>

      <div
        className="my-8 h-px w-full"
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
            "overflow-hidden rounded-[28px] border p-4 shadow-sm",
            isDark
              ? "border-white/[0.075] bg-[rgba(38,38,38,0.34)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-[28px]"
              : "border-black/[0.08] bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-[22px]",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--bm-primary)] text-white">
              <Sparkles className={iconClasses.button} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[11px] font-black uppercase tracking-[0.16em]", isDark ? "text-white/46" : "text-[var(--bm-text-muted)]")}>Release Preview</p>
              <h3 className={cn("mt-1 text-[19px] font-black leading-tight tracking-tight", isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>BlueMind 5.0 — Coming Soon</h3>
              <p className={cn("mt-2 text-sm font-semibold leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                Learning is being prepared as a guided study experience with lessons, practice, and AI support built into every step.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {learningHighlights.map((item) => (
              <div
                key={item}
                className={cn(
                  "rounded-2xl border px-3 py-2 text-[12px] font-bold leading-5",
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
        <div className="grid gap-3">
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionTokens.transition, delay: 0.2 }}
            className={cn(
              "rounded-[24px] border p-4",
              isDark
                ? "border-white/[0.07] bg-white/[0.045] text-white"
                : "border-black/[0.07] bg-white/80 text-[var(--bm-text-primary)]",
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.07] text-white" : "bg-black/[0.04] text-[var(--bm-text-primary)]")}>
                <Megaphone className={iconClasses.button} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-black">Product updates will appear here</h3>
                <p className={cn("mt-1 text-sm font-semibold leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                  Future releases, maintenance notes, and company announcements will be organized in this space.
                </p>
              </div>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionTokens.transition, delay: 0.24 }}
            className={cn(
              "rounded-[24px] border p-4",
              isDark
                ? "border-white/[0.07] bg-white/[0.045] text-white"
                : "border-black/[0.07] bg-white/80 text-[var(--bm-text-primary)]",
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", isDark ? "bg-white/[0.07] text-white" : "bg-black/[0.04] text-[var(--bm-text-primary)]")}>
                <Tags className={iconClasses.button} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-black">Partner offers space</h3>
                <p className={cn("mt-1 text-sm font-semibold leading-6", isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>
                  Book stores, education companies, learning platforms, student discounts, and partner promotions can live here later.
                </p>
              </div>
            </div>
          </motion.article>
        </div>
      </DashboardSection>
    </main>
  );
}

