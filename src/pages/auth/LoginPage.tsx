import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/modules/auth.api'
import { useAuthStore } from '@/store/auth.store'
import { isApiError } from '@/types/common.types'
import { Input } from '@/components/base/input/input'
import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setTokens = useAuthStore((s) => s.setTokens)
  const [remember, setRemember] = useState(false)

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  })

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const onSubmit = async (data: FormData) => {
    try {
      const tokens = await authApi.login(data)
      // Store tokens before calling me() so the request interceptor picks them up
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await authApi.me()
      setAuth(user, tokens.accessToken, tokens.refreshToken)

      if (user.darkMode) document.documentElement.classList.add('dark-mode')
      navigate(from, { replace: true })
    } catch (err) {
      const message = isApiError(err) ? err.detail : 'Invalid credentials'
      setError('root', { message })
    }
  }

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--hc-text-primary)] mb-1.5">
          Log in
        </h1>
        <p className="text-sm text-[var(--hc-text-secondary)]">
          Welcome back! Please enter your details.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              isInvalid={!!errors.email}
              hint={errors.email?.message}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-[#5925DC] hover:text-[#4a1db8] dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
            >
              Forgot password
            </Link>
          </div>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                isInvalid={!!errors.password}
                hint={errors.password?.message}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2.5">
          <Checkbox
            isSelected={remember}
            onChange={setRemember}
            aria-label="Remember for 30 days"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 select-none">
            Remember for 30 days
          </span>
        </div>

        {/* Root error */}
        {errors.root && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full justify-center !bg-[#5925DC] hover:!bg-[#4a1db8] !ring-[#5925DC]"
        >
          Sign in
        </Button>
      </form>

      {/* Sign up link */}
      <p className="text-center text-sm text-[var(--hc-text-secondary)]">
        Don't have an account?{' '}
        <Link
          to="/signup"
          className="font-semibold text-[#5925DC] hover:text-[#4a1db8] dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
