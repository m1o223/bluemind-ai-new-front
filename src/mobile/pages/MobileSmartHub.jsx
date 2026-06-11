import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

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

function HubCard({ item, index, isDark, appColor, accentText }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <motion.button
      type="button"
      onClick={() => navigate(item.path)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.22 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex min-h-[162px] flex-col justify-between rounded-[24px] border p-4 text-left shadow-sm transition-all duration-200",
        isDark
          ? "border-white/[0.08] bg-[#252525] shadow-black/20 active:bg-[#2b2b2b]"
          : "border-[#E5E7EB] bg-white shadow-slate-200/80 active:bg-[#F8FAFC]",
      )}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: appColor, color: accentText }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className={cn("text-lg font-extrabold tracking-tight", isDark ? "text-white" : "text-[#111827]")}>{item.title}</h2>
        <p className={cn("mt-2 text-[13px] font-semibold leading-5", isDark ? "text-[#B8B8B8]" : "text-[#64748B]")}>{item.description}</p>
      </div>
    </motion.button>
  );
}

export default function MobileSmartHub() {
  const { prefs, resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "#193B68";
  const accentText = getTextOnColor(appColor);
  const isRTL = /^(ar|fa|he|ur|ku)/i.test(uiLanguage);
  const welcomeTitle = isRTL ? "مرحباً" : "Welcome back";
  const welcomeSubtitle = isRTL ? "اختر القسم الذي تريد الوصول إليه بسرعة." : "Choose where you want to go.";

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
      key: "learning",
      icon: BookOpen,
      title: "Learning",
      description: "Continue your learning journey",
      path: "/mobile/learning",
    },
    {
      key: "scheman",
      icon: CalendarDays,
      title: "Scheman",
      description: "Manage your study schedule",
      path: "/mobile/scheman",
    },
  ];

  return (
    <main
      className={cn("min-h-[100dvh] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(22px+env(safe-area-inset-top))]", isDark ? "bg-[#1a1a1a] text-white" : "bg-[#FAFBFC] text-[#111827]")}
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="mobile-smart-hub"
    >
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-[28px] font-extrabold tracking-tight">{welcomeTitle}</h1>
        <p className={cn("mt-2 text-[15px] font-semibold leading-6", isDark ? "text-[#AFAFAF]" : "text-[#64748B]")}>{welcomeSubtitle}</p>
      </motion.section>

      <section className="grid grid-cols-2 gap-3">
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
    </main>
  );
}
