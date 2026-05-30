import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { defaultNamespace, fallbackLanguage, resources } from "./resources";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: fallbackLanguage,
      fallbackLng: fallbackLanguage,
      ns: [defaultNamespace],
      defaultNS: defaultNamespace,
      fallbackNS: defaultNamespace,
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
      returnEmptyString: false,
    });
}

export default i18n;
