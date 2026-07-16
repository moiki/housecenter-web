// Display labels for the small closed-set enums that show up as chips/status labels
// across list and detail pages. Grouped by the C# enum name they mirror (see
// Domain/Entities/*.cs) so a page can do `t('enums.treatmentStatus.Active')` etc.
export const enumsEn = {
  gender: {
    Male: 'Male',
    Female: 'Female',
  },
  attentionType: {
    Medical: 'Medical',
    EducationalReinforcement: 'Educational Reinforcement',
  },
  treatmentStatus: {
    Active: 'Active',
    Completed: 'Completed',
    Paused: 'Paused',
  },
  sessionStatus: {
    Scheduled: 'Scheduled',
    Completed: 'Completed',
    Missed: 'Missed',
  },
  consultationStatus: {
    Open: 'Open',
    UnderReview: 'Under Review',
    Resolved: 'Resolved',
  },
  commentType: {
    Simple: 'Simple',
    Medical: 'Medical',
    Route: 'Route',
  },
  commentStatus: {
    Pending: 'Pending',
    Accepted: 'Accepted',
    Rejected: 'Rejected',
  },
}

export const enumsEs = {
  gender: {
    Male: 'Masculino',
    Female: 'Femenino',
  },
  attentionType: {
    Medical: 'Médica',
    EducationalReinforcement: 'Refuerzo Educativo',
  },
  treatmentStatus: {
    Active: 'Activo',
    Completed: 'Completado',
    Paused: 'Pausado',
  },
  sessionStatus: {
    Scheduled: 'Programada',
    Completed: 'Completada',
    Missed: 'Perdida',
  },
  consultationStatus: {
    Open: 'Abierta',
    UnderReview: 'En Revisión',
    Resolved: 'Resuelta',
  },
  commentType: {
    Simple: 'Simple',
    Medical: 'Médico',
    Route: 'Ruta',
  },
  commentStatus: {
    Pending: 'Pendiente',
    Accepted: 'Aceptado',
    Rejected: 'Rechazado',
  },
}
