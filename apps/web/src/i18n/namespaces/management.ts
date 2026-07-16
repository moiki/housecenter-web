// Management module (Phase 2, following the Clinics/Collaborators pattern) — the
// Owner/Administrator-only admin surface: the Users list (view + deactivate) and the
// Invitations list (invite/resend/revoke). Role identifiers shown in both pages (the
// "Roles" chips on Users, the "Role" select on the invite form) are looked up via
// `t('roles.Xxx')` (see `packages/core/src/i18n/roles.ts`) — this module is their
// primary display surface, never hardcoded here. `common.*` covers Cancel/Deactivate/
// Delete/Email; only what's genuinely specific to how each page phrases itself lives
// here — including the "Status" column label, which precedent (Patients) keeps local
// per-module rather than hoisted to `common.fields`. Invitation status
// (Pending/Accepted/Expired) isn't part of the shared `enums.ts` table — this change's
// scope is limited to the management module's own two files, so it's kept local to
// `invitations.status` instead. Client-side zod validation messages (the inline schema
// in `InvitationsPage.tsx`) are intentionally left untranslated, matching every other
// module.
export const managementEn = {
  users: {
    title: 'Users',
    description: 'All registered accounts in the system.',
    empty: 'No users found.',
    pageSummary: '{{count}} users — page {{page}} of {{totalPages}}',
    table: {
      user: 'User',
      roles: 'Roles',
      status: 'Status',
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
    },
    confirmDeactivate: {
      title: 'Deactivate user',
      description: '{{name}} will lose access to the system.',
    },
  },
  invitations: {
    title: 'Invitations',
    description: 'Invite new members to join HouseCenter.',
    inviteButton: 'Invite user',
    empty: 'No invitations yet.',
    table: {
      status: 'Status',
      sent: 'Sent',
    },
    status: {
      Pending: 'Pending',
      Accepted: 'Accepted',
      Expired: 'Expired',
    },
    resendAriaLabel: 'Resend',
    slideOver: {
      title: 'Invite user',
      description: 'Send an email invitation to join the organization.',
      sendButton: 'Send invitation',
    },
    form: {
      roleLabel: 'Role',
      emailPlaceholder: 'colleague@example.com',
    },
    confirmDelete: {
      title: 'Delete invitation',
      description: 'The invitation to "{{email}}" will be permanently deleted.',
    },
  },
}

export const managementEs = {
  users: {
    title: 'Usuarios',
    description: 'Todas las cuentas registradas en el sistema.',
    empty: 'No se encontraron usuarios.',
    pageSummary: '{{count}} usuarios — página {{page}} de {{totalPages}}',
    table: {
      user: 'Usuario',
      roles: 'Roles',
      status: 'Estado',
    },
    status: {
      active: 'Activo',
      inactive: 'Inactivo',
    },
    confirmDeactivate: {
      title: 'Desactivar usuario',
      description: '{{name}} perderá el acceso al sistema.',
    },
  },
  invitations: {
    title: 'Invitaciones',
    description: 'Invitá a nuevos integrantes a unirse a HouseCenter.',
    inviteButton: 'Invitar usuario',
    empty: 'Todavía no hay invitaciones.',
    table: {
      status: 'Estado',
      sent: 'Enviada',
    },
    status: {
      Pending: 'Pendiente',
      Accepted: 'Aceptada',
      Expired: 'Vencida',
    },
    resendAriaLabel: 'Reenviar',
    slideOver: {
      title: 'Invitar usuario',
      description: 'Enviá una invitación por correo para unirse a la organización.',
      sendButton: 'Enviar invitación',
    },
    form: {
      roleLabel: 'Rol',
      emailPlaceholder: 'colega@ejemplo.com',
    },
    confirmDelete: {
      title: 'Eliminar invitación',
      description: 'La invitación a "{{email}}" será eliminada de forma permanente.',
    },
  },
}
