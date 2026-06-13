import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/modules/auth.api'
import { invitationsApi } from '@/api/modules/invitations.api'
import { useAuthStore } from '@/store/auth.store'
import { isApiError } from '@/types/common.types'

const schema = z
  .object({
    firstName: z.string().min(1, 'Required').max(100),
    lastName: z.string().min(1, 'Required').max(100),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export function SignupPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const validation = useQuery({
    queryKey: ['invitations', 'validate', token],
    queryFn: () => invitationsApi.validate(token),
    enabled: !!token,
    retry: false,
  })

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const signup = useMutation({
    mutationFn: (data: FormData) =>
      authApi.signup({ token, firstName: data.firstName, lastName: data.lastName, password: data.password }),
    onSuccess: async (tokens) => {
      const user = await authApi.me()
      setAuth(user, tokens.accessToken, tokens.refreshToken)
      navigate('/', { replace: true })
    },
    onError: (err) => {
      const message = isApiError(err) ? err.detail : 'Signup failed'
      setError('root', { message })
    },
  })

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  if (!token) return null

  if (validation.isPending) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (validation.isError) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-500 font-medium">Invalid or expired invitation</p>
        <p className="text-sm text-[var(--hc-text-secondary)]">
          Ask an administrator to send you a new invite.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit((d) => signup.mutate(d))} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--hc-text-primary)] mb-1">Create your account</h2>
        <p className="text-sm text-[var(--hc-text-secondary)]">Complete your registration</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(['firstName', 'lastName'] as const).map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
              {field === 'firstName' ? 'First name' : 'Last name'}
            </label>
            <input
              {...register(field)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-[var(--hc-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors[field] && <p className="mt-1 text-xs text-red-500">{errors[field]?.message}</p>}
          </div>
        ))}
      </div>

      {(['password', 'confirmPassword'] as const).map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field === 'password' ? 'Password' : 'Confirm password'}
          </label>
          <input
            {...register(field)}
            type="password"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-[var(--hc-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors[field] && <p className="mt-1 text-xs text-red-500">{errors[field]?.message}</p>}
        </div>
      ))}

      {errors.root && <p className="text-sm text-red-500 text-center">{errors.root.message}</p>}

      <button
        type="submit"
        disabled={isSubmitting || signup.isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {signup.isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
