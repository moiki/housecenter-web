// Device-bound sessions (device-bound-sessions API change): the API now requires a
// stable deviceId on login/refresh/signup; deviceName/platform are optional metadata.
export type DevicePlatform = 'Android' | 'iOS' | 'Web'

export interface LoginRequest {
  email: string
  password: string
  deviceId: string
  deviceName?: string
  platform?: DevicePlatform
}

export interface RefreshRequest {
  refreshToken: string
  deviceId: string
  deviceName?: string
  platform?: DevicePlatform
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
  deviceId: string
  deviceName?: string
  platform?: DevicePlatform
}

export interface PasswordResetRequestDto {
  email: string
}

export interface PasswordResetDto {
  token: string
  newPassword: string
}
