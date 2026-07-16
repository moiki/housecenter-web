import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { authApi } from 'core/api/modules/auth.api'
import { invitationsApi } from 'core/api/modules/invitations.api'
import { translateErrorCode } from 'core/i18n'
import { useAuthStore } from '@/store/auth.store'
import { isApiError } from 'core/types/common.types'
import { RHFTextField } from '@/components/shared/form'
import { getOrCreateDeviceId } from '@/lib/deviceId'

const schema = z
  .object({
    firstName: z.string().min(1, 'Required').max(100),
    lastName: z.string().min(1, 'Required').max(100),
    address: z.string().min(1, 'Required').max(500),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export function SignupPage() {
  const { t, i18n } = useTranslation()
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
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', address: '', password: '', confirmPassword: '' },
  })

  const signup = useMutation({
    mutationFn: (data: FormData) =>
      authApi.signup({
        invitationToken: token,
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        password: data.password,
        deviceId: getOrCreateDeviceId(),
        platform: 'Web',
      }),
    onSuccess: async (tokens) => {
      const user = await authApi.me()
      setAuth(user, tokens.accessToken, tokens.refreshToken)
      navigate('/', { replace: true })
    },
    onError: (err) => {
      const lang = i18n.language.startsWith('es') ? 'es' : 'en'
      const message = isApiError(err) ? translateErrorCode(err.code, lang) : translateErrorCode(undefined, lang)
      setError('root', { message })
    },
  })

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  if (!token) return null

  if (validation.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (validation.isError) {
    return (
      <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ fontWeight: 600, color: 'error.main' }}>{t('auth.signup.invalidInvitationTitle')}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {t('auth.signup.invalidInvitationDescription')}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          {t('auth.signup.title')}
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('auth.signup.subtitle')}</Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit((d) => signup.mutate(d))}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <RHFTextField control={control} name="firstName" label={t('common.fields.firstName')} autoComplete="given-name" />
          <RHFTextField control={control} name="lastName" label={t('common.fields.lastName')} autoComplete="family-name" />
        </Box>

        <RHFTextField control={control} name="address" label={t('common.fields.address')} autoComplete="street-address" />

        <RHFTextField
          control={control}
          name="password"
          label={t('common.fields.password')}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
        />
        <RHFTextField
          control={control}
          name="confirmPassword"
          label={t('common.fields.confirmPassword')}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
        />

        {errors.root && <Alert severity="error">{errors.root.message}</Alert>}

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting || signup.isPending}>
          {t('auth.signup.submitButton')}
        </Button>
      </Box>
    </Box>
  )
}
