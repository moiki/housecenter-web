export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

// A stop is a patient assigned to this route (Patient.workRouteId) — derived server-side,
// not entered here, so it can never drift out of sync with who's actually assigned.
export interface WorkRouteStopDto {
  patientId: string
  patientName: string
  address: string
  visitTime: string | null // 'HH:mm:ss'
}

export interface WorkRouteResponse {
  id: string
  routeName: string
  description: string
  featuredImage: string | null
  clinicId: string
  clinicName: string
  stops: WorkRouteStopDto[]
  isActive: boolean
  recurrenceDays: Weekday[]
  recurrenceStartDate: string
  recurrenceEndDate: string | null
  isRecurrenceIndefinite: boolean
}

export interface CreateWorkRouteRequest {
  routeName: string
  description: string
  featuredImage: string | null
  clinicId: string
  recurrenceDays: Weekday[]
  recurrenceStartDate: string
  recurrenceEndDate: string | null
  isRecurrenceIndefinite: boolean
}

export interface UpdateWorkRouteRequest {
  routeName: string
  description: string
  featuredImage: string | null
  recurrenceDays: Weekday[]
  recurrenceStartDate: string
  recurrenceEndDate: string | null
  isRecurrenceIndefinite: boolean
}

export interface AssignPatientToRouteRequest {
  visitTime: string | null // 'HH:mm:ss'
}
