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
  readonly errors: Record<string, string[]>
}

export function createApiError(
  status: number,
  detail: string,
  errors: Record<string, string[]> = {},
): ApiError {
  const err = new Error(detail) as ApiError
  ;(err as unknown as Record<string, unknown>).status = status
  ;(err as unknown as Record<string, unknown>).detail = detail
  ;(err as unknown as Record<string, unknown>).errors = errors
  err.name = 'ApiError'
  return err
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError'
}
