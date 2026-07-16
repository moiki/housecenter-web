import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Button, Link, Typography } from '@mui/material'
import { authApi } from 'core/api/modules/auth.api'
import { RHFTextField } from '@/components/shared/form'

const schema = z.object({ email: z.string().email('Invalid email') })
type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)

  const mutation = useMutation({ mutationFn: authApi.requestPasswordReset })

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: FormData) => {
    await mutation.mutateAsync(data)
    // Always show success — anti-enumeration: don't reveal whether email exists
    setSent(true)
  }

  if (sent) {
    return (
      <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ fontWeight: 600 }}>{t('auth.forgotPassword.sentTitle')}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {t('auth.forgotPassword.sentDescription')}
        </Typography>
        <Link component={RouterLink} to="/login" underline="hover" sx={{ fontSize: 14, fontWeight: 600 }}>
          {t('auth.backToSignIn')}
        </Link>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          {t('auth.forgotPassword.title')}
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {t('auth.forgotPassword.subtitle')}
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
          name="email"
          label={t('common.fields.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.form.emailPlaceholder')}
        />

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
          {t('auth.forgotPassword.submitButton')}
        </Button>

        <Typography sx={{ textAlign: 'center', fontSize: 14 }}>
          <Link component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 600 }}>
            {t('auth.backToSignIn')}
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}
