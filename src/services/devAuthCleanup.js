import { API_BASE_URL } from "./api";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "./storageKeys";

const DEV_AUTH_CLEANUP_VERSION = "bluemind-auth-cleanup-2026-05-20-v4";
const CLEANUP_MARKER_KEY = "bluemind_dev_auth_cleanup_version";

const AUTH_STORAGE_KEYS = [
  STORAGE_KEYS.token,
  STORAGE_KEYS.user,
  STORAGE_KEYS.preferences,
  LEGACY_STORAGE_KEYS.user,
  LEGACY_STORAGE_KEYS.preferences,
  "authToken",
  "accessToken",
  "refreshToken",
  "user",
  "mock_user",
  "mockAuth",
  "fakeAuth",
  "dummyAuth",
  "bluemind_token",
];

function isLocalDevelopmentHost() {
  if (typeof window === "undefined") return false;

  const host = window.location.hostname;
  const loopbackName = ["local", "host"].join("");
  const loopbackIpv6 = ["::", "1"].join("");

  return host === loopbackName || host === loopbackIpv6 || /^127(?:\.\d{1,3}){3}$/.test(host);
}

function removeAuthStorage(storage) {
  if (!storage) return;

  AUTH_STORAGE_KEYS.forEach((key) => storage.removeItem(key));

  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));

  keys
    .filter(Boolean)
    .filter((key) => /auth|token|session|credential|mock|fake|dummy/i.test(key))
    .forEach((key) => storage.removeItem(key));
}

function expireAccessibleAuthCookies() {
  if (typeof document === "undefined") return;

  const cookies = ["bluemind_refresh", "bluemind_oauth_state"];
  const paths = ["/", "/api", "/api/auth"];

  cookies.forEach((name) => {
    paths.forEach((path) => {
      document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax`;
    });
  });
}

export async function runDevAuthStartupCleanup() {
  if (!isLocalDevelopmentHost()) return;

  const alreadyCleaned = localStorage.getItem(CLEANUP_MARKER_KEY) === DEV_AUTH_CLEANUP_VERSION;

  if (alreadyCleaned) return;

  removeAuthStorage(localStorage);
  removeAuthStorage(sessionStorage);
  expireAccessibleAuthCookies();
  localStorage.setItem(CLEANUP_MARKER_KEY, DEV_AUTH_CLEANUP_VERSION);

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch {
    // The backend may not be running yet during local startup. Storage cleanup still happened.
  }
}
