export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PageQuery {
  page?: number
  pageSize?: number
}

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}

export interface ApiError extends Error {
  readonly status: number
  readonly detail: string
  // Backend's stable Error.Code (e.g. "sessions.invalid_transition"), carried in
  // ProblemDetails.title — undefined for the two generic validation-error shapes
  // (`validation.failed` from MediatR's ValidationBehavior, or ASP.NET's native
  // per-field ValidationProblem, neither of which has a per-rule code). Prefer this
  // over `.detail` for user-facing display: `.detail` is always English and was never
  // meant to be shown verbatim — look it up in an i18n error table, falling back to a
  // generic localized message when `code` is absent.
  readonly code?: string
  readonly errors: Record<string, string[]>
}

export function createApiError(
  status: number,
  detail: string,
  errors: Record<string, string[]> = {},
  code?: string,
): ApiError {
  const err = new Error(detail) as ApiError
  ;(err as unknown as Record<string, unknown>).status = status
  ;(err as unknown as Record<string, unknown>).detail = detail
  ;(err as unknown as Record<string, unknown>).errors = errors
  ;(err as unknown as Record<string, unknown>).code = code
  err.name = 'ApiError'
  return err
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError'
}
