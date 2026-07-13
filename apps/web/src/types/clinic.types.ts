export interface ClinicResponse {
  id: string
  name: string
  address: string
  isActive: boolean
}

export interface CreateClinicRequest {
  name: string
  address: string
}

export interface UpdateClinicRequest {
  name: string
  address: string
}
