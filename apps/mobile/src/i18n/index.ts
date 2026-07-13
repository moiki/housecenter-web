import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import es from './locales/es.json'

// expo-localization surfaces the device locale for future multi-locale support; only `es` ships
// in this foundation PR, so the device locale never actually changes the resolved language yet
// (R5's own scenario asserts init happens "with no device-locale override").
const deviceLang = getLocales()[0]?.languageCode ?? 'es'

i18n.use(initReactI18next).init({
  resources: { es: { translation: es } },
  lng: deviceLang === 'es' ? 'es' : 'es', // es-only for now; structure ready for more locales
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
