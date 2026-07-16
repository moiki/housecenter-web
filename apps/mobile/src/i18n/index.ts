import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import en from './locales/en.json'
import es from './locales/es.json'

const deviceLang = getLocales()[0]?.languageCode ?? 'es'

// Pre-auth locale: device language. Post-auth, MoreScreen's language row is the ONLY
// other place that calls `i18n.changeLanguage()`, reacting to `user.language` once it
// loads — mirrors web's AuthBootstrap.tsx single-call-site pattern, avoiding the
// dark-mode-style desync bug where two independent systems each guess their own fallback.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: deviceLang === 'en' ? 'en' : 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
