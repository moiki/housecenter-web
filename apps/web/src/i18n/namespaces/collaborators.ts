// Collaborators module (Phase 2, following the Clinics/Patients pattern). This is the
// staff directory: list + create/edit slide-over + deactivate. `common.*` covers
// firstName/lastName/email/phone/address/country/state/city plus the action verbs
// (including "Save changes" for the edit-mode submit button — reused as-is, not
// duplicated here). Only what's genuinely specific to how Collaborators phrases itself
// (table columns, the dynamic slide-over title/description, the positions field-array
// UI) lives here. Client-side zod validation messages are intentionally left
// untranslated, matching every other module.
export const collaboratorsEn = {
  title: 'Collaborators',
  description: 'Staff directory — nurses, doctors, and field workers.',
  newCollaboratorButton: 'New Collaborator',
  empty: 'No collaborators yet. Add the first one.',
  pageSummary: '{{count}} collaborators — page {{page}} of {{totalPages}}',
  positions: 'Positions',
  table: {
    clinic: 'Clinic',
    contact: 'Contact',
  },
  viewAriaLabel: 'View {{name}}',
  addPositionButton: 'Add position',
  removePositionAriaLabel: 'Remove position',
  positionPlaceholder: 'Position {{index}}',
  slideOver: {
    editTitle: 'Edit — {{name}}',
    newTitle: 'New Collaborator',
    editDescription: "Update this collaborator's details.",
    newDescription: 'Add a new team member to the staff directory.',
    createButton: 'Create collaborator',
  },
  confirmDeactivate: {
    title: 'Deactivate collaborator',
    description: '{{name}} will be deactivated.',
  },
  form: {
    clinicLabel: 'Clinic',
    workRouteOptionalLabel: 'Work route (optional)',
    noRouteOption: 'No route assigned',
    firstNamePlaceholder: 'Jane',
    lastNamePlaceholder: 'Smith',
    emailPlaceholder: 'jane@example.com',
    phonePlaceholder: '+1 555 0000',
    addressPlaceholder: 'Full address',
    countryPlaceholder: 'US',
    statePlaceholder: 'CA',
    cityPlaceholder: 'LA',
  },
}

export const collaboratorsEs = {
  title: 'Colaboradores',
  description: 'Directorio de personal — enfermería, médicos y trabajadores de campo.',
  newCollaboratorButton: 'Nuevo Colaborador',
  empty: 'Todavía no hay colaboradores. Agregá el primero.',
  pageSummary: '{{count}} colaboradores — página {{page}} de {{totalPages}}',
  positions: 'Puestos',
  table: {
    clinic: 'Clínica',
    contact: 'Contacto',
  },
  viewAriaLabel: 'Ver {{name}}',
  addPositionButton: 'Agregar puesto',
  removePositionAriaLabel: 'Quitar puesto',
  positionPlaceholder: 'Puesto {{index}}',
  slideOver: {
    editTitle: 'Editar — {{name}}',
    newTitle: 'Nuevo Colaborador',
    editDescription: 'Actualizá los datos de este colaborador.',
    newDescription: 'Agregá un nuevo integrante al directorio de personal.',
    createButton: 'Crear colaborador',
  },
  confirmDeactivate: {
    title: 'Desactivar colaborador',
    description: '{{name}} será desactivado.',
  },
  form: {
    clinicLabel: 'Clínica',
    workRouteOptionalLabel: 'Ruta de trabajo (opcional)',
    noRouteOption: 'Sin ruta asignada',
    firstNamePlaceholder: 'Jane',
    lastNamePlaceholder: 'Smith',
    emailPlaceholder: 'jane@example.com',
    phonePlaceholder: '+1 555 0000',
    addressPlaceholder: 'Dirección completa',
    countryPlaceholder: 'US',
    statePlaceholder: 'CA',
    cityPlaceholder: 'LA',
  },
}
