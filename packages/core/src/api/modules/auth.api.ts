import { getApiClient } from 'core/api/http/registry'
import type {
  DeviceSessionResponse,
  LoginRequest,
  LogoutRequest,
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

  logout: (deviceId: string) =>
    getApiClient()
      .post<void>('/auth/logout', { deviceId } satisfies LogoutRequest)
      .then((r) => r.data),

  getSessions: () =>
    getApiClient().get<DeviceSessionResponse[]>('/auth/sessions').then((r) => r.data),

  revokeSession: (id: string) =>
    getApiClient().delete<void>(`/auth/sessions/${id}`).then((r) => r.data),

  revokeAllSessions: () =>
    getApiClient().post<void>('/auth/sessions/revoke-all').then((r) => r.data),
}
