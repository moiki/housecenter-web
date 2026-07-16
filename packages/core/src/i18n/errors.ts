// Lookup table for the backend's stable `Error.Code` values (carried in
// `ProblemDetails.title`, see `ResultExtensions.ToProblem` in the API). Deliberately
// NOT part of the i18next resource tree: several codes contain literal dots
// (`"sessions.invalid_transition"`) that would collide with i18next's default
// key-separator and get parsed as nested paths instead of one flat key. Use
// `translateErrorCode()` directly against `ApiError.code` instead of `t()`.
//
// Extracted from every `Error.Validation/NotFound/Conflict/Forbidden/Unauthorized/Failure(...)`
// call site in the backend — this list should stay in sync as new codes are added; a
// missing code just falls back to the generic message, it never breaks anything.
export const errorCodesEn: Record<string, string> = {
  'attachments.empty': 'File is empty.',
  'attachments.not_found': 'Attachment not found.',
  'attachments.not_owner': 'Only the uploader or an administrator can delete this attachment.',
  'attachments.owner_not_found': 'Attachment owner not found.',
  'auth.invalid_credentials': 'Invalid email or password.',
  'auth.invalid_refresh_token': 'Your session has expired — please log in again.',
  'auth.invalid_reset_token': 'This password reset link is invalid or has expired.',
  'auth.reset_token_used': 'This password reset link has already been used.',
  'clinics.name_taken': 'A clinic with this name already exists.',
  'clinics.not_found': 'Clinic not found.',
  'collaborators.not_found': 'Collaborator not found.',
  'comments.not_found': 'Comment not found.',
  'consultations.already_resolved': 'This consultation is already resolved.',
  'consultations.doctor_not_assigned': 'The doctor must be assigned to this patient.',
  'consultations.invalid_status': 'Only "Resolved" is a valid manual status change.',
  'consultations.not_assigned_doctor': 'Only the assigned doctor or an administrator can resolve this consultation.',
  'consultations.not_found': 'Consultation not found.',
  'consultations.not_participant': 'Only participants can post messages in this consultation.',
  'consultations.not_patient_collaborator': 'Only the patient’s collaborators can open a consultation.',
  'consultations.resolved': 'Cannot post messages to a resolved consultation.',
  'consultations.treatment_mismatch': 'That treatment doesn’t belong to this patient.',
  'help.topic_key_taken': 'A help topic with this key already exists.',
  'help.topic_key_unpublished': 'This help topic exists but isn’t published yet.',
  'help.topic_not_found': 'Help topic not found.',
  'invitations.already_pending': 'A pending invitation for this email already exists.',
  'invitations.already_used': 'This invitation has already been used or has expired.',
  'invitations.invalid_token': 'This invitation link is invalid or has expired.',
  'invitations.not_found': 'This invitation no longer exists.',
  'invitations.not_pending': 'Only pending invitations can be resent.',
  'invitations.role_missing': 'The role attached to this invitation no longer exists.',
  'notifications.not_found': 'Notification not found.',
  'patients.collaborator_exists': 'This user is already a collaborator for this patient.',
  'patients.doctor_exists': 'This doctor is already assigned to this patient.',
  'patients.doctor_not_assigned': 'This doctor isn’t assigned to this patient.',
  'patients.not_a_doctor': 'This user doesn’t have the Doctor role.',
  'patients.not_found': 'Patient not found.',
  'patients.not_on_route': 'This patient isn’t assigned to this route.',
  'reports.doctor_no_routes': 'Doctors don’t have access to work route reports.',
  'reports.invalid_range': 'The start date must be on or before the end date.',
  'reports.range_too_long': 'The date range can’t exceed 366 days.',
  'roles.not_found': 'Role not found.',
  'roles.unknown_id': 'One or more of the selected roles don’t exist.',
  'sessions.invalid_transition': 'This session’s status can’t be changed anymore.',
  'sessions.location_required': 'Choose a clinic or a work route for this session.',
  'sessions.not_a_member': 'The collaborator must have the Member role.',
  'sessions.not_found': 'Session not found.',
  'sessions.not_owner': 'Only the session’s collaborator or an administrator can update its status.',
  'treatment_details.not_found': 'Treatment detail not found.',
  'treatments.not_found': 'Treatment not found.',
  'users.email_taken': 'A user with this email already exists.',
  'users.no_roles': 'A user must keep at least one role.',
  'users.not_found': 'User not found.',
  'work_routes.not_found': 'Work route not found.',
  'workroutes.not_found': 'Work route not found.',
}

