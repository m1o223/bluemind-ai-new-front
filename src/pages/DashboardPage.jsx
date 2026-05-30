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

function getTextOnColor(hex) {
  const normalized = String(hex || "#193B68").replace("#", "");
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

  return luminance > 0.52 ? "#111827" : "#FFFFFF";
}

function ShellHeader({ isDark, t }) {
  const navigate = useNavigate();

  return (
    <header className={cn("sticky top-0 z-20 border-b px-4 py-4 sm:px-6", isDark ? "border-[#333] bg-[#222]" : "border-[#E5E7EB] bg-white")}>
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-3">
          <BrandLogo showName={false} logoClassName="h-9 w-9" />
          <div className="text-left">
            <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-[#111827]")}>{t("dashboardTitle")}</h1>
            <p className={cn("hidden text-sm sm:block", isDark ? "text-[#999]" : "text-[#6B7280]")}>{t("dashboardSubtitle")}</p>
          </div>
        </button>
      </div>
    </header>
  );
}

function ShortcutCard({ isDark, appColor, accentText, icon: Icon, title, subtitle, onClick, featured = false }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all duration-200 sm:gap-5 sm:p-6",
        featured ? "min-h-[172px] sm:min-h-[240px]" : "min-h-[132px] sm:min-h-[170px]",
        isDark
          ? "border-[#333] bg-[#252525] shadow-black/20 hover:border-[#466589] hover:bg-[#2a2a2a]"
          : "border-[#D1D5DB] bg-white shadow-sm shadow-slate-200/70 hover:border-[#193B68]/45 hover:bg-[#F8FAFC] hover:shadow-md",
      )}
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl",
            featured ? "h-14 w-14 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-16 sm:w-16",
            isDark ? "bg-[#333]" : "bg-[#EEF2FF]",
          )}
          style={{ backgroundColor: appColor, color: accentText }}
        >
          <Icon className={featured ? "h-6 w-6 sm:h-8 sm:w-8" : "h-5 w-5 sm:h-6 sm:w-6"} />
        </div>
        <div className="min-w-0">
          <h2 className={cn(featured ? "text-2xl sm:text-4xl" : "text-xl sm:text-3xl", "font-semibold tracking-tight leading-tight", isDark ? "text-white" : "text-[#111827]")}>
            {title}
          </h2>
          <p className={cn("mt-3 max-w-2xl text-sm leading-6 sm:text-base", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>
            {subtitle}
          </p>
        </div>
      </div>

      <div className={cn("hidden shrink-0 items-center justify-center rounded-full border p-3 transition-transform group-hover:translate-x-1 sm:flex", isDark ? "border-[#333] text-white" : "border-[#D1D5DB] text-[#111827]")}>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" style={{ color: appColor }} />
      </div>
    </motion.button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t, prefs, resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "#193B68";
  const accentText = getTextOnColor(appColor);
  const isRTL = /^(ar|fa|he|ur|ku)/i.test(uiLanguage);

  const shortcuts = [
    {
      key: "chat",
      icon: MessageSquare,
      title: t("dashboardAssistantCardTitle"),
      subtitle: t("dashboardAssistantCardSubtitle"),
      path: "/chat",
      featured: true,
    },
    {
      key: "systems",
      icon: CalendarDays,
      title: t("dashboardSmartSystemsCardTitle"),
      subtitle: t("dashboardSmartSystemsCardSubtitle"),
      path: "/scheman",
    },
    {
      key: "reminders",
      icon: Bell,
      title: t("dashboardRemindersCardTitle"),
      subtitle: t("dashboardRemindersCardSubtitle"),
      path: "/reminders",
    },
    {
      key: "learning",
      icon: BookOpen,
      title: t("dashboardLearningCardTitle"),
      subtitle: t("dashboardLearningCardSubtitle"),
      path: "/learning",
    },
  ];

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]")} dir={isRTL ? "rtl" : "ltr"} data-testid="dashboard-page">
      <ShellHeader isDark={isDark} t={t} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className={cn("mb-3 text-sm font-medium", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>{t("dashboardSmartHubKicker")}</p>
          <h2 className={cn("text-2xl font-semibold tracking-tight sm:text-4xl", isDark ? "text-white" : "text-[#111827]")}>{t("dashboardWelcomeBack")}</h2>
          <p className={cn("mt-3 max-w-2xl text-base leading-7", isDark ? "text-[#aaa]" : "text-[#6B7280]")}>{t("dashboardWelcomeSubtitle")}</p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {shortcuts.map((shortcut, index) => (
            <motion.div
              key={shortcut.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ShortcutCard
                isDark={isDark}
                appColor={appColor}
                accentText={accentText}
                icon={shortcut.icon}
                title={shortcut.title}
                subtitle={shortcut.subtitle}
                featured={shortcut.featured}
                onClick={() => navigate(shortcut.path)}
              />
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
