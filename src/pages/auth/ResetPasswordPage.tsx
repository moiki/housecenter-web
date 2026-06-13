import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/modules/auth.api'
import { isApiError } from '@/types/common.types'

const schema = z
  .object({
    newPassword: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  const mutation = useMutation({ mutationFn: authApi.resetPassword })

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync({ token, newPassword: data.newPassword })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const message = isApiError(err) ? err.detail : 'Reset failed. The link may have expired.'
      setError('root', { message })
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <p className="text-[var(--hc-text-primary)] font-medium">Password updated</p>
        <p className="text-sm text-[var(--hc-text-secondary)]">Redirecting to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--hc-text-primary)] mb-1">New password</h2>
        <p className="text-sm text-[var(--hc-text-secondary)]">Choose a new password for your account.</p>
      </div>

      {(['newPassword', 'confirmPassword'] as const).map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field === 'newPassword' ? 'New password' : 'Confirm password'}
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
        disabled={isSubmitting || !token}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
