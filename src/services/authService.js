import api, { API_BASE_URL, unwrapApiResponse } from "./api";
import {
  dispatchUserUpdated,
  removeStoredUser,
  STORAGE_KEYS,
  storePreferences,
  storeUser,
} from "./storageKeys";

function persistSession(session) {
  if (session?.token) {
    localStorage.setItem(STORAGE_KEYS.token, session.token);
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
  const response = await api.post("/auth/refresh", {});
  return persistSession(unwrapApiResponse(response));
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  const user = unwrapApiResponse(response)?.user;

  if (user) {
    persistSession({ user });
  }

  return user;
};

export const startGoogleLogin = () => {
  window.location.href = `${API_BASE_URL}/auth/google`;
};

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout", {});
  } finally {
    localStorage.removeItem(STORAGE_KEYS.token);
    removeStoredUser();
    sessionStorage.removeItem(STORAGE_KEYS.pendingVerificationEmail);
  }
};

export const clearLocalSession = () => {
  localStorage.removeItem(STORAGE_KEYS.token);
  removeStoredUser();
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

  localStorage.removeItem(STORAGE_KEYS.token);
  removeStoredUser();
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
