import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export function isNativeAndroidApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function setupCapacitorRuntime() {
  if (!Capacitor.isNativePlatform()) {
    return { isNative: false };
  }

  document.documentElement.classList.add("capacitor-native", `capacitor-${Capacitor.getPlatform()}`);

  if (isNativeAndroidApp()) {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: "#000000" });
      await StatusBar.setStyle({ style: Style.Light });
    } catch (error) {
      console.warn("Could not configure Android status bar", error);
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
