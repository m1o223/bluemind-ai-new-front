import api, { getApiErrorMessage, unwrapApiResponse } from "./api";
import { signInWithFirebaseGoogle } from "./firebaseClient";
import {
  dispatchUserUpdated,
  readStoredAccessToken,
  readStoredRefreshSession,
  removeStoredAuthSession,
  STORAGE_KEYS,
  storeAccessToken,
  storePreferences,
  storeRefreshSession,
  storeUser,
} from "./storageKeys";
import {
  clearSecureAuthSession,
  persistSecureAuthSession,
  prepareSecureAuthSessionForRestore,
} from "./secureSessionStorage";

async function persistSession(session) {
  if (session?.token) {
    storeAccessToken(session.token);
  }

  if (session?.session) {
    storeRefreshSession(session.session, session.refreshToken);
  }

  if (session?.token) {
    await persistSecureAuthSession(session.token, readStoredRefreshSession());
  }

  if (session?.user) {
    storeUser(session.user);
    if (session.user.preferences) {
      storePreferences(session.user.preferences);
    }

    dispatchUserUpdated({
      user: session.user,
      preferences: session.user.preferences
    });
  }

  return session;
}

function readAccessTokenPayload(token) {
  if (!token || typeof window === "undefined") return null;

  try {
    return JSON.parse(window.atob(token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") || ""));
  } catch {
    return null;
  }
}

export function getAuthDebugSnapshot() {
  const token = readStoredAccessToken();
  const payload = readAccessTokenPayload(token);
  const accessTokenExpiresAt = payload?.exp ? new Date(payload.exp * 1000).toISOString() : null;
  const refreshSession = readStoredRefreshSession();
  const refreshSessionExpiresAt = refreshSession?.expiresAt || null;

  return {
    hasAccessToken: Boolean(token),
    accessTokenExpiresAt,
    accessTokenExpired: payload?.exp ? payload.exp * 1000 <= Date.now() + 5000 : null,
    hasRefreshSessionMarker: Boolean(refreshSessionExpiresAt),
    refreshSessionExpiresAt,
    refreshSessionExpired: refreshSessionExpiresAt
      ? new Date(refreshSessionExpiresAt).getTime() <= Date.now()
      : null,
    hasStoredUser: Boolean(localStorage.getItem(STORAGE_KEYS.user)),
    authHeaderExpected: Boolean(token),
  };
}

function authDebugEnabled() {
  return localStorage.getItem(STORAGE_KEYS.authDebug) === "1";
}

function logAuthDebug(event, details = {}) {
  if (!authDebugEnabled()) return;
  console.info("[BlueMind auth debug]", event, {
    ...getAuthDebugSnapshot(),
    ...details,
  });
}

function shouldAttemptRefresh() {
  const refreshSession = readStoredRefreshSession();

  if (!refreshSession?.expiresAt) return false;
  return new Date(refreshSession.expiresAt).getTime() > Date.now();
}

export const registerUser = async (name, email, password) => {
  const response = await api.post("/auth/register", {
    name,
    email,
    password,
  });

  return persistSession(unwrapApiResponse(response));
};

export const verifyEmail = async (email, code) => {
  const response = await api.post("/auth/verify-email", {
    email,
    code,
  });

  return persistSession(unwrapApiResponse(response));
};

export const resendVerificationCode = async (email) => {
  const response = await api.post("/auth/resend-verification", { email });
  return unwrapApiResponse(response);
};

export const loginUser = async (email, password) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return persistSession(unwrapApiResponse(response));
};

export const loginGuestUser = async () => {
  const response = await api.post("/auth/guest", {});
  return persistSession(unwrapApiResponse(response));
};

export const restoreSession = async () => {
  const refreshToken = readStoredRefreshSession()?.refreshToken;
  logAuthDebug("restoreSession:before-request", {
    endpoint: "/auth/refresh",
    method: "POST",
    authorizationHeaderExpected: Boolean(readStoredAccessToken()),
    refreshTokenFallbackPresent: Boolean(refreshToken),
  });

  try {
    const response = await api.post("/auth/refresh", refreshToken ? { refreshToken } : {});
    return persistSession(unwrapApiResponse(response));
  } catch (error) {
    if ([401, 403].includes(error?.response?.status)) {
      removeStoredAuthSession();
      await clearSecureAuthSession();
    }
    throw error;
  }
};

export const getCurrentUser = async () => {
  logAuthDebug("getCurrentUser:before-request", {
    endpoint: "/auth/me",
    method: "GET",
    authorizationHeaderExpected: Boolean(readStoredAccessToken()),
  });

  const response = await api.get("/auth/me");
  const user = unwrapApiResponse(response)?.user;

  if (user) {
    await persistSession({ user });
  }

  return user;
};

async function performSessionRestore() {
  await prepareSecureAuthSessionForRestore();
  const snapshot = getAuthDebugSnapshot();
  logAuthDebug("restoreExistingSession:start", snapshot);

  if (snapshot.hasAccessToken && snapshot.accessTokenExpired !== true) {
    try {
      return await getCurrentUser();
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        removeStoredAuthSession();
        await clearSecureAuthSession();
      }
      throw error;
    }
  }

  if (snapshot.hasAccessToken && snapshot.accessTokenExpired === true && !shouldAttemptRefresh()) {
    removeStoredAuthSession();
    await clearSecureAuthSession();
    throw new Error("AUTH_SESSION_EXPIRED");
  }

  if (!snapshot.hasAccessToken && !shouldAttemptRefresh()) {
    removeStoredAuthSession();
    await clearSecureAuthSession();
    throw new Error("AUTH_SESSION_MISSING");
  }

  return restoreSession();
}

