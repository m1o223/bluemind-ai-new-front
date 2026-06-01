import enCommon from "@/locales/en/common.json";
import arCommon from "@/locales/ar/common.json";
import afCommon from "@/locales/af/common.json";
import deCommon from "@/locales/de/common.json";
import esCommon from "@/locales/es/common.json";
import frCommon from "@/locales/fr/common.json";
import hiCommon from "@/locales/hi/common.json";
import jaCommon from "@/locales/ja/common.json";

export const fallbackLanguage = "en";
export const defaultNamespace = "common";
export const baseTranslation = enCommon;

const localTranslations = {
  en: enCommon,
  ar: arCommon,
  af: afCommon,
  de: deCommon,
  es: esCommon,
  fr: frCommon,
  hi: hiCommon,
  ja: jaCommon,
};

function withEnglishFallback(translations = {}) {
  return {
    ...baseTranslation,
    ...translations,
  };
}

export const resources = Object.fromEntries(
  Object.entries(localTranslations).map(([language, translations]) => [
    language,
    {
      [defaultNamespace]: language === fallbackLanguage
        ? translations
        : withEnglishFallback(translations),
    },
  ]),
);

export const bundledUiLanguages = Object.keys(resources);

export function hasBundledLanguage(language) {
  const normalized = String(language || "").trim().replace("_", "-").toLowerCase();
  const baseLanguage = normalized.split("-")[0];

  return Boolean(resources[normalized] || resources[baseLanguage]);
}