export const errorCodesEs: Record<string, string> = {
  'attachments.empty': 'El archivo está vacío.',
  'attachments.not_found': 'Adjunto no encontrado.',
  'attachments.not_owner': 'Solo quien lo subió o un administrador puede eliminar este adjunto.',
  'attachments.owner_not_found': 'No se encontró quién subió este adjunto.',
  'auth.invalid_credentials': 'Correo o contraseña incorrectos.',
  'auth.invalid_refresh_token': 'Tu sesión expiró — iniciá sesión de nuevo.',
  'auth.invalid_reset_token': 'Este enlace para restablecer la contraseña es inválido o venció.',
  'auth.reset_token_used': 'Este enlace para restablecer la contraseña ya fue usado.',
  'clinics.name_taken': 'Ya existe una clínica con este nombre.',
  'clinics.not_found': 'Clínica no encontrada.',
  'collaborators.not_found': 'Colaborador no encontrado.',
  'comments.not_found': 'Comentario no encontrado.',
  'consultations.already_resolved': 'Esta consulta ya está resuelta.',
  'consultations.doctor_not_assigned': 'El médico debe estar asignado a este paciente.',
  'consultations.invalid_status': 'Solo "Resuelta" es un cambio de estado manual válido.',
  'consultations.not_assigned_doctor': 'Solo el médico asignado o un administrador puede resolver esta consulta.',
  'consultations.not_found': 'Consulta no encontrada.',
  'consultations.not_participant': 'Solo los participantes pueden escribir en esta consulta.',
  'consultations.not_patient_collaborator': 'Solo los colaboradores del paciente pueden abrir una consulta.',
  'consultations.resolved': 'No se puede escribir en una consulta ya resuelta.',
  'consultations.treatment_mismatch': 'Ese tratamiento no pertenece a este paciente.',
  'help.topic_key_taken': 'Ya existe un artículo de ayuda con esta clave.',
  'help.topic_key_unpublished': 'Este artículo de ayuda existe pero todavía no está publicado.',
  'help.topic_not_found': 'Artículo de ayuda no encontrado.',
  'invitations.already_pending': 'Ya existe una invitación pendiente para este correo.',
  'invitations.already_used': 'Esta invitación ya fue usada o venció.',
  'invitations.invalid_token': 'Este enlace de invitación es inválido o venció.',
  'invitations.not_found': 'Esta invitación ya no existe.',
  'invitations.not_pending': 'Solo se pueden reenviar invitaciones pendientes.',
  'invitations.role_missing': 'El rol asociado a esta invitación ya no existe.',
  'notifications.not_found': 'Notificación no encontrada.',
  'patients.collaborator_exists': 'Este usuario ya es colaborador de este paciente.',
  'patients.doctor_exists': 'Este médico ya está asignado a este paciente.',
  'patients.doctor_not_assigned': 'Este médico no está asignado a este paciente.',
  'patients.not_a_doctor': 'Este usuario no tiene el rol de Médico.',
  'patients.not_found': 'Paciente no encontrado.',
  'patients.not_on_route': 'Este paciente no está asignado a esta ruta.',
  'reports.doctor_no_routes': 'Los médicos no tienen acceso a los reportes de rutas de trabajo.',
  'reports.invalid_range': 'La fecha de inicio debe ser anterior o igual a la fecha final.',
  'reports.range_too_long': 'El rango de fechas no puede superar los 366 días.',
  'roles.not_found': 'Rol no encontrado.',
  'roles.unknown_id': 'Uno o más de los roles seleccionados no existen.',
  'sessions.invalid_transition': 'El estado de esta sesión ya no se puede cambiar.',
  'sessions.location_required': 'Elegí una clínica o una ruta de trabajo para esta sesión.',
  'sessions.not_a_member': 'El colaborador debe tener el rol de Miembro.',
  'sessions.not_found': 'Sesión no encontrada.',
  'sessions.not_owner': 'Solo el colaborador de la sesión o un administrador puede cambiar su estado.',
  'treatment_details.not_found': 'Detalle de tratamiento no encontrado.',
  'treatments.not_found': 'Tratamiento no encontrado.',
  'users.email_taken': 'Ya existe un usuario con este correo.',
  'users.no_roles': 'Un usuario debe mantener al menos un rol.',
  'users.not_found': 'Usuario no encontrado.',
  'work_routes.not_found': 'Ruta de trabajo no encontrada.',
  'workroutes.not_found': 'Ruta de trabajo no encontrada.',
}

const GENERIC_FALLBACK = {
  en: 'Something went wrong. Please try again.',
  es: 'Algo salió mal. Intentá de nuevo.',
}

// Prefer this over `ApiError.detail` for user-facing display — `.detail` is always
// English (it's the backend's internal diagnostic message) and was never meant to be
// shown verbatim. `code` is absent for the two generic validation-error shapes
// (MediatR's single `"validation.failed"` code, or ASP.NET's native per-field
// ValidationProblem, which carries no code at all) — those fall through to the generic
// message here, which is the correct behavior: there's no per-rule text to localize.
export function translateErrorCode(code: string | undefined, language: 'en' | 'es'): string {
  const table = language === 'es' ? errorCodesEs : errorCodesEn
  if (code && table[code]) return table[code]
  return GENERIC_FALLBACK[language]
}
