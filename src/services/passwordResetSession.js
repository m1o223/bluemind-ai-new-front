const RESET_EMAIL_KEY = "bluemind_password_reset_email";
const RESET_TOKEN_KEY = "bluemind_password_reset_token";
const RESET_EXPIRES_KEY = "bluemind_password_reset_expires_at";

export function storePasswordResetEmail(email) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESET_EMAIL_KEY, email);
}

export function readPasswordResetEmail() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(RESET_EMAIL_KEY) || "";
}

export function storePasswordResetSession({ email, resetToken, expiresAt }) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESET_EMAIL_KEY, email);
  sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
  if (expiresAt) {
    sessionStorage.setItem(RESET_EXPIRES_KEY, expiresAt);
  }
}

export function readPasswordResetSession() {
  if (typeof window === "undefined") return null;

  const email = sessionStorage.getItem(RESET_EMAIL_KEY) || "";
  const resetToken = sessionStorage.getItem(RESET_TOKEN_KEY) || "";
  const expiresAt = sessionStorage.getItem(RESET_EXPIRES_KEY) || "";

  if (!email || !resetToken) return null;

  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    clearPasswordResetSession();
    return null;
  }

  return { email, resetToken, expiresAt };
}

export function clearPasswordResetSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RESET_EMAIL_KEY);
  sessionStorage.removeItem(RESET_TOKEN_KEY);
  sessionStorage.removeItem(RESET_EXPIRES_KEY);
}
