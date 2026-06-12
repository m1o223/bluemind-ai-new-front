import { NavLink, useNavigate } from "react-router-dom";
import { MessageSquare, Bell, MessageCircleHeart, LogOut, CalendarDays, Home } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import BrandLogo, { APP_NAME } from "@/components/BrandLogo";
import { useApp } from "@/context/AppContext";

const navItems = [
  { to: "/dashboard", icon: Home, labelKey: "dashboard", testId: "dashboard" },
  { to: "/chat", icon: MessageSquare, labelKey: "chat", testId: "chat" },
  { to: "/reminders", icon: Bell, labelKey: "reminders", testId: "reminders" },
  { to: "/scheman", icon: CalendarDays, labelKey: "scheman", testId: "scheman" },
  { to: "/feedback", icon: MessageCircleHeart, labelKey: "shareFeedback", testId: "feedback" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { t } = useApp();

  return (
    <aside 
      className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-4 border-r border-[var(--bm-border-strong)] bg-[var(--bm-bg-app)]"
      data-testid="sidebar"
    >
      {/* Logo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/")}
            className="w-11 h-11 flex items-center justify-center mb-6 hover:opacity-90 transition-opacity"
            data-testid="sidebar-logo"
          >
            <BrandLogo forceTheme="dark" showName={false} small logoClassName="w-11 h-11" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[var(--bm-bg-card)] text-white border-[var(--bm-border-strong)]">
          {APP_NAME}
        </TooltipContent>
      </Tooltip>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-2" data-testid="sidebar-nav">
        {navItems.map((item) => (
          <Tooltip key={item.to}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.to}
                data-testid={`nav-${item.testId}`}
                className={({ isActive }) =>
                  cn(
                    "w-10 h-10 flex items-center justify-center rounded-lg transition-colors text-[var(--bm-text-secondary)] hover:text-white hover:bg-[var(--bm-bg-elevated)]",
                    isActive && "text-white bg-[var(--bm-bg-elevated)]"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[var(--bm-bg-card)] text-white border-[var(--bm-border-strong)]">
              {t(item.labelKey)}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Logout */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--bm-text-secondary)] hover:text-white hover:bg-[var(--bm-bg-elevated)] transition-colors"
            data-testid="logout-button"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[var(--bm-bg-card)] text-white border-[var(--bm-border-strong)]">
          {t("logout")}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
