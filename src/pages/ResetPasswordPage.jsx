import ResetPasswordScreen from "@/components/auth/ResetPasswordScreen";

export default function ResetPasswordPage() {
  return (
    <ResetPasswordScreen
      verifyPath="/auth/verify-reset-code"
      loginPath="/auth/login"
      testId="reset-password-page"
    />
  );
}
