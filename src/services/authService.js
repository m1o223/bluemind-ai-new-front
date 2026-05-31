import api, { API_BASE_URL, unwrapApiResponse } from "./api";
import {
  dispatchUserUpdated,
  readStoredRefreshSession,
  removeStoredAuthSession,
  removeStoredRefreshSession,
  STORAGE_KEYS,
  storePreferences,
  storeRefreshSession,
  storeUser,
} from "./storageKeys";

function persistSession(session) {
  if (session?.token) {
    localStorage.setItem(STORAGE_KEYS.token, session.token);
  }

  if (session?.session) {
    storeRefreshSession(session.session);
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
  const token = localStorage.getItem(STORAGE_KEYS.token);
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
  logAuthDebug("restoreSession:before-request", {
    endpoint: "/auth/refresh",
    method: "POST",
    authorizationHeaderExpected: Boolean(localStorage.getItem(STORAGE_KEYS.token)),
  });

  const response = await api.post("/auth/refresh", {});
  return persistSession(unwrapApiResponse(response));
};

export const getCurrentUser = async () => {
  logAuthDebug("getCurrentUser:before-request", {
    endpoint: "/auth/me",
    method: "GET",
    authorizationHeaderExpected: Boolean(localStorage.getItem(STORAGE_KEYS.token)),
  });

  const response = await api.get("/auth/me");
  const user = unwrapApiResponse(response)?.user;

  if (user) {
    persistSession({ user });
  }

  return user;
};

export const restoreExistingSession = async () => {
  const snapshot = getAuthDebugSnapshot();
  logAuthDebug("restoreExistingSession:start", snapshot);

  if (snapshot.hasAccessToken && snapshot.accessTokenExpired !== true) {
    return getCurrentUser();
  }

  if (snapshot.hasAccessToken && snapshot.accessTokenExpired === true && !shouldAttemptRefresh()) {
    removeStoredAuthSession();
    throw new Error("AUTH_SESSION_EXPIRED");
  }

  if (!snapshot.hasAccessToken && !shouldAttemptRefresh()) {
    removeStoredRefreshSession();
    throw new Error("AUTH_SESSION_MISSING");
  }

  return restoreSession();
};

export const startGoogleLogin = () => {
  window.location.href = `${API_BASE_URL}/auth/google`;
};

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout", {});
  } finally {
    removeStoredAuthSession();
    sessionStorage.removeItem(STORAGE_KEYS.pendingVerificationEmail);
  }
};

export const clearLocalSession = () => {
  removeStoredAuthSession();
};

export const requestPasswordReset = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return unwrapApiResponse(response);
};

export const resetPassword = async (email, code, password) => {
  const response = await api.post("/auth/reset-password", {
    email,
    code,
    password,
  });

  removeStoredAuthSession();
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
