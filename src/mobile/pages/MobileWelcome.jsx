import { Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import BlueMindAnimatedBackground from "@/components/BlueMindAnimatedBackground";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { useApp } from "@/context/AppContext";
import { startMobileGuestSession } from "@/mobile/mobileGuestSession";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, loginGuestUser, signInWithGoogle } from "@/services/authService";

const BLUE_PRIMARY = "var(--bm-primary)";

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

export default function MobileWelcome() {
  const navigate = useNavigate();
  const { resolvedTheme } = useApp();
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isDark = resolvedTheme === "dark";

  const surfaceClass = isDark
    ? "bg-[var(--bm-bg-app)] text-white"
    : "bg-[var(--bm-bg-app)] text-[var(--bm-text-primary)]";
  const surfaceColor = isDark ? "var(--bm-bg-app)" : "var(--bm-bg-app)";
  const mutedText = isDark ? "text-[var(--bm-text-secondary)]" : "text-[var(--bm-text-secondary)]";
  const googleButtonClass = isDark
    ? "border-white/[0.12] bg-white/[0.075] text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] active:bg-white/[0.11]"
    : "border-[var(--bm-border)] bg-white/90 text-[var(--bm-text-primary)] shadow-[0_14px_34px_rgba(15,23,42,0.08)] active:bg-[var(--bm-hover-bg)]";
  const emailButtonClass = "border-transparent text-white shadow-[0_16px_36px_rgba(25,59,104,0.24)] active:brightness-95";

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate("/mobile/chat");
    } catch (error) {
      const message = getGoogleSignInErrorMessage(error, "Google sign-in failed");
      toast.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <main
      className={`${surfaceClass} overflow-hidden`}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        backgroundColor: surfaceColor,
        minHeight: "100dvh",
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <BlueMindAnimatedBackground />
      <section className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col px-6">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-5">
          <BrandLogo showName={false} logoClassName="h-20 w-20" />

          <h1 className="mt-5 text-center text-[32px] font-bold leading-tight tracking-tight">
            BlueMind AI
          </h1>
          <p className={`mt-2 text-center text-[15px] font-medium leading-6 ${mutedText}`}>
            Choose how you want to continue
          </p>

          <div className="mt-9 w-full space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold transition-colors ${googleButtonClass}`}
            >
              {isGoogleLoading ? <BlueMindLoadingDots /> : <GoogleIcon />}
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/mobile/email")}
              className={`flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border px-5 text-[15px] font-semibold transition-colors ${emailButtonClass}`}
              style={{ backgroundColor: `var(--bluemind-app-color, ${BLUE_PRIMARY})` }}
            >
              <Mail className="h-5 w-5 stroke-[2.1]" />
              <span>Continue with Email</span>
            </button>
          </div>

          <div className="mt-7 w-full text-center">
            <button
              type="button"
              disabled={isGuestLoading}
              onClick={async () => {
                setIsGuestLoading(true);
                try {
                  await loginGuestUser();
                  startMobileGuestSession();
                  navigate("/mobile/chat");
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Could not start guest mode"));
                } finally {
                  setIsGuestLoading(false);
                }
              }}
              className="inline-flex items-center justify-center gap-1 text-[15px] font-semibold transition-opacity active:opacity-70"
              style={{ color: isDark ? "var(--bm-text-secondary)" : `var(--bluemind-app-color, ${BLUE_PRIMARY})` }}
            >
              {isGuestLoading ? (
                <BlueMindLoadingDots />
              ) : (
                <>
                  <span>Try BlueMind AI</span>
                  <span className="text-xl font-extrabold leading-none">{"\u2192"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
