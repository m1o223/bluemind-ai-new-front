import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { isNativeIOSApp } from "@/capacitorRuntime";
import { setNativeGlassScreen } from "@/mobile/nativeGlassBridge";

function getNativeScreen(pathname) {
  if (pathname === "/mobile/chat") return "chat";
  if (pathname === "/mobile/search") return "search";
  if (pathname.startsWith("/mobile/reminders")) return "reminders";
  if (pathname.startsWith("/mobile/schedule")) return "schedule";
  if (pathname.startsWith("/mobile/settings")) return "settings";
  if (pathname === "/mobile/create-image") return "images";
  if (pathname === "/mobile/write-edit") return "documents";
  if (pathname === "/mobile/smart-hub" || pathname.startsWith("/mobile/projects")) return "projects";
  return "other";
}

export default function MobileLayout() {
  const location = useLocation();
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  useLayoutEffect(() => {
    if (!isNativeIOSApp()) return;
    void setNativeGlassScreen(getNativeScreen(location.pathname));
  }, [location.pathname]);

  return (
    <main className={isDark ? "bm-mobile-route-scroll bg-[var(--bm-bg-app)] text-white" : "bm-mobile-route-scroll bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]"}>
      <Outlet />
    </main>
  );
}
