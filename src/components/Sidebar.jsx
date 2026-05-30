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
      className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-4 border-r border-[#4a4a4a] bg-[#212121]"
      data-testid="sidebar"
    >
      {/* Logo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center mb-6 hover:opacity-80 transition-opacity"
            data-testid="sidebar-logo"
          >
            <BrandLogo forceTheme="dark" showName={false} logoClassName="w-10 h-10" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[#2f2f2f] text-white border-[#4a4a4a]">
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
                    "w-10 h-10 flex items-center justify-center rounded-lg transition-colors text-[#b4b4b4] hover:text-white hover:bg-[#303030]",
                    isActive && "text-white bg-[#303030]"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#2f2f2f] text-white border-[#4a4a4a]">
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
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#303030] transition-colors"
            data-testid="logout-button"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[#2f2f2f] text-white border-[#4a4a4a]">
          {t("logout")}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
