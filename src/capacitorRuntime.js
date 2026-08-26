import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export function isNativeAndroidApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function isNativeMobileApp() {
  return Capacitor.isNativePlatform() && ["android", "ios"].includes(Capacitor.getPlatform());
}

export function getNativeMobilePath(pathname = "/", search = "", hash = "") {
  if (!pathname || pathname === "/") return `/mobile${search}${hash}`;
  if (pathname === "/mobile" || pathname.startsWith("/mobile/")) return `${pathname}${search}${hash}`;

  const directMap = new Map([
    ["/auth", "/mobile"],
    ["/auth/login", "/mobile/email"],
    ["/auth/register", "/mobile/register"],
    ["/auth/forgot-password", "/mobile/forgot-password"],
    ["/auth/verify-reset-code", "/mobile/verify-reset-code"],
    ["/auth/reset-password", "/mobile/reset-password"],
    ["/dashboard", "/mobile/chat"],
    ["/chat", "/mobile/chat"],
    ["/profile", "/mobile/settings/profile"],
    ["/settings", "/mobile/settings"],
    ["/reminders", "/mobile/reminders"],
    ["/learning", "/mobile/learning"],
    ["/ai-plans", "/mobile/ai-plans"],
    ["/schedule", "/mobile/schedule"],
    ["/scheman", "/mobile/schedule"],
  ]);

  if (directMap.has(pathname)) {
    return `${directMap.get(pathname)}${search}${hash}`;
  }

  const prefixedRoutes = [
    ["/settings/", "/mobile/settings/"],
    ["/reminders/", "/mobile/reminders/"],
    ["/schedule/", "/mobile/schedule/"],
    ["/scheman/", "/mobile/schedule/"],
  ];

  for (const [desktopPrefix, mobilePrefix] of prefixedRoutes) {
    if (pathname.startsWith(desktopPrefix)) {
      return `${mobilePrefix}${pathname.slice(desktopPrefix.length)}${search}${hash}`;
    }
  }

  return `/mobile/chat${search}${hash}`;
}

function forceNativeMobileViewport() {
  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
}

function forceNativeMobileRoute() {
  const nextPath = getNativeMobilePath(window.location.pathname, window.location.search, window.location.hash);
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextPath !== currentPath) {
    window.history.replaceState(window.history.state, "", nextPath);
  }
}

export async function setupCapacitorRuntime() {
  if (!Capacitor.isNativePlatform()) {
    return { isNative: false };
  }

  document.documentElement.classList.add("capacitor-native", `capacitor-${Capacitor.getPlatform()}`);

  if (isNativeMobileApp()) {
    document.documentElement.classList.add("force-mobile-ui");
    forceNativeMobileViewport();
    forceNativeMobileRoute();

    try {
      await StatusBar.setStyle({ style: Style.Light });

      if (isNativeAndroidApp()) {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: "#000000" });
      }
    } catch (error) {
      console.warn("Could not configure native status bar", error);
    }
  }

  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    const path = window.location.pathname;
    const canNavigateBack = canGoBack || path !== "/" || window.history.length > 1;

    if (canNavigateBack) {
      window.history.back();
      return;
    }

    CapacitorApp.minimizeApp();
  });

  return { isNative: true };
}
