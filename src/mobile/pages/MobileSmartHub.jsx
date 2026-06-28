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
          ? "border-white/[0.08] bg-[var(--bm-bg-elevated)] shadow-black/20"
          : "border-[var(--bm-border)] bg-white shadow-slate-200/80",
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

export default function MobileSmartHub() {
  const { prefs, resolvedTheme, uiLanguage } = useApp();
  const isDark = resolvedTheme === "dark";
  const appColor = prefs.appColor || prefs.accentColor || "var(--bm-primary)";
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
      title: "Tent",
      description: "Build your weekly planner",
      path: "/mobile/scheman",
    },
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
    </main>
  );
}
