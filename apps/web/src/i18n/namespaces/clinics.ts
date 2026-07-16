// Pilot module for the app-wide string-extraction sweep (Phase 2) — proves out the key
// conventions before they're applied to the rest of `src/pages/`. Reuses `common.*` for
// anything that's genuinely a repeating pattern (Cancel/Save/Back, Name/Address field
// labels); everything specific to how Clinics phrases itself stays here.
export const clinicsEn = {
  title: 'Clinics',
  description: "Manage the NGO's clinic locations.",
  newClinicButton: 'New Clinic',
  empty: 'No clinics yet. Create the first one.',
  pageSummary: '{{count}} clinics — page {{page}} of {{totalPages}}',
  newClinicDialog: {
    title: 'New Clinic',
    description: 'Add a new clinic location to the system.',
    createButton: 'Create clinic',
  },
  confirmDeactivate: {
    title: 'Deactivate clinic',
    description: '"{{name}}" will be deactivated. This action can be reversed by an administrator.',
  },
  form: {
    namePlaceholder: 'e.g. Clinic Central',
    addressPlaceholder: 'Full address',
  },
  detail: {
    description: 'Edit clinic details',
    notFound: 'Clinic not found.',
    backToClinics: 'Back to clinics',
    updateSuccess: 'Clinic updated successfully.',
  },
}

export const clinicsEs = {
  title: 'Clínicas',
  description: 'Administrá las sedes de la ONG.',
  newClinicButton: 'Nueva Clínica',
  empty: 'Todavía no hay clínicas. Creá la primera.',
  pageSummary: '{{count}} clínicas — página {{page}} de {{totalPages}}',
  newClinicDialog: {
    title: 'Nueva Clínica',
    description: 'Agregá una nueva sede al sistema.',
    createButton: 'Crear clínica',
  },
  confirmDeactivate: {
    title: 'Desactivar clínica',
    description: '"{{name}}" será desactivada. Un administrador puede revertir esta acción.',
  },
  form: {
    namePlaceholder: 'ej. Clínica Central',
    addressPlaceholder: 'Dirección completa',
  },
  detail: {
    description: 'Editar datos de la clínica',
    notFound: 'Clínica no encontrada.',
    backToClinics: 'Volver a clínicas',
    updateSuccess: 'Clínica actualizada correctamente.',
  },
}
