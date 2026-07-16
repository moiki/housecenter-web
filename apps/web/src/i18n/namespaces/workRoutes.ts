// Work Routes module (Phase 2, following the Clinics pilot pattern). `common.*` covers
// the action verbs (cancel/save/add/view/edit/deactivate/back/close) and the
// `description` field label; there's no `common.fields.clinic` or `.patient` (Patients
// never hoisted "Clinic" either — see `patients.sessions.clinicLabel` — so this module
// keeps its own local labels instead of introducing one). Weekday day-names live here,
// scoped under `weekday.*`, rather than as a shared `enums.weekday` — this mirrors how
// the mobile app scopes the exact same underlying concept under its own
// `workRoutes.weekday` instead of a cross-cutting enum (see
// `apps/mobile/src/i18n/locales/en.json`). They're used both by the calendar's weekday
// column headers and by the recurrence-days list on the list page (sliced to 3 chars —
// works cleanly for both languages: "Monday"/"Miércoles" -> "Mon"/"Mié"). The
// `dayProgress.status` pair (Completed/Upcoming) describes a client-derived stop status
// that has no backing C# enum (unlike gender/attentionType/etc in `enums.ts`), so it's
// local too, not borrowed from `enums.sessionStatus`.
export const workRoutesEn = {
  title: 'Work Routes',
  description: 'Routes assigned to home-visit teams.',
  empty: 'No work routes yet. Create the first one.',
  newRouteButton: 'New Route',
  pageSummary: '{{count}} work routes — page {{page}} of {{totalPages}}',
  view: {
    calendar: 'Calendar',
    calendarAriaLabel: 'Calendar view',
    list: 'List',
    listAriaLabel: 'List view',
  },
  table: {
    route: 'Route',
    clinic: 'Clinic',
    recurrence: 'Recurrence',
    patients: 'Patients',
    patientsCount: '{{count}} patients',
  },
  recurrence: {
    notScheduled: 'Not scheduled',
    ongoing: 'ongoing',
    until: 'until {{date}}',
  },
  weekday: {
    Monday: 'Monday',
    Tuesday: 'Tuesday',
    Wednesday: 'Wednesday',
    Thursday: 'Thursday',
    Friday: 'Friday',
    Saturday: 'Saturday',
    Sunday: 'Sunday',
  },
  newRouteDialog: {
    title: 'New Work Route',
    description: 'Assign a route and set its weekly recurrence.',
    createButton: 'Create work route',
  },
  confirmDeactivate: {
    title: 'Deactivate work route',
    description: '"{{name}}" will be deactivated.',
  },
  form: {
    sections: {
      routeInfo: 'Route info',
      recurrence: 'Recurrence',
    },
    routeNamePlaceholder: 'e.g. North District',
    descriptionPlaceholder: 'Brief description of this route',
    featuredImagePlaceholder: 'https://...',
  },
  fields: {
    routeName: 'Route name',
    clinic: 'Clinic',
    featuredImage: 'Featured image URL (optional)',
    repeatsOn: 'Repeats on',
    startDate: 'Start date',
    endDate: 'End date',
    repeatsIndefinitely: 'Repeats indefinitely',
  },
  detail: {
    fallbackTitle: 'Work Route',
    clinicDescription: 'Clinic: {{clinic}}',
    savedMessage: 'Saved!',
    noVisitTime: 'No time set',
    patientLabel: 'Patient',
    noPatientsAvailable: 'No patients available',
    visitTimeOptional: 'Visit time (optional)',
    removeAriaLabel: 'Remove {{name}} from this route',
    patientsOnRoute: {
      title: 'Patients on this route',
      empty: 'No patients assigned yet — add one below.',
    },
  },
  calendar: {
    today: 'Today',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    addRouteTooltip: 'Add route on this day',
    addRouteAriaLabel: 'Add route on {{date}}',
    viewProgressTooltip: 'View day progress',
    viewProgressAriaLabel: 'View progress for {{date}}',
  },
  dayProgress: {
    emptyDay: 'No routes scheduled this day.',
    routesScheduledCount: '{{count}} routes scheduled',
    noPatientsAssigned: 'no patients assigned',
    visitsCompleted: '{{completed}} of {{total}} visits completed',
    assignPatientsHint: 'Assign patients to this route from the Patients page to see them here.',
    status: {
      completed: 'Completed',
      upcoming: 'Upcoming',
    },
  },
}

