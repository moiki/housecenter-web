// Cross-cutting UI chrome shared by every feature module — action verbs, generic field
// labels, and the confirm-dialog title/description shape that repeats for every
// destructive action (see `ConfirmDialog.tsx`). Feature-specific copy stays in each
// app's own namespaces; only what genuinely repeats across pages lives here.
export const commonEn = {
  actions: {
    cancel: 'Cancel',
    save: 'Save changes',
    create: 'Create',
    edit: 'Edit',
    add: 'Add',
    view: 'View',
    deactivate: 'Deactivate',
    delete: 'Delete',
    close: 'Close',
    back: 'Back',
  },
  fields: {
    name: 'Name',
    address: 'Address',
    description: 'Description',
    email: 'Email',
    phone: 'Phone',
    country: 'Country',
    state: 'State',
    city: 'City',
    firstName: 'First name',
    lastName: 'Last name',
    password: 'Password',
    confirmPassword: 'Confirm password',
  },
  confirmDeactivate: {
    title: 'Deactivate {{entity}}',
    description: '"{{name}}" will be deactivated.',
  },
}

export const commonEs = {
  actions: {
    cancel: 'Cancelar',
    save: 'Guardar cambios',
    create: 'Crear',
    edit: 'Editar',
    add: 'Agregar',
    view: 'Ver',
    deactivate: 'Desactivar',
    delete: 'Eliminar',
    close: 'Cerrar',
    back: 'Volver',
  },
  fields: {
    name: 'Nombre',
    address: 'Dirección',
    description: 'Descripción',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    country: 'País',
    state: 'Departamento',
    city: 'Ciudad',
    firstName: 'Nombre',
    lastName: 'Apellido',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
  },
  confirmDeactivate: {
    title: 'Desactivar {{entity}}',
    description: '"{{name}}" será desactivado.',
  },
}
