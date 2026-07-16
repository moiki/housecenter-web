// Reports module (Phase 2, following the Clinics/Patients pattern). A read-only
// charts/aggregates page — no mutations, so (unlike most other modules) there's no
// caught-API-error display to wire up here. The date-range preset buttons are keyed
// (`last4Weeks`/`last8Weeks`/...) rather than indexed, since the page maps over them by
// key to resolve the translated label. The bar chart itself (`SessionsBarChart.tsx`,
// legend/axis text) is a shared component outside this module's scope and is left as-is.
export const reportsEn = {
  title: 'Reports',
  description: 'Session activity and performance metrics.',
  presets: {
    last4Weeks: 'Last 4 weeks',
    last8Weeks: 'Last 8 weeks',
    last3Months: 'Last 3 months',
    last6Months: 'Last 6 months',
  },
  sessionsOverTime: {
    title: 'Sessions over time',
  },
  byCollaborator: {
    title: 'Sessions by collaborator',
  },
}

export const reportsEs = {
  title: 'Reportes',
  description: 'Actividad de sesiones y métricas de desempeño.',
  presets: {
    last4Weeks: 'Últimas 4 semanas',
    last8Weeks: 'Últimas 8 semanas',
    last3Months: 'Últimos 3 meses',
    last6Months: 'Últimos 6 meses',
  },
  sessionsOverTime: {
    title: 'Sesiones a lo largo del tiempo',
  },
  byCollaborator: {
    title: 'Sesiones por colaborador',
  },
}
