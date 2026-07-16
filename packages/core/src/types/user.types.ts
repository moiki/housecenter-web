export interface UserResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string | null
  country: string | null
  state: string | null
  city: string | null
  address: string
  profession: string | null
  profilePicture: string | null
  darkMode: boolean
  language: 'En' | 'Es'
  isActive: boolean
  roles: string[]
}

export interface UpdateUserRequest {
  firstName: string
  lastName: string
  address: string
  phoneNumber: string | null
  country: string | null
  state: string | null
  city: string | null
  profession: string | null
}

export interface AssignRolesRequest {
  roleIds: string[]
}
