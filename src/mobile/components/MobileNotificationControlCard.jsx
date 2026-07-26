import { Bell, RefreshCw, Send } from "lucide-react";

import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { cn } from "@/lib/utils";

const mobileBlueGlassSurfaceClass = "border-[#2F7DF6]/[0.20] bg-[rgba(12,45,102,0.42)] text-white shadow-[inset_0_1px_0_rgba(115,170,255,0.16),0_18px_42px_rgba(5,18,45,0.28)] backdrop-blur-[28px]";

export default function MobileNotificationControlCard({
  title,
  description,
  debug,
  busy,
  isDark,
  appColor,
  onEnable,
  onRefresh,
  onTest,
  testId = "mobile-notification-panel",
}) {
  const permission = debug?.permission || "default";
  const isEnabled = permission === "granted" && (debug?.subscriptionExists || debug?.backendDeviceSaved);

  return (
    <section
      className={cn("rounded-[24px] border p-4", mobileBlueGlassSurfaceClass)}
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
          style={{ backgroundColor: appColor }}
        >
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className={cn("mt-1 text-xs leading-5", isDark ? "text-white/[0.55]" : "text-[var(--bm-text-secondary)]")}>
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onEnable}
          disabled={busy?.enabling || isEnabled}
          className={cn(
            "h-10 rounded-2xl text-xs font-semibold disabled:opacity-45",
            isDark ? "bg-white/[0.10] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]",
          )}
        >
          {busy?.enabling ? "Enabling" : "Enable"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy?.refreshing}
          className={cn(
            "grid h-10 place-items-center rounded-2xl disabled:opacity-45",
            isDark ? "bg-white/[0.10] text-white" : "bg-[var(--bm-hover-bg)] text-[var(--bm-text-primary)]",
          )}
          aria-label="Refresh notification status"
        >
          {busy?.refreshing ? <BlueMindLoadingDots className="text-[var(--bm-primary)]" /> : <RefreshCw className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={busy?.sendingTest}
          className="grid h-10 place-items-center rounded-2xl text-white disabled:opacity-45"
          style={{ backgroundColor: appColor }}
          aria-label="Send test notification"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
