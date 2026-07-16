// Dashboard module (Phase 2 gap-fill) — `DashboardPage.tsx` lives directly under
// `src/pages/`, not in its own subdirectory, so it was missed by the original
// module-by-module sweep. Read-only like Reports (no mutations, no caught-API-error
// display to wire up). The time-of-day greeting is keyed (`morning`/`afternoon`/
// `evening`) the same way Reports keys its date-range presets — resolve to a stable
// key in the component, translate the key here, never the raw label. The
// `sessionsByType` labels are deliberately NOT `enums.attentionType.*`: the dashboard
// abbreviates "Educational Reinforcement" down to "Educational sessions" to fit the
// stat-card grid, so it needs its own (shorter) copy — `fallback` mirrors the
// component's original `${type} sessions` default for any future attention type this
// list doesn't know about yet. The shared `SessionsBarChart` component's own internal
// text (legend/empty-state/aria-label) is intentionally out of scope here — see
// `sessionsChart.ts`, since that component is also used by `ReportsPage.tsx`.
export const dashboardEn = {
  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  description: "Here's what's happening across HouseCenter.",
  stats: {
    activePatients: 'Active patients',
    activePatientsSub: '{{count}} total',
    sessionsThisMonth: 'Sessions this month',
    collaborators: 'Collaborators',
    activeTreatments: 'Active treatments',
    clinics: 'Clinics',
    workRoutes: 'Work routes',
  },
  sessionsByType: {
    medical: 'Medical sessions',
    educational: 'Educational sessions',
    fallback: '{{type}} sessions',
  },
  chart: {
    title: 'Sessions — last 8 weeks',
    description: 'Weekly breakdown by attention type',
    empty: 'No session data available.',
  },
}

export const dashboardEs = {
  greeting: {
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    evening: 'Buenas noches',
  },
  description: 'Esto es lo que está pasando en HouseCenter.',
  stats: {
    activePatients: 'Pacientes activos',
    activePatientsSub: '{{count}} en total',
    sessionsThisMonth: 'Sesiones este mes',
    collaborators: 'Colaboradores',
    activeTreatments: 'Tratamientos activos',
    clinics: 'Clínicas',
    workRoutes: 'Rutas de trabajo',
  },
  sessionsByType: {
    medical: 'Sesiones médicas',
    educational: 'Sesiones educativas',
    fallback: 'Sesiones de {{type}}',
  },
  chart: {
    title: 'Sesiones — últimas 8 semanas',
    description: 'Desglose semanal por tipo de atención',
    empty: 'No hay datos de sesiones disponibles.',
  },
}
