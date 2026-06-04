import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CircleHelp,
  Globe2,
  Info,
  Lock,
  Palette,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import AccountSettingsSection from "@/components/settings/AccountSettingsSection";
import NotificationsSettingsSection from "@/components/settings/NotificationsSettingsSection";
import ProfileSettingsSection from "@/components/settings/ProfileSettingsSection";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const SETTINGS_SECTIONS = [
  {
    id: "profile",
    title: "Profile",
    description: "Manage your identity and profile information.",
    icon: UserCircle,
  },
  {
    id: "account",
    title: "Account",
    description: "Account access, security, and subscription shell.",
    icon: ShieldCheck,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Notification and reminder delivery settings.",
    icon: Bell,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme, colors, and visual preferences.",
    icon: Palette,
  },
  {
    id: "language",
    title: "Language",
    description: "App language and AI language behavior.",
    icon: Globe2,
  },
  {
    id: "privacy",
    title: "Privacy",
    description: "Privacy controls and data preferences.",
    icon: Lock,
  },
  {
    id: "contact-support",
    title: "Contact & Support",
    description: "Help, contact, and support channels.",
    icon: CircleHelp,
  },
  {
    id: "about-bluemind",
    title: "About BlueMind",
    description: "Product information and app details.",
    icon: Info,
  },
];

export { SETTINGS_SECTIONS };

export default function SettingsPage({ mobile = false }) {
  const navigate = useNavigate();
  const { sectionId, detailId } = useParams();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";
  const basePath = mobile ? "/mobile/settings" : "/settings";
  const homePath = mobile ? "/mobile/chat" : "/chat";
  const activeSection = useMemo(
    () => SETTINGS_SECTIONS.find((section) => section.id === sectionId),
    [sectionId],
  );
  const isSectionPage = Boolean(sectionId && activeSection);

  const pageClass = isDark ? "bg-[#1a1a1a] text-white" : "bg-[#FAFBFC] text-[#111827]";
  const panelClass = isDark ? "border-white/[0.08] bg-[#252525]" : "border-[#E5E7EB] bg-white";
  const mutedClass = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const iconShellClass = isDark ? "bg-white/[0.07] text-white" : "bg-[#EEF2FF] text-[#193B68]";

  const goBack = () => {
    if (isSectionPage) {
      navigate(basePath);
      return;
    }

    navigate(homePath);
  };

  return (
    <main
      className={cn("min-h-[100dvh]", pageClass)}
      style={mobile ? { paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" } : undefined}
      data-testid={mobile ? "mobile-settings-page" : "settings-page"}
    >
      <motion.div
        key={isSectionPage ? activeSection.id : "settings-index"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "mx-auto flex min-h-[100dvh] w-full flex-col px-4",
          mobile ? "max-w-[430px] pb-5 pt-3" : "max-w-3xl py-6",
        )}
      >
        <header className={cn("mb-5 flex items-center gap-3", mobile ? "min-h-12" : "min-h-14")}>
          <button
            type="button"
            onClick={goBack}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full transition-colors",
              mobile ? "h-11 w-11" : "h-10 w-10",
              isDark ? "text-white hover:bg-white/[0.08]" : "text-[#111827] hover:bg-[#EEF2F7]",
            )}
            aria-label="Back"
            data-testid="settings-back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {!isSectionPage && <BrandLogo showName={false} logoClassName="h-9 w-9" />}

          <div className="min-w-0">
            <h1 className={cn("truncate font-extrabold tracking-tight", mobile ? "text-[24px]" : "text-[28px]")}>
              {isSectionPage ? activeSection.title : "Settings"}
            </h1>
            {!isSectionPage && (
              <p className={cn("mt-0.5 text-sm font-semibold", mutedClass)}>
                Choose a section to configure BlueMind.
              </p>
            )}
          </div>
        </header>

        {isSectionPage && activeSection.id === "profile" ? (
          <ProfileSettingsSection mobile={mobile} isDark={isDark} />
        ) : isSectionPage && activeSection.id === "account" ? (
          <AccountSettingsSection mobile={mobile} isDark={isDark} />
        ) : isSectionPage && activeSection.id === "notifications" ? (
          <NotificationsSettingsSection mobile={mobile} isDark={isDark} categoryId={detailId} />
        ) : isSectionPage ? (
          <section className={cn("rounded-[24px] border p-5 shadow-sm", panelClass)} data-testid={`settings-section-${activeSection.id}`}>
            <div className="mb-5 flex items-center gap-3">
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", iconShellClass)}>
                <activeSection.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold">{activeSection.title}</p>
                <p className={cn("mt-1 text-sm font-semibold leading-6", mutedClass)}>
                  {activeSection.description}
                </p>
              </div>
            </div>
            <div className={cn("rounded-[20px] border px-4 py-8 text-center", isDark ? "border-white/[0.08] bg-white/[0.04]" : "border-[#E5E7EB] bg-[#F8FAFC]")}>
              <p className="text-base font-bold">Placeholder Content</p>
              <p className={cn("mt-2 text-sm font-semibold", mutedClass)}>Coming Soon</p>
            </div>
          </section>
        ) : (
          <section className="space-y-2" data-testid="settings-section-list">
            {SETTINGS_SECTIONS.map((section, index) => (
              <motion.button
                key={section.id}
                type="button"
                onClick={() => navigate(`${basePath}/${section.id}`)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: index * 0.025 }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[22px] border p-3 text-left shadow-sm transition-colors",
                  panelClass,
                  isDark ? "active:bg-white/[0.08] hover:bg-[#292929]" : "active:bg-[#EEF2F7] hover:bg-[#F8FAFC]",
                )}
                data-testid={`settings-link-${section.id}`}
              >
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", iconShellClass)}>
                  <section.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold">{section.title}</span>
                  <span className={cn("mt-0.5 block text-xs font-semibold leading-5", mutedClass)}>
                    {section.description}
                  </span>
                </span>
                <ChevronRight className={cn("h-5 w-5 shrink-0", mutedClass)} />
              </motion.button>
            ))}
          </section>
        )}
      </motion.div>
    </main>
  );
}
