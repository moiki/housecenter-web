// App-shell chrome that isn't owned by any single page module: the notification bell
// (Topbar) and the error boundary's fallback UI. Dev-only diagnostic text inside
// ErrorBoundary (component stack, error.message, the "Boundary: {label}" caption) stays
// English on purpose — it's developer debugging output, not end-user copy.
export const shellEn = {
  notifications: {
    tooltip: 'Notifications',
    header: 'Notifications',
    markAllRead: 'Mark all read',
    empty: 'No notifications yet.',
  },
  errorBoundary: {
    heading: 'Something went wrong',
    prodDescription: 'An unexpected error occurred. Please reload the page and try again.',
    reloadButton: 'Reload page',
    tryAgainButton: 'Try again',
  },
  topbar: {
    toggleSidebar: 'Toggle sidebar',
    searchPlaceholder: 'Search…',
    toggleLanguage: 'Toggle language',
    switchToSpanish: 'Switch to Spanish',
    switchToEnglish: 'Switch to English',
    toggleDarkMode: 'Toggle dark mode',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    signOut: 'Sign out',
  },
}

export const shellEs = {
  notifications: {
    tooltip: 'Notificaciones',
    header: 'Notificaciones',
    markAllRead: 'Marcar todas como leídas',
    empty: 'Todavía no tenés notificaciones.',
  },
  errorBoundary: {
    heading: 'Algo salió mal',
    prodDescription: 'Ocurrió un error inesperado. Recargá la página e intentá de nuevo.',
    reloadButton: 'Recargar página',
    tryAgainButton: 'Intentar de nuevo',
  },
  topbar: {
    toggleSidebar: 'Mostrar/ocultar menú',
    searchPlaceholder: 'Buscar…',
    toggleLanguage: 'Cambiar idioma',
    switchToSpanish: 'Cambiar a español',
    switchToEnglish: 'Cambiar a inglés',
    toggleDarkMode: 'Cambiar modo oscuro',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    signOut: 'Cerrar sesión',
  },
}
