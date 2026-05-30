import i18n from "@/i18n";
import {
  baseTranslation,
  defaultNamespace,
  fallbackLanguage,
  hasBundledLanguage,
} from "@/i18n/resources";
import api, { unwrapApiResponse } from "./api";

const namespace = defaultNamespace;

function normalizeLanguage(language) {
  return String(language || "en").trim().replace("_", "-").toLowerCase();
}

function cacheKey(language) {
  return `bluemind_i18n_${namespace}_v2_${language}`;
}

function addBundle(language, translations) {
  i18n.addResourceBundle(language, namespace, translations, true, true);
}

function readCached(language) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(language)) || "null");
    return cached?.translations || null;
  } catch {
    return null;
  }
}

function writeCached(language, translations) {
  localStorage.setItem(cacheKey(language), JSON.stringify({
    translations,
    cachedAt: new Date().toISOString(),
  }));
}

export async function ensureUiLanguage(language) {
  const normalized = normalizeLanguage(language);
  const baseLanguage = normalized.split("-")[0];

  if (normalized === fallbackLanguage) {
    return normalized;
  }

  const cached = readCached(normalized);

  if (cached) {
    addBundle(normalized, { ...baseTranslation, ...cached });
    return normalized;
  }

  try {
    const response = await api.get(`/preferences/translations/${encodeURIComponent(normalized)}`);
    const translations = unwrapApiResponse(response)?.translations;

    if (translations && typeof translations === "object") {
      const merged = { ...baseTranslation, ...translations };
      addBundle(normalized, merged);
      writeCached(normalized, translations);
      return normalized;
    }
  } catch {
    // The UI remains usable in English if the translation API is unavailable.
  }

  if (hasBundledLanguage(normalized)) {
    return normalized;
  }

  addBundle(normalized, baseTranslation);
  if (baseLanguage && baseLanguage !== normalized) {
    addBundle(baseLanguage, baseTranslation);
  }
  return normalized;
}
