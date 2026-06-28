import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  MessageSquare,
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
      key: "learning",
      icon: BookOpen,
      title: "Learning",
      description: "Continue your learning journey",
      path: "/learning",
    },
    {
      key: "scheman",
      icon: CalendarDays,
      title: "Tent",
      description: "Build your weekly planner",
      path: "/scheman",
    },
  ];
  const welcomeTitle = isRTL ? "مرحباً" : "Welcome back";
  const welcomeSubtitle = isRTL ? "اختر القسم الذي تريد الوصول إليه بسرعة." : "Choose where you want to go.";

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[var(--bm-bg-app)]" : "bg-[var(--bm-bg-app)]")} dir={isRTL ? "rtl" : "ltr"} data-testid="dashboard-page">
      <ShellHeader isDark={isDark} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mb-7 sm:mb-9">
          <h2 className={cn("font-extrabold tracking-tight", typeClasses.pageTitle, isDark ? "text-white" : "text-[var(--bm-text-primary)]")}>{welcomeTitle}</h2>
          <p className={cn("mt-3 font-semibold", typeClasses.body, isDark ? "text-[var(--bm-text-muted)]" : "text-[var(--bm-text-secondary)]")}>{welcomeSubtitle}</p>
        </motion.div>

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
      </main>
    </div>
  );
}
