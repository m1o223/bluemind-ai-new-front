export const STORAGE_KEYS = {
  token: "token",
  user: "bluemind_user",
  preferences: "bluemind_prefs",
  refreshSession: "bluemind_refresh_session",
  authDebug: "bluemind_auth_debug",
  pendingVerificationEmail: "pendingVerificationEmail",
};

const LEGACY_PREFIX = ["fi", "nda"].join("");

export const LEGACY_STORAGE_KEYS = {
  user: `${LEGACY_PREFIX}_user`,
  preferences: `${LEGACY_PREFIX}_prefs`,
};

export const USER_UPDATED_EVENT = "bluemind:user-updated";
export const LEGACY_USER_UPDATED_EVENT = `${LEGACY_PREFIX}:user-updated`;
export const AUTH_SESSION_CLEARED_EVENT = "bluemind:auth-session-cleared";

export const CSS_VARIABLES = {
  appColor: "--bluemind-app-color",
  chatColor: "--bluemind-chat-color",
};

let accessTokenMemory = null;
let refreshTokenMemory = null;

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function migrateLegacyStorage() {
  if (typeof localStorage === "undefined") return;

  if (!localStorage.getItem(STORAGE_KEYS.user) && localStorage.getItem(LEGACY_STORAGE_KEYS.user)) {
    localStorage.setItem(STORAGE_KEYS.user, localStorage.getItem(LEGACY_STORAGE_KEYS.user));
  }

  if (!localStorage.getItem(STORAGE_KEYS.preferences) && localStorage.getItem(LEGACY_STORAGE_KEYS.preferences)) {
    localStorage.setItem(STORAGE_KEYS.preferences, localStorage.getItem(LEGACY_STORAGE_KEYS.preferences));
  }

  localStorage.removeItem(LEGACY_STORAGE_KEYS.user);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.preferences);
}

export function readStoredUser() {
  migrateLegacyStorage();
  return readJson(STORAGE_KEYS.user);
}

export function readStoredPreferences() {
  migrateLegacyStorage();
  return readJson(STORAGE_KEYS.preferences);
}

export function storeUser(user) {
  if (!user) return;
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.removeItem(LEGACY_STORAGE_KEYS.user);
}

export function storePreferences(preferences) {
  if (!preferences) return;
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
  localStorage.removeItem(LEGACY_STORAGE_KEYS.preferences);
}

export function readStoredRefreshSession() {
  const session = readJson(STORAGE_KEYS.refreshSession);
  if (!session) return null;

  if (session.refreshToken && !refreshTokenMemory) {
    refreshTokenMemory = session.refreshToken;
    const { refreshToken, ...metadata } = session;
    localStorage.setItem(STORAGE_KEYS.refreshSession, JSON.stringify(metadata));
  }

  return {
    ...session,
    ...(refreshTokenMemory ? { refreshToken: refreshTokenMemory } : {}),
  };
}

export function storeRefreshSession(session, refreshToken = undefined) {
  if (!session?.expiresAt) return;

  if (refreshToken) refreshTokenMemory = refreshToken;

  localStorage.setItem(STORAGE_KEYS.refreshSession, JSON.stringify({
    id: session.id,
    expiresAt: session.expiresAt,
  }));
}

export function readStoredAccessToken() {
  if (!accessTokenMemory) {
    accessTokenMemory = localStorage.getItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.token);
  }
  return accessTokenMemory;
}

export function storeAccessToken(token) {
  accessTokenMemory = token || null;
  localStorage.removeItem(STORAGE_KEYS.token);
}

export function hydrateAuthSessionSecrets(token, refreshSession) {
  accessTokenMemory = token || null;
  refreshTokenMemory = refreshSession?.refreshToken || null;
  localStorage.removeItem(STORAGE_KEYS.token);
  if (refreshSession?.expiresAt) {
    localStorage.setItem(STORAGE_KEYS.refreshSession, JSON.stringify({
      id: refreshSession.id,
      expiresAt: refreshSession.expiresAt,
    }));
  }
}

export function removeStoredRefreshSession() {
  refreshTokenMemory = null;
  localStorage.removeItem(STORAGE_KEYS.refreshSession);
}

export function removeStoredUser() {
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.user);
}

export function removeStoredAuthSession() {
  storeAccessToken(null);
  removeStoredUser();
  removeStoredRefreshSession();
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CLEARED_EVENT));
}

export function dispatchUserUpdated(detail) {
  window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail }));
}
