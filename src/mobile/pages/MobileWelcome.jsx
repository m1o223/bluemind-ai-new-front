import { Mail } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useApp } from "@/context/AppContext";

const BLUE_PRIMARY = "#193B68";

function GoogleIcon() {
  return (
    <img
      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      alt=""
      aria-hidden="true"
      className="h-5 w-5"
    />
  );
}

function AppleIcon() {
  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
      alt=""
      aria-hidden="true"
      className="h-5 w-5 invert opacity-70"
    />
  );
}

export default function MobileWelcome() {
  const { resolvedTheme } = useApp();
  const isDark = resolvedTheme === "dark";

  const surfaceClass = isDark
    ? "bg-[#1a1a1a] text-white"
    : "bg-[#F8FAFC] text-[#111827]";
  const mutedText = isDark ? "text-[#A7A7A7]" : "text-[#64748B]";
  const googleButtonClass = isDark
    ? "border-white/[0.12] bg-white/[0.075] text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] active:bg-white/[0.11]"
    : "border-[#E1E7F0] bg-white/90 text-[#111827] shadow-[0_14px_34px_rgba(15,23,42,0.08)] active:bg-[#F3F6FA]";
  const appleButtonClass = isDark
    ? "border-black bg-black text-white/55"
    : "border-[#111827] bg-[#111827] text-white/70";
  const emailButtonClass = "border-transparent text-white shadow-[0_16px_36px_rgba(25,59,104,0.24)] active:brightness-95";
  const comingSoonClass = isDark
    ? "rounded-full bg-white/[0.1] px-2 py-0.5 text-[11px] font-semibold text-white/55"
    : "rounded-full bg-white/[0.12] px-2 py-0.5 text-[11px] font-semibold text-white/70";

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
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold transition-colors ${googleButtonClass}`}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              disabled
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold ${appleButtonClass}`}
            >
              <AppleIcon />
              <span>Continue with Apple</span>
              <span className={comingSoonClass}>Coming Soon</span>
            </button>

            <button
              type="button"
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold transition-colors ${emailButtonClass}`}
              style={{ backgroundColor: BLUE_PRIMARY }}
            >
              <Mail className="h-5 w-5 stroke-[2.1]" />
              <span>Continue with Email</span>
            </button>
          </div>

          <div className="mt-7 w-full text-center">
            <button
              type="button"
              className="text-[15px] font-semibold transition-opacity active:opacity-70"
              style={{ color: isDark ? "#D7D7D7" : BLUE_PRIMARY }}
            >
              Try BlueMind AI →
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
