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

function ShellHeader({ isDark }) {
  const navigate = useNavigate();

  return (
    <header className={cn("sticky top-0 z-20 border-b px-4 py-4 sm:px-6", isDark ? "border-[#333] bg-[#222]" : "border-[#E5E7EB] bg-white")}>
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-3">
          <BrandLogo showName={false} logoClassName="h-9 w-9" />
          <div className="text-left">
            <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-[#111827]")}>Smart Hub</h1>
            <p className={cn("hidden text-sm sm:block", isDark ? "text-[#999]" : "text-[#6B7280]")}>Fast shortcuts for your day</p>
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
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group flex min-h-[220px] w-full flex-col justify-between rounded-[28px] border p-6 text-left shadow-sm transition-all duration-200",
        isDark
          ? "border-white/[0.08] bg-[#252525] shadow-black/20 hover:border-white/[0.16] hover:bg-[#2b2b2b] hover:shadow-xl hover:shadow-black/30"
          : "border-[#E5E7EB] bg-white shadow-slate-200/80 hover:border-[#193B68]/35 hover:bg-[#F8FAFC] hover:shadow-xl hover:shadow-slate-200",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: appColor, color: accentText }}
        >
          <Icon className="h-7 w-7" />
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-full border opacity-70 transition-all group-hover:translate-x-1 group-hover:opacity-100", isDark ? "border-white/[0.12] text-white" : "border-[#CBD5E1] text-[#111827]")}>
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>

      <div>
        <h2 className={cn("text-2xl font-extrabold tracking-tight", isDark ? "text-white" : "text-[#111827]")}>{title}</h2>
        <p className={cn("mt-3 text-base font-semibold leading-7", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>
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
  const appColor = prefs.appColor || prefs.accentColor || "#193B68";
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
      key: "ai-plans",
      icon: CalendarDays,
      title: "AI Plans",
      description: "Build and track intelligent project plans",
      path: "/ai-plans",
    },
  ];
  const welcomeTitle = isRTL ? "مرحباً" : "Welcome back";
  const welcomeSubtitle = isRTL ? "اختر القسم الذي تريد الوصول إليه بسرعة." : "Choose where you want to go.";

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#1a1a1a]" : "bg-[#FAFBFC]")} dir={isRTL ? "rtl" : "ltr"} data-testid="dashboard-page">
      <ShellHeader isDark={isDark} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mb-7 sm:mb-9">
          <h2 className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl", isDark ? "text-white" : "text-[#111827]")}>{welcomeTitle}</h2>
          <p className={cn("mt-3 text-base font-semibold sm:text-lg", isDark ? "text-[#AFAFAF]" : "text-[#64748B]")}>{welcomeSubtitle}</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {shortcuts.map((shortcut, index) => (
            <motion.div
              key={shortcut.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.045, duration: 0.22 }}
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