export const workRoutesEs = {
  title: 'Rutas de Trabajo',
  description: 'Rutas asignadas a los equipos de visitas domiciliarias.',
  empty: 'Todavía no hay rutas de trabajo. Creá la primera.',
  newRouteButton: 'Nueva Ruta',
  pageSummary: '{{count}} rutas de trabajo — página {{page}} de {{totalPages}}',
  view: {
    calendar: 'Calendario',
    calendarAriaLabel: 'Vista de calendario',
    list: 'Lista',
    listAriaLabel: 'Vista de lista',
  },
  table: {
    route: 'Ruta',
    clinic: 'Clínica',
    recurrence: 'Recurrencia',
    patients: 'Pacientes',
    patientsCount: '{{count}} pacientes',
  },
  recurrence: {
    notScheduled: 'Sin programar',
    ongoing: 'en curso',
    until: 'hasta {{date}}',
  },
  weekday: {
    Monday: 'Lunes',
    Tuesday: 'Martes',
    Wednesday: 'Miércoles',
    Thursday: 'Jueves',
    Friday: 'Viernes',
    Saturday: 'Sábado',
    Sunday: 'Domingo',
  },
  newRouteDialog: {
    title: 'Nueva Ruta de Trabajo',
    description: 'Asigná una ruta y configurá su recurrencia semanal.',
    createButton: 'Crear ruta de trabajo',
  },
  confirmDeactivate: {
    title: 'Desactivar ruta de trabajo',
    description: '"{{name}}" será desactivada.',
  },
  form: {
    sections: {
      routeInfo: 'Datos de la ruta',
      recurrence: 'Recurrencia',
    },
    routeNamePlaceholder: 'ej. Distrito Norte',
    descriptionPlaceholder: 'Descripción breve de esta ruta',
    featuredImagePlaceholder: 'https://...',
  },
  fields: {
    routeName: 'Nombre de la ruta',
    clinic: 'Clínica',
    featuredImage: 'URL de imagen destacada (opcional)',
    repeatsOn: 'Se repite los',
    startDate: 'Fecha de inicio',
    endDate: 'Fecha de fin',
    repeatsIndefinitely: 'Se repite indefinidamente',
  },
  detail: {
    fallbackTitle: 'Ruta de Trabajo',
    clinicDescription: 'Clínica: {{clinic}}',
    savedMessage: '¡Guardado!',
    noVisitTime: 'Sin hora definida',
    patientLabel: 'Paciente',
    noPatientsAvailable: 'No hay pacientes disponibles',
    visitTimeOptional: 'Hora de visita (opcional)',
    removeAriaLabel: 'Quitar a {{name}} de esta ruta',
    patientsOnRoute: {
      title: 'Pacientes en esta ruta',
      empty: 'Todavía no hay pacientes asignados — agregá uno abajo.',
    },
  },
  calendar: {
    today: 'Hoy',
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    addRouteTooltip: 'Agregar ruta este día',
    addRouteAriaLabel: 'Agregar ruta el {{date}}',
    viewProgressTooltip: 'Ver progreso del día',
    viewProgressAriaLabel: 'Ver progreso del {{date}}',
  },
  dayProgress: {
    emptyDay: 'No hay rutas programadas este día.',
    routesScheduledCount: '{{count}} rutas programadas',
    noPatientsAssigned: 'sin pacientes asignados',
    visitsCompleted: '{{completed}} de {{total}} visitas completadas',
    assignPatientsHint: 'Asigná pacientes a esta ruta desde la página de Pacientes para verlos aquí.',
    status: {
      completed: 'Completada',
      upcoming: 'Próxima',
    },
  },
}