let sessionRestoreInFlight = null;

export const restoreExistingSession = () => {
  if (!sessionRestoreInFlight) {
    sessionRestoreInFlight = performSessionRestore().finally(() => {
      sessionRestoreInFlight = null;
    });
  }
  return sessionRestoreInFlight;
};

export const signInWithGoogle = async () => {
  const idToken = await signInWithFirebaseGoogle();
  const response = await api.post("/auth/firebase/google", { idToken });
  return persistSession(unwrapApiResponse(response));
};

export function getGoogleSignInErrorMessage(error, fallback = "Google sign-in failed. Please try again.") {
  if (error?.code === "FIREBASE_AUTH_CONFIG_MISSING") {
    console.warn("[BlueMind auth] Firebase Google sign-in config is missing", {
      missing: error.missing,
    });
    return "Google sign-in is temporarily unavailable. Please use email and password for now.";
  }

  return getApiErrorMessage(error, fallback);
}

export const logoutUser = async () => {
  const refreshToken = readStoredRefreshSession()?.refreshToken;
  try {
    await api.post("/auth/logout", refreshToken ? { refreshToken } : {});
  } finally {
    removeStoredAuthSession();
    await clearSecureAuthSession();
    sessionStorage.removeItem(STORAGE_KEYS.pendingVerificationEmail);
  }
};

export const clearLocalSession = () => {
  removeStoredAuthSession();
  void clearSecureAuthSession();
};

export const requestPasswordReset = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return unwrapApiResponse(response);
};

export const verifyPasswordResetCode = async (email, code) => {
  const response = await api.post("/auth/verify-reset-code", { email, code });
  return unwrapApiResponse(response);
};

export const resetPassword = async (emailOrPayload, code, password) => {
  const payload = typeof emailOrPayload === "object"
    ? emailOrPayload
    : { email: emailOrPayload, code, password };
  const response = await api.post("/auth/reset-password", payload);

  removeStoredAuthSession();
  await clearSecureAuthSession();
  return unwrapApiResponse(response);
};

export const requestEmailChange = async (currentPassword, newEmail) => {
  const response = await api.post("/auth/change-email/request", {
    currentPassword,
    newEmail,
  });

  return unwrapApiResponse(response);
};

export const confirmEmailChange = async (code) => {
  const response = await api.post("/auth/change-email/confirm", { code });
  const result = unwrapApiResponse(response);

  if (result?.user) {
    storeUser(result.user);
    dispatchUserUpdated({
      user: result.user,
      preferences: result.user.preferences,
    });
  }

  return result;
};

export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const response = await api.post("/auth/change-password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });

  return unwrapApiResponse(response);
};

export const getAccountDeletionStatus = async () => {
  const response = await api.get("/auth/delete-status");
  return unwrapApiResponse(response);
};

export const requestAccountDeletion = async (password) => {
  const response = await api.post("/auth/delete-request", { password });
  return unwrapApiResponse(response);
};

export const cancelAccountDeletion = async () => {
  const response = await api.post("/auth/delete-cancel", {});
  return unwrapApiResponse(response);
};
