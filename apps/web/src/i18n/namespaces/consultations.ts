// Consultations module (Phase 2, following the Clinics pilot pattern). This is the
// medical inbox: a list page (filter + create) and a thread/detail page (messages +
// resolve/escalate-to-doctor status control). Status chips/labels/filter options all go
// through `t('enums.consultationStatus.Xxx')` (see `packages/core/src/i18n/enums.ts`) —
// never re-translated here, same as every other module's enum surface. "Patient" /
// "Assigned Doctor" / "Title" form field labels stay local rather than hoisted to
// `common.fields.*` — WorkRoutes set this precedent already (see its own comment: no
// `common.fields.clinic`/`.patient` because Patients never hoisted them either).
// `common.actions.*` covers Cancel/Back. Client-side zod validation messages (e.g.
// "Patient is required", "Message cannot be empty") are intentionally left
// untranslated, matching every prior module. NOTE: this only covers this module's own
// static UI chrome — translating the actual message *content* of a consultation is a
// separate, explicitly out-of-scope future feature.
export const consultationsEn = {
  title: 'Consultations',
  description: 'Medical inbox — open cases and threads',
  newConsultationButton: 'New Consultation',
  empty: 'No consultations found.',
  resolvedOn: 'Resolved {{date}}',
  filters: {
    allStatuses: 'All statuses',
  },
  newConsultationDialog: {
    title: 'New Consultation',
    description: 'Start a new consultation thread and assign it to a doctor.',
    createButton: 'Open Consultation',
  },
  form: {
    patientLabel: 'Patient',
    doctorLabel: 'Assigned Doctor',
    titleLabel: 'Title',
    titlePlaceholder: 'Subject of the consultation',
    firstMessageLabel: 'First Message',
    firstMessagePlaceholder: 'Describe the case…',
  },
  detail: {
    notFound: 'Consultation not found.',
  },
  messages: {
    empty: 'No messages yet.',
    placeholder: 'Write a message…',
    sendButton: 'Send',
    resolvedNotice: 'This consultation is resolved. Change status to reply.',
  },
}

export const consultationsEs = {
  title: 'Consultas',
  description: 'Bandeja médica — casos y conversaciones abiertas',
  newConsultationButton: 'Nueva Consulta',
  empty: 'No se encontraron consultas.',
  resolvedOn: 'Resuelta el {{date}}',
  filters: {
    allStatuses: 'Todos los estados',
  },
  newConsultationDialog: {
    title: 'Nueva Consulta',
    description: 'Iniciá una nueva conversación de consulta y asignala a un médico.',
    createButton: 'Abrir Consulta',
  },
  form: {
    patientLabel: 'Paciente',
    doctorLabel: 'Médico Asignado',
    titleLabel: 'Título',
    titlePlaceholder: 'Asunto de la consulta',
    firstMessageLabel: 'Primer Mensaje',
    firstMessagePlaceholder: 'Describí el caso…',
  },
  detail: {
    notFound: 'Consulta no encontrada.',
  },
  messages: {
    empty: 'Todavía no hay mensajes.',
    placeholder: 'Escribí un mensaje…',
    sendButton: 'Enviar',
    resolvedNotice: 'Esta consulta está resuelta. Cambiá el estado para responder.',
  },
}
