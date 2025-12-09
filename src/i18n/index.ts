/**
 * i18next Configuration for Airport Wayfinder Kiosk
 * Supports English, Spanish, and French with browser language detection
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

// Define resource bundles for all supported languages
const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
};

// Initialize i18next with browser language detection
i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18next;
