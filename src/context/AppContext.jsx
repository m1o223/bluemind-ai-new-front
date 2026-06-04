import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import languages from "@/data/languages";
import { fallbackLanguage } from "@/i18n/resources";
import {
  CSS_VARIABLES,
  LEGACY_USER_UPDATED_EVENT,
  readStoredPreferences,
  readStoredUser,
  storePreferences,
  USER_UPDATED_EVENT,
} from "@/services/storageKeys";
import { ensureUiLanguage } from "@/services/translationService";

const defaultPrefs = {
  theme: "system",
  appColor: "#193B68",
  accentColor: "#193B68",
  chatColor: "#193B68",
  appLanguage: "en",
  language: "en",
  aiLanguageMode: "auto",
  notificationPreferences: undefined,
  birthdayGreetings: true,
  animations: true,
  openAppDirectlyToChat: false,
};

function normalizePrefs(preferences = {}) {
  const appColor = preferences.appColor || preferences.accentColor || defaultPrefs.appColor;
  const appLanguage = String(preferences.appLanguage || preferences.language || defaultPrefs.appLanguage).toLowerCase();
  const aiLanguageMode = ["auto", "match_app"].includes(preferences.aiLanguageMode)
    ? preferences.aiLanguageMode
    : defaultPrefs.aiLanguageMode;

  return {
    ...defaultPrefs,
    ...preferences,
    theme: ["light", "dark", "system"].includes(preferences.theme)
      ? preferences.theme
      : defaultPrefs.theme,
    appColor,
    accentColor: appColor,
    chatColor: preferences.chatColor || defaultPrefs.chatColor,
    appLanguage,
    language: appLanguage,
    aiLanguageMode,
    birthdayGreetings: preferences.birthdayGreetings !== false,
    animations: preferences.animations !== false,
    openAppDirectlyToChat: preferences.openAppDirectlyToChat === true,
  };
}

function loadCachedPrefs() {
  try {
    const storedUser = readStoredUser();
    const storedPrefs = readStoredPreferences();

    return normalizePrefs(storedUser?.preferences || storedPrefs || defaultPrefs);
  } catch {
    return defaultPrefs;
  }
}

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false;
}

const AppContext = createContext(null);
const RTL_LANGUAGE_CODES = new Set(languages.filter((language) => language.rtl).map((language) => language.code));

function resolveUiLanguage(language) {
  const normalized = String(language || defaultPrefs.language).trim().replace("_", "-").toLowerCase();

  if (/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(normalized)) {
    return normalized;
  }

  return fallbackLanguage;
}

export function AppProvider({ children }) {
  const { t } = useTranslation();
  const [prefs, setPrefsState] = useState(loadCachedPrefs);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  const resolvedTheme = prefs.theme === "system"
    ? systemDark ? "dark" : "light"
    : prefs.theme;
  const uiLanguage = resolveUiLanguage(prefs.appLanguage);
  const isRTL = RTL_LANGUAGE_CODES.has(uiLanguage.split("-")[0]);

  useEffect(() => {
    let cancelled = false;

    i18n.changeLanguage(uiLanguage);

    ensureUiLanguage(uiLanguage)
      .then((resolvedLanguage) => {
        if (!cancelled) {
          i18n.changeLanguage(resolvedLanguage);
        }
      })
      .catch(() => {
        if (!cancelled) {
          i18n.changeLanguage(fallbackLanguage);
        }
      });

    document.documentElement.lang = uiLanguage;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.animations = prefs.animations === false ? "off" : "on";
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.setProperty(CSS_VARIABLES.appColor, prefs.appColor || defaultPrefs.appColor);
    document.documentElement.style.setProperty(CSS_VARIABLES.chatColor, prefs.chatColor || defaultPrefs.chatColor);
    storePreferences(prefs);

    return () => {
      cancelled = true;
    };
  }, [isRTL, prefs, resolvedTheme, uiLanguage]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;

    const handler = () => setSystemDark(media.matches);
    media.addEventListener?.("change", handler);
    media.addListener?.(handler);

    return () => {
      media.removeEventListener?.("change", handler);
      media.removeListener?.(handler);
    };
  }, []);

  useEffect(() => {
    const handleUserUpdated = (event) => {
      const preferences = event.detail?.user?.preferences || event.detail?.preferences;

      if (preferences) {
        setPrefsState(normalizePrefs(preferences));
      }
    };

    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated);
    window.addEventListener(LEGACY_USER_UPDATED_EVENT, handleUserUpdated);

    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdated);
      window.removeEventListener(LEGACY_USER_UPDATED_EVENT, handleUserUpdated);
    };
  }, []);

  const setPrefs = useCallback((preferences) => {
    setPrefsState(normalizePrefs(preferences));
  }, []);

  const updatePref = useCallback((key, value) => {
    setPrefsState((prev) => normalizePrefs({
      ...prev,
      [key]: value,
    }));
  }, []);

  const value = useMemo(() => ({
    prefs,
    setPrefs,
    updatePref,
    t,
    isRTL,
    resolvedTheme,
    uiLanguage,
    hasTranslations: true,
  }), [prefs, isRTL, resolvedTheme, setPrefs, t, uiLanguage, updatePref]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
