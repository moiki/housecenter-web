import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/modules/auth.api'

const schema = z.object({ email: z.string().email('Invalid email') })
type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const mutation = useMutation({ mutationFn: authApi.requestPasswordReset })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    await mutation.mutateAsync(data)
    // Always show success — anti-enumeration: don't reveal whether email exists
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <p className="text-[var(--hc-text-primary)] font-medium">Check your inbox</p>
        <p className="text-sm text-[var(--hc-text-secondary)]">
          If that email is registered, you'll receive a reset link shortly.
        </p>
        <a href="/login" className="text-sm text-blue-600 hover:underline">
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--hc-text-primary)] mb-1">Reset password</h2>
        <p className="text-sm text-[var(--hc-text-secondary)]">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-[var(--hc-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="text-center">
        <a href="/login" className="text-sm text-blue-600 hover:underline">Back to sign in</a>
      </p>
    </form>
  )
}
