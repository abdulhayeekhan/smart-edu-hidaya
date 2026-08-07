import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
  en: {
    translation: translationEN.translation
  },
  ar: {
    translation: translationAR.translation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

// Handle RTL direction globally
(i18n as any).on('languageChanged', (lng: string) => {
  document.documentElement.lang = lng;
  document.dir = lng === 'ar' ? 'rtl' : 'ltr';
  // If the template relies on a body class instead of dir attribute:
  if (lng === 'ar') {
    document.body.classList.add('rtl');
  } else {
    document.body.classList.remove('rtl');
  }
});

export default i18n;
