import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  PasswordChecklist,
} from "@/components/auth/AuthPrimitives";
import { getApiErrorMessage } from "@/services/api";
import { getGoogleSignInErrorMessage, registerUser, signInWithGoogle } from "@/services/authService";

function getDisplayNameFromEmail(email) {
  return email.split("@")[0]?.trim() || "BlueMind User";
}

export default function MobileRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const requirements = useMemo(() => [
    { label: "Minimum 8 characters", met: formData.password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: "One lowercase letter", met: /[a-z]/.test(formData.password) },
    { label: "One number", met: /\d/.test(formData.password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(formData.password) },
  ], [formData.password]);

  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const isFormValid =
    formData.email.trim() &&
    passwordsMatch &&
    requirements.every((requirement) => requirement.met);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await registerUser(
        getDisplayNameFromEmail(formData.email),
        formData.email,
        formData.password,
      );
      sessionStorage.setItem("pendingVerificationEmail", result?.user?.email || formData.email);
      navigate(`/auth/verify-email?email=${encodeURIComponent(result?.user?.email || formData.email)}`);
    } catch (error) {
      const message = getApiErrorMessage(error, "Registration failed. Please try again.");
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
      await signInWithGoogle();
      navigate("/mobile/chat");
    } catch (error) {
      const message = getGoogleSignInErrorMessage(error, "Google sign-in failed");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSocialLoading("");
    }
  };

  return (
    <AuthPage testId="mobile-register-page" mobile>
      <AuthBackButton onClick={() => navigate("/mobile")} />

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <AuthHeader title="Create Account" />

        <AuthInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          placeholder="Email"
          autoComplete="email"
          testId="mobile-register-email-input"
        />
        <AuthInput
          label="Password"
          type="password"
          value={formData.password}
          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
          placeholder="Password"
          autoComplete="new-password"
          testId="mobile-register-password-input"
        />
        <AuthInput
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
          placeholder="Confirm password"
          autoComplete="new-password"
        />

        <PasswordChecklist
          requirements={[
            ...requirements,
            { label: "Passwords match", met: Boolean(passwordsMatch) },
          ]}
        />

        <AuthButton
          type="submit"
          variant="primary"
          disabled={!isFormValid || isLoading}
          testId="mobile-register-submit-button"
        >
          {isLoading ? "Creating..." : "Create Account"}
        </AuthButton>

        <AuthError testId="mobile-register-error">{errorMessage}</AuthError>

        <p className="text-center text-sm font-medium text-white/48">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/mobile/email")}
            className="font-semibold text-white transition hover:text-white/72"
          >
            Login
          </button>
        </p>

        <AuthDivider />

        <div className="space-y-4">
          <AuthButton
            onClick={handleGoogleLogin}
            disabled={Boolean(socialLoading)}
            icon={socialLoading === "google" ? <BlueMindLoadingDots /> : <GoogleIcon />}
            testId="mobile-register-google-login"
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
