import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BlueMindAnimatedBackground from "@/components/BlueMindAnimatedBackground";
import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import { getGoogleSignInErrorMessage, signInWithGoogle } from "@/services/authService";

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

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] fill-current">
      <path d="M16.18 12.62c-.03-2.75 2.25-4.08 2.35-4.14-1.29-1.88-3.28-2.14-3.97-2.17-1.67-.17-3.29 1-4.14 1-.87 0-2.18-.98-3.6-.95-1.83.03-3.54 1.09-4.48 2.74-1.94 3.36-.49 8.3 1.36 11.02.93 1.33 2.02 2.82 3.43 2.77 1.38-.06 1.9-.89 3.57-.89 1.65 0 2.14.89 3.59.86 1.49-.03 2.43-1.34 3.32-2.68 1.08-1.54 1.51-3.06 1.53-3.14-.03-.01-2.93-1.12-2.96-4.42ZM13.47 4.54c.74-.92 1.24-2.17 1.1-3.43-1.07.05-2.41.74-3.18 1.63-.69.79-1.31 2.09-1.15 3.31 1.21.09 2.46-.61 3.23-1.51Z" />
    </svg>
  );
}

function AuthPillButton({ children, icon, onClick, disabled, ariaLabel, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      data-testid={testId}
      className="relative flex h-[60px] w-full min-w-0 items-center justify-center rounded-[30px] bg-white px-6 text-xl font-semibold text-black transition duration-150 ease-out hover:bg-white/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#121923] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon ? (
        <span className="absolute left-6 flex h-6 w-6 items-center justify-center text-black">
          {icon}
        </span>
      ) : null}
      <span className="px-8 text-center leading-none">{children}</span>
    </button>
  );
}

export default function MobileWelcome() {
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
      className="overflow-hidden bg-[#0b315e] text-white"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        minHeight: "100dvh",
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      data-testid="mobile-auth-welcome"
    >
      <BlueMindAnimatedBackground />
      <section className="mx-auto flex h-full w-full max-w-[430px] flex-col">
        <div className="relative min-h-0 flex-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="absolute left-5 top-4 z-10 inline-flex h-10 items-center gap-1 rounded-full bg-white/16 px-4 text-sm font-bold text-white transition duration-150 ease-out hover:bg-white/22 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
            style={{ marginTop: "env(safe-area-inset-top)" }}
            data-testid="mobile-auth-back-button"
          >
            <span>Back</span>
            <ArrowRight className="h-4 w-4 stroke-[2.4]" />
          </button>
        </div>

        <div className="relative z-10 mx-auto mb-5 w-[92%] rounded-[40px] bg-[#121923] px-7 py-7 text-white shadow-none">
          <div className="mx-auto flex w-full flex-col">
            <AuthPillButton
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              ariaLabel="Continue with Google"
              testId="mobile-google-auth-button"
              icon={isGoogleLoading ? <BlueMindLoadingDots className="text-black" /> : <GoogleIcon />}
            >
              Continue with Google
            </AuthPillButton>

            <div className="h-4" />

            <AuthPillButton
              onClick={() => toast.info("Apple sign-in is being prepared.")}
              ariaLabel="Continue with Apple"
              testId="mobile-apple-auth-button"
              icon={<AppleLogo />}
            >
              Continue with Apple
            </AuthPillButton>

            <div className="flex items-center gap-4 py-6" aria-hidden="true">
              <div className="h-px flex-1 bg-white/16" />
              <span className="text-sm font-semibold text-white/62">or</span>
              <div className="h-px flex-1 bg-white/16" />
            </div>

            <AuthPillButton
              onClick={() => navigate("/mobile/register")}
              ariaLabel="Create Account"
              testId="mobile-create-account-button"
            >
              Create Account
            </AuthPillButton>

            <div className="h-4" />

            <AuthPillButton
              onClick={() => navigate("/mobile/email")}
              ariaLabel="Login"
              testId="mobile-login-button"
            >
              Login
            </AuthPillButton>
          </div>
        </div>
      </section>
    </main>
  );
}
