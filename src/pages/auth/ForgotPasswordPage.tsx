import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Button, Link, Typography } from '@mui/material'
import { authApi } from '@/api/modules/auth.api'
import { RHFTextField } from '@/components/shared/form'

const schema = z.object({ email: z.string().email('Invalid email') })
type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
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
        <Typography sx={{ fontWeight: 600 }}>Check your inbox</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          If that email is registered, you'll receive a reset link shortly.
        </Typography>
        <Link component={RouterLink} to="/login" underline="hover" sx={{ fontSize: 14, fontWeight: 600 }}>
          Back to sign in
        </Link>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Reset password
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Enter your email and we'll send you a reset link.
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <RHFTextField control={control} name="email" label="Email" type="email" autoComplete="email" placeholder="Enter your email" />

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
          Send reset link
        </Button>

        <Typography sx={{ textAlign: 'center', fontSize: 14 }}>
          <Link component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 600 }}>
            Back to sign in
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}
