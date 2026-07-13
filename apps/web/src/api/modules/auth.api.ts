import { apiClient } from '@/api/client'
import type {
  LoginRequest,
  PasswordResetDto,
  PasswordResetRequestDto,
  RefreshRequest,
  SignupRequest,
  TokenPairResponse,
  UserResponse,
} from 'core/types/auth.types'

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenPairResponse>('/auth/login', data).then((r) => r.data),

  refresh: (data: RefreshRequest) =>
    apiClient.post<TokenPairResponse>('/auth/refresh', data).then((r) => r.data),

  me: () => apiClient.get<UserResponse>('/auth/me').then((r) => r.data),

  signup: (data: SignupRequest) =>
    apiClient.post<TokenPairResponse>('/auth/signup', data).then((r) => r.data),

  requestPasswordReset: (data: PasswordResetRequestDto) =>
    apiClient.post('/auth/password/request', data),

  resetPassword: (data: PasswordResetDto) =>
    apiClient.post('/auth/password/reset', data),
}
