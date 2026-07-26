import VerifyResetCodeScreen from "@/components/auth/VerifyResetCodeScreen";

export default function MobileVerifyResetCode() {
  return (
    <VerifyResetCodeScreen
      mobile
      forgotPath="/mobile/forgot-password"
      resetPath="/mobile/reset-password"
      testId="mobile-verify-reset-code-page"
    />
  );
}
