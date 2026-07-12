import { useState } from 'react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Box, Button, Checkbox, FormControlLabel, Link, Typography } from '@mui/material'
import { authApi } from '@/api/modules/auth.api'
import { useAuthStore } from '@/store/auth.store'
import { isApiError } from '@/types/common.types'
import { RHFTextField } from '@/components/shared/form'

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Log in
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Welcome back! Please enter your details.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <RHFTextField control={control} name="email" label="Email" type="email" autoComplete="email" placeholder="Enter your email" />

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography component="span" sx={{ fontSize: 14, fontWeight: 500 }}>
              Password
            </Typography>
            <Link component={RouterLink} to="/forgot-password" underline="hover" sx={{ fontSize: 14, fontWeight: 600 }}>
              Forgot password
            </Link>
          </Box>
          <RHFTextField control={control} name="password" type="password" autoComplete="current-password" placeholder="••••••••••••" />
        </Box>

        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label={<Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Remember for 30 days</Typography>}
        />

        {errors.root && <Alert severity="error">{errors.root.message}</Alert>}

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </Box>

      <Typography sx={{ textAlign: 'center', fontSize: 14, color: 'text.secondary' }}>
        Don't have an account?{' '}
        <Link component={RouterLink} to="/signup" underline="hover" sx={{ fontWeight: 600 }}>
          Sign up
        </Link>
      </Typography>
    </Box>
  )
}
