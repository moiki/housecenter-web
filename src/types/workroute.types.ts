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
}

export interface CreateWorkRouteRequest {
  routeName: string
  description: string
  featuredImage: string | null
  clinicId: string
  destinations: DestinationPointDto[]
}

export interface UpdateWorkRouteRequest {
  routeName: string
  description: string
  featuredImage: string | null
  destinations: DestinationPointDto[]
}
