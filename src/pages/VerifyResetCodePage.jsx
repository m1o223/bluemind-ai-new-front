import VerifyResetCodeScreen from "@/components/auth/VerifyResetCodeScreen";

export default function VerifyResetCodePage() {
  return (
    <VerifyResetCodeScreen
      forgotPath="/auth/forgot-password"
      resetPath="/auth/reset-password"
      testId="verify-reset-code-page"
    />
  );
}
