export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface TokenPairResponse {
  accessToken: string
  refreshToken: string
}

export interface UserResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  country?: string
  state?: string
  city?: string
  address: string
  profession?: string
  profilePicture?: string
  darkMode: boolean
  isActive: boolean
  roles: string[]
}

export interface SignupRequest {
  token: string
  firstName: string
  lastName: string
  password: string
}

export interface PasswordResetRequestDto {
  email: string
}

export interface PasswordResetDto {
  token: string
  newPassword: string
}
