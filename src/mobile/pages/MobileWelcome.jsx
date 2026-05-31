import { Apple, Mail } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useApp } from "@/context/AppContext";

function GoogleMark() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#4285F4]">
      G
    </span>
  );
}

export default function MobileWelcome() {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  const surfaceClass = isDark
    ? "bg-[#1a1a1a] text-white"
    : "bg-[#F8FAFC] text-[#111827]";
  const mutedText = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const buttonClass = isDark
    ? "border-white/[0.1] bg-white/[0.065] text-white active:bg-white/[0.1]"
    : "border-[#E1E7F0] bg-white text-[#111827] shadow-[0_10px_28px_rgba(15,23,42,0.06)] active:bg-[#F3F6FA]";
  const disabledClass = isDark
    ? "border-white/[0.06] bg-white/[0.035] text-white/45"
    : "border-[#E5EAF2] bg-[#EEF2F7] text-[#94A3B8]";
  const dividerClass = isDark ? "border-white/[0.08]" : "border-[#E1E7F0]";

  return (
    <main className={`min-h-screen ${surfaceClass}`}>
      <section className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-14">
        <div className="flex flex-1 flex-col items-center justify-center">
          <BrandLogo showName={false} logoClassName="h-20 w-20" />

          <h1 className="mt-5 text-center text-[32px] font-semibold leading-tight tracking-tight">
            BlueMind AI
          </h1>
          <p className={`mt-2 text-center text-[15px] font-medium leading-6 ${mutedText}`}>
            Choose how you want to continue
          </p>

          <div className="mt-9 w-full space-y-3">
            <button
              type="button"
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold transition-colors ${buttonClass}`}
            >
              <GoogleMark />
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold transition-colors ${buttonClass}`}
            >
              <Mail className="h-5 w-5 stroke-[2.1]" />
              <span>Continue with Email</span>
            </button>

            <button
              type="button"
              disabled
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold ${disabledClass}`}
            >
              <Apple className="h-5 w-5 stroke-[2.1]" />
              <span>Continue with Apple</span>
              <span className={isDark ? "rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold text-white/55" : "rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#64748B]"}>
                Coming Soon
              </span>
            </button>
          </div>

          <div className={`mt-8 w-full border-t pt-6 ${dividerClass}`}>
            <button
              type="button"
              className={isDark
                ? "h-[54px] w-full rounded-2xl border border-white/[0.08] bg-transparent px-5 text-[15px] font-semibold text-white active:bg-white/[0.06]"
                : "h-[54px] w-full rounded-2xl border border-[#C9D4E3] bg-transparent px-5 text-[15px] font-semibold text-[#193B68] active:bg-[#EEF2F7]"
              }
            >
              Try BlueMind AI
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
