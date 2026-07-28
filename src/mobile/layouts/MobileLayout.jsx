import { Outlet } from "react-router-dom";
import { useApp } from "@/context/AppContext";

export default function MobileLayout() {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <main className={isDark ? "min-h-screen bg-[var(--bm-bg-app)] text-white" : "min-h-screen bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]"}>
      <Outlet />
    </main>
  );
}
