import ResetPasswordScreen from "@/components/auth/ResetPasswordScreen";

export default function MobileResetPassword() {
  return (
    <ResetPasswordScreen
      mobile
      verifyPath="/mobile/verify-reset-code"
      loginPath="/mobile/email"
      testId="mobile-reset-password-page"
    />
  );
}
