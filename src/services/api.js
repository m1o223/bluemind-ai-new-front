import axios from "axios";
import {
  readStoredRefreshSession,
  readStoredUser,
  removeStoredAuthSession,
  STORAGE_KEYS,
  storeRefreshSession,
} from "./storageKeys";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.VITE_API_URL ||
  "https://bluemind-ai-new.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
});

function authDebugEnabled() {
  if (typeof window === "undefined") return false;

  try {
    const params = new URLSearchParams(window.location.search);
    const debugParam = params.get("authDebug");

    if (debugParam === "1") {
      localStorage.setItem(STORAGE_KEYS.authDebug, "1");
    }

    if (debugParam === "0") {
      localStorage.removeItem(STORAGE_KEYS.authDebug);
    }

    return localStorage.getItem(STORAGE_KEYS.authDebug) === "1";
  } catch {
    return false;
  }
}

function tokenExpiryState(token) {
  if (!token || typeof window === "undefined") {
    return { hasAccessToken: Boolean(token), accessTokenExpired: null };
  }

  try {
    const payload = JSON.parse(window.atob(token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") || ""));
    const expiresAtMs = Number(payload.exp || 0) * 1000;

    return {
      hasAccessToken: true,
      accessTokenExpired: expiresAtMs ? expiresAtMs <= Date.now() + 5000 : null,
      accessTokenExpiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    };
  } catch {
    return { hasAccessToken: true, accessTokenExpired: null };
  }
}

function logAuthRequest(config, token) {
  if (!authDebugEnabled()) return;

  const url = String(config.url || "");
  const isRelevant = url.includes("/auth/") || url.includes("/reminders");

  if (!isRelevant) return;

  const refreshSession = readStoredRefreshSession();

  console.info("[BlueMind auth debug] request", {
    method: String(config.method || "get").toUpperCase(),
    url,
    baseURL: config.baseURL || API_BASE_URL,
    withCredentials: config.withCredentials ?? true,
    authorizationHeaderPresent: Boolean(config.headers?.Authorization),
    ...tokenExpiryState(token),
    hasRefreshSessionMarker: Boolean(refreshSession?.expiresAt),
    refreshSessionExpired: refreshSession?.expiresAt
      ? new Date(refreshSession.expiresAt).getTime() <= Date.now()
      : null,
    hasStoredUser: Boolean(readStoredUser()),
  });
}

function canAttemptRefreshSession() {
  const refreshSession = readStoredRefreshSession();

  if (!refreshSession?.expiresAt) return false;
  return new Date(refreshSession.expiresAt).getTime() > Date.now();
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  logAuthRequest(config, token);

  return config;
});

export function unwrapApiResponse(response) {
  return response?.data?.data ?? response?.data;
}

export function getApiErrorMessage(error, fallback = "Request failed") {
  if (error?.code === "ERR_NETWORK") {
    return "Cannot reach BlueMind backend. Please try again in a moment.";
  }

  const rawMessage = (
    error?.response?.data?.error?.message ||
    error?.response?.data?.error?.code ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
  const errorCode = error?.response?.data?.error?.code;
  const technicalEmailPattern = /SMTP_|SMTP |SMTP connection|SMTP auth|Gmail App Password|EMAIL_SEND_FAILED|EMAIL_PROVIDER|502 Bad Gateway|Bad Gateway/i;

  if (errorCode === "EMAIL_SEND_FAILED" || technicalEmailPattern.test(String(rawMessage))) {
    return "We couldn't send the reset code right now. Please try again later.";
  }

  return rawMessage;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const isAuthRefresh = originalRequest?.url?.includes("/auth/refresh");
    const isAuthLogin = originalRequest?.url?.includes("/auth/login");
    const isAuthRegister = originalRequest?.url?.includes("/auth/register");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRefresh &&
      !isAuthLogin &&
      !isAuthRegister &&
      canAttemptRefreshSession()
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = readStoredRefreshSession()?.refreshToken;
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true },
        );
        const session = unwrapApiResponse(refreshResponse);

        if (session?.token) {
          localStorage.setItem(STORAGE_KEYS.token, session.token);
          storeRefreshSession(session.session, session.refreshToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${session.token}`;
          return api(originalRequest);
        }
      } catch {
        removeStoredAuthSession();
      }
    }

    if (status === 401 && !isAuthLogin && !isAuthRegister && !isAuthRefresh && !canAttemptRefreshSession()) {
      removeStoredAuthSession();
    }

    return Promise.reject(error);
  },
);

export default api;
