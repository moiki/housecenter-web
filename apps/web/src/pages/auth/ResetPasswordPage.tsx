import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Box, Button, Typography } from '@mui/material'
import { authApi } from 'core/api/modules/auth.api'
import { translateErrorCode } from 'core/i18n'
import { isApiError } from 'core/types/common.types'
import { RHFTextField } from '@/components/shared/form'

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
  const { t, i18n } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  const mutation = useMutation({ mutationFn: authApi.resetPassword })

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync({ token, newPassword: data.newPassword })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const lang = i18n.language.startsWith('es') ? 'es' : 'en'
      const message = isApiError(err) ? translateErrorCode(err.code, lang) : translateErrorCode(undefined, lang)
      setError('root', { message })
    }
  }

  if (done) {
    return (
      <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ fontWeight: 600 }}>{t('auth.resetPassword.doneTitle')}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('auth.resetPassword.doneDescription')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          {t('auth.resetPassword.title')}
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {t('auth.resetPassword.subtitle')}
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <RHFTextField
          control={control}
          name="newPassword"
          label={t('auth.resetPassword.newPasswordLabel')}
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

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting} disabled={!token}>
          {t('auth.resetPassword.submitButton')}
        </Button>
      </Box>
    </Box>
  )
}
