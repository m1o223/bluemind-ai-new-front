import { Outlet } from "react-router-dom";
import { useApp } from "@/context/AppContext";

export default function MobileLayout() {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  return (
    <main className={isDark ? "min-h-screen bg-[#1a1a1a] text-white" : "min-h-screen bg-white text-[#111827]"}>
      <Outlet />
    </main>
  );
}
