import { getApiClient } from 'core/api/http/registry'
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
    getApiClient().post<TokenPairResponse>('/auth/login', data).then((r) => r.data),

  refresh: (data: RefreshRequest) =>
    getApiClient().post<TokenPairResponse>('/auth/refresh', data).then((r) => r.data),

  me: () => getApiClient().get<UserResponse>('/auth/me').then((r) => r.data),

  signup: (data: SignupRequest) =>
    getApiClient().post<TokenPairResponse>('/auth/signup', data).then((r) => r.data),

  requestPasswordReset: (data: PasswordResetRequestDto) =>
    getApiClient().post('/auth/password/request', data),

  resetPassword: (data: PasswordResetDto) =>
    getApiClient().post('/auth/password/reset', data),
}
