// Settings module (Phase 2, final batch). The Language/Dark-mode toggle *mutations*
// (`SettingsPage.tsx`) were already wired in Phase 1 — this namespace covers the
// remaining hardcoded JSX copy around them: section headers, labels, descriptions, and
// the read-only-profile hint. `common.fields.email/phone/address` are reused for the
// profile fields (see `ClinicsPage.tsx` for the same reuse pattern); "Profession" isn't
// shared by any other module, so — following the "Status" column precedent in
// `management.ts` — it stays local here instead of being hoisted to `common.fields`.
export const settingsEn = {
  title: 'Settings',
  description: 'Manage your account and preferences.',
  profile: {
    header: 'Profile',
    fields: {
      profession: 'Profession',
    },
    adminHint: 'To update your profile information, contact an administrator.',
  },
  appearance: {
    header: 'Appearance',
    darkMode: {
      label: 'Dark mode',
      description: 'Switch between light and dark theme.',
    },
    language: {
      label: 'Language',
      description: 'Switch between English and Spanish.',
    },
  },
}

export const settingsEs = {
  title: 'Configuración',
  description: 'Administrá tu cuenta y tus preferencias.',
  profile: {
    header: 'Perfil',
    fields: {
      profession: 'Profesión',
    },
    adminHint: 'Para actualizar tu información de perfil, contactá a un administrador.',
  },
  appearance: {
    header: 'Apariencia',
    darkMode: {
      label: 'Modo oscuro',
      description: 'Alterná entre el tema claro y el oscuro.',
    },
    language: {
      label: 'Idioma',
      description: 'Alterná entre inglés y español.',
    },
  },
}
