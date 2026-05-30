import axios from "axios";
import { removeStoredUser, STORAGE_KEYS } from "./storageKeys";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.VITE_API_URL ||
  "https://bluemind-ai-new.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function unwrapApiResponse(response) {
  return response?.data?.data ?? response?.data;
}

export function getApiErrorMessage(error, fallback = "Request failed") {
  if (error?.code === "ERR_NETWORK") {
    return "Cannot reach BlueMind backend. Please try again in a moment.";
  }

  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.error?.code ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
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
      !isAuthRegister
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const session = unwrapApiResponse(refreshResponse);

        if (session?.token) {
          localStorage.setItem(STORAGE_KEYS.token, session.token);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${session.token}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.token);
        removeStoredUser();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
