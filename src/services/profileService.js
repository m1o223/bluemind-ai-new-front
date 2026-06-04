import api, { unwrapApiResponse } from "./api";
import {
  dispatchUserUpdated,
  storePreferences,
  storeUser,
} from "./storageKeys";

export const getProfile = async () => {
  const response = await api.get("/auth/me");
  const user = unwrapApiResponse(response)?.user;

  if (user?.preferences) {
    storeUser(user);
    storePreferences(user.preferences);
    dispatchUserUpdated({
      user,
      preferences: user.preferences
    });
  }

  return user;
};

export const getPreferences = async () => {
  const response = await api.get("/preferences");
  const preferences = unwrapApiResponse(response)?.preferences;

  if (preferences) {
    storePreferences(preferences);
    dispatchUserUpdated({ preferences });
  }

  return preferences;
};

export const updatePreferences = async (data) => {
  try {
    const response = await api.patch("/preferences", data);
    const result = unwrapApiResponse(response);
    const user = result?.user;
    const preferences = result?.preferences || user?.preferences;

    if (preferences) {
      storePreferences(preferences);
    }

    if (user) {
      storeUser(user);
    }

    dispatchUserUpdated({
      user,
      preferences
    });

    return result;
  } catch (error) {
    console.error("[preferences:update]", error.response?.data || error.message);
    throw error;
  }
};

export const updateProfile = async (data) => {
  try {
    const response = await api.patch("/auth/profile", data);
    const user = unwrapApiResponse(response)?.user;

    if (user) {
      storeUser(user);

      if (user.preferences) {
        storePreferences(user.preferences);
      }

      dispatchUserUpdated({
        user,
        preferences: user.preferences
      });
    }

    return user;
  } catch (error) {
    console.error("[profile:update]", error.response?.data || error.message);
    throw error;
  }
};
