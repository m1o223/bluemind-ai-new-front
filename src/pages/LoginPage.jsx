import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CircleHelp } from "lucide-react";

import { BlueMindLoadingDots } from "@/components/BlueMindActionFeedback";
import {
  AppleIcon,
  AuthBackButton,
  AuthButton,
  AuthDivider,
  AuthError,
  AuthHeader,
  AuthInput,
  AuthPage,
  GoogleIcon,
} from "@/components/auth/AuthPrimitives";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, loginUser, signInWithGoogle } from "@/services/authService";
import { getPreferredAppRoute } from "@/services/navigationPreferences";

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const isFormValid = formData.email.trim() && formData.password.trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const session = await loginUser(formData.email, formData.password);
      navigate(getPreferredAppRoute(session));
    } catch (error) {
      const message = getApiErrorMessage(error, "Login failed. Please check your email and password.");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    setErrorMessage("");
    try {
      const session = await signInWithGoogle();
      navigate(getPreferredAppRoute(session));
    } catch (error) {
      const message = getGoogleSignInErrorMessage(error, "Google sign-in failed");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSocialLoading("");
    }
  };

  return (
    <AuthPage testId="login-page">
      <AuthBackButton onClick={() => navigate("/auth")} />

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <AuthHeader title="Login" />

        <AuthInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          placeholder="Email"
          autoComplete="email"
          testId="email-input"
        />
        <AuthInput
          label="Password"
          type="password"
          value={formData.password}
          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
          placeholder="Password"
          autoComplete="current-password"
          testId="password-input"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/auth/forgot-password")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/54 underline underline-offset-4 transition hover:text-white/80"
            data-testid="forgot-password-link"
          >
            <CircleHelp className="h-3.5 w-3.5" />
            Forgot Password
          </button>
        </div>

        <AuthButton
          type="submit"
          variant="primary"
          disabled={!isFormValid || isLoading}
          testId="login-submit-button"
        >
          {isLoading ? "Logging in..." : "Login"}
        </AuthButton>

        <AuthError testId="login-error">{errorMessage}</AuthError>

        <p className="text-center text-sm font-medium text-white/48">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/auth/register")}
            className="font-semibold text-white underline underline-offset-4 transition hover:text-white/72"
            data-testid="register-link"
          >
            Create Account
          </button>
        </p>

        <AuthDivider />

        <div className="space-y-4">
          <AuthButton
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            icon={socialLoading === "google" ? <BlueMindLoadingDots /> : <GoogleIcon />}
            testId="google-login"
          >
            Continue with Google
          </AuthButton>
          <AuthButton
            onClick={() => toast.info("Apple sign-in is being prepared.")}
            disabled={Boolean(socialLoading)}
            icon={<AppleIcon />}
          >
            Continue with Apple
          </AuthButton>
        </div>
      </form>
    </AuthPage>
  );
}
