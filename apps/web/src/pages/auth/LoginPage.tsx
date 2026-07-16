import { useState } from 'react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Box, Button, Checkbox, FormControlLabel, Link, Typography } from '@mui/material'
import { authApi } from 'core/api/modules/auth.api'
import { translateErrorCode } from 'core/i18n'
import { useAuthStore } from '@/store/auth.store'
import { isApiError } from 'core/types/common.types'
import { RHFTextField } from '@/components/shared/form'
import { getOrCreateDeviceId } from '@/lib/deviceId'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { t, i18n } = useTranslation()
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
      const tokens = await authApi.login({
        email: data.email,
        password: data.password,
        deviceId: getOrCreateDeviceId(),
        platform: 'Web',
      })
      // Store tokens before calling me() so the request interceptor picks them up
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await authApi.me()
      setAuth(user, tokens.accessToken, tokens.refreshToken)

      if (user.darkMode) document.documentElement.classList.add('dark-mode')
      navigate(from, { replace: true })
    } catch (err) {
      const lang = i18n.language.startsWith('es') ? 'es' : 'en'
      const message = isApiError(err) ? translateErrorCode(err.code, lang) : translateErrorCode(undefined, lang)
      setError('root', { message })
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          {t('auth.login.title')}
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {t('auth.login.subtitle')}
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <RHFTextField
          control={control}
          name="email"
          label={t('common.fields.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.form.emailPlaceholder')}
        />

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography component="span" sx={{ fontSize: 14, fontWeight: 500 }}>
              {t('common.fields.password')}
            </Typography>
            <Link component={RouterLink} to="/forgot-password" underline="hover" sx={{ fontSize: 14, fontWeight: 600 }}>
              {t('auth.login.forgotPasswordLink')}
            </Link>
          </Box>
          <RHFTextField control={control} name="password" type="password" autoComplete="current-password" placeholder="••••••••••••" />
        </Box>

        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label={<Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('auth.login.rememberLabel')}</Typography>}
        />

        {errors.root && <Alert severity="error">{errors.root.message}</Alert>}

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
          {t('auth.login.submitButton')}
        </Button>
      </Box>

      <Typography sx={{ textAlign: 'center', fontSize: 14, color: 'text.secondary' }}>
        {t('auth.login.noAccountText')}{' '}
        <Link component={RouterLink} to="/signup" underline="hover" sx={{ fontWeight: 600 }}>
          {t('auth.login.signUpLink')}
        </Link>
      </Typography>
    </Box>
  )
}
