export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

export interface DestinationPointDto {
  name: string
  description: string
  picture: string | null
  googleMapUrl: string | null
}

export interface WorkRouteResponse {
  id: string
  routeName: string
  description: string
  featuredImage: string | null
  clinicId: string
  clinicName: string
  destinations: DestinationPointDto[]
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
  destinations: DestinationPointDto[]
  recurrenceDays: Weekday[]
  recurrenceStartDate: string
  recurrenceEndDate: string | null
  isRecurrenceIndefinite: boolean
}

export interface UpdateWorkRouteRequest {
  routeName: string
  description: string
  featuredImage: string | null
  destinations: DestinationPointDto[]
  recurrenceDays: Weekday[]
  recurrenceStartDate: string
  recurrenceEndDate: string | null
  isRecurrenceIndefinite: boolean
}
