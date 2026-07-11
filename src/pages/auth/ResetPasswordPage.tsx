import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Box, Button, Typography } from '@mui/material'
import { authApi } from '@/api/modules/auth.api'
import { isApiError } from '@/types/common.types'
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
      const message = isApiError(err) ? err.detail : 'Reset failed. The link may have expired.'
      setError('root', { message })
    }
  }

  if (done) {
    return (
      <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ fontWeight: 600 }}>Password updated</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Redirecting to sign in…</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          New password
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Choose a new password for your account.
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <RHFTextField control={control} name="newPassword" label="New password" type="password" autoComplete="new-password" placeholder="••••••••••••" />
        <RHFTextField control={control} name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" placeholder="••••••••••••" />

        {errors.root && <Alert severity="error">{errors.root.message}</Alert>}

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting} disabled={!token}>
          Update password
        </Button>
      </Box>
    </Box>
  )
}
