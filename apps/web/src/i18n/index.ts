import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { coreResources } from 'core/i18n'
import { clinicsEn, clinicsEs } from '@/i18n/namespaces/clinics'
import { navEn, navEs } from '@/i18n/namespaces/nav'
import { authEn, authEs } from '@/i18n/namespaces/auth'
import { patientsEn, patientsEs } from '@/i18n/namespaces/patients'
import { workRoutesEn, workRoutesEs } from '@/i18n/namespaces/workRoutes'
import { consultationsEn, consultationsEs } from '@/i18n/namespaces/consultations'
import { collaboratorsEn, collaboratorsEs } from '@/i18n/namespaces/collaborators'
import { reportsEn, reportsEs } from '@/i18n/namespaces/reports'
import { dashboardEn, dashboardEs } from '@/i18n/namespaces/dashboard'
import { sessionsChartEn, sessionsChartEs } from '@/i18n/namespaces/sessionsChart'
import { managementEn, managementEs } from '@/i18n/namespaces/management'
import { settingsEn, settingsEs } from '@/i18n/namespaces/settings'
import { helpEn, helpEs } from '@/i18n/namespaces/help'
import { shellEn, shellEs } from '@/i18n/namespaces/shell'

// Web-specific namespaces merge in here alongside core's shared ones — one entry per
// page module as Phase 2 extracts it (see `clinics` for the first one, the pilot).
//
// Everything is nested under a single `translation` key (i18next's default namespace)
// rather than each becoming its own top-level i18next *namespace* — every `t('auth.xxx')`
// / `t('common.xxx')` call across the app relies on the dot being a plain nested-key
// path within ONE namespace, not i18next's `namespace:key` separator (which is `:`, not
// `.`). Mirrors mobile's `i18n/index.ts` (`resources: { en: { translation: en } }`),
// which already does this correctly.
const resources = {
  en: {
    translation: {
      ...coreResources.en,
      clinics: clinicsEn,
      nav: navEn,
      auth: authEn,
      patients: patientsEn,
      workRoutes: workRoutesEn,
      consultations: consultationsEn,
      collaborators: collaboratorsEn,
      reports: reportsEn,
      dashboard: dashboardEn,
      sessionsChart: sessionsChartEn,
      management: managementEn,
      settings: settingsEn,
      help: helpEn,
      shell: shellEn,
    },
  },
  es: {
    translation: {
      ...coreResources.es,
      clinics: clinicsEs,
      nav: navEs,
      auth: authEs,
      patients: patientsEs,
      workRoutes: workRoutesEs,
      consultations: consultationsEs,
      collaborators: collaboratorsEs,
      reports: reportsEs,
      dashboard: dashboardEs,
      sessionsChart: sessionsChartEs,
      management: managementEs,
      settings: settingsEs,
      help: helpEs,
      shell: shellEs,
    },
  },
}

// Pre-auth locale: browser language. Post-auth: `AuthBootstrap.tsx` is the ONLY other
// place that calls `i18n.changeLanguage()`, reacting to `user.language` once it loads —
// see its comment for why a second, independently-guessing fallback here would repeat
// the exact bug `AppThemeProvider.tsx`'s dark-mode fallback caused.
const browserLanguage = navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'

i18n.use(initReactI18next).init({
  resources,
  lng: browserLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
