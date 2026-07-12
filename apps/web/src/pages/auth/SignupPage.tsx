import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { authApi } from '@/api/modules/auth.api'
import { invitationsApi } from '@/api/modules/invitations.api'
import { useAuthStore } from '@/store/auth.store'
import { isApiError } from '@/types/common.types'
import { RHFTextField } from '@/components/shared/form'

const schema = z
  .object({
    firstName: z.string().min(1, 'Required').max(100),
    lastName: z.string().min(1, 'Required').max(100),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export function SignupPage() {
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
    defaultValues: { firstName: '', lastName: '', password: '', confirmPassword: '' },
  })

  const signup = useMutation({
    mutationFn: (data: FormData) =>
      authApi.signup({ token, firstName: data.firstName, lastName: data.lastName, password: data.password }),
    onSuccess: async (tokens) => {
      const user = await authApi.me()
      setAuth(user, tokens.accessToken, tokens.refreshToken)
      navigate('/', { replace: true })
    },
    onError: (err) => {
      const message = isApiError(err) ? err.detail : 'Signup failed'
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
        <Typography sx={{ fontWeight: 600, color: 'error.main' }}>Invalid or expired invitation</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Ask an administrator to send you a new invite.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Create your account
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Complete your registration</Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit((d) => signup.mutate(d))}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <RHFTextField control={control} name="firstName" label="First name" autoComplete="given-name" />
          <RHFTextField control={control} name="lastName" label="Last name" autoComplete="family-name" />
        </Box>

        <RHFTextField control={control} name="password" label="Password" type="password" autoComplete="new-password" placeholder="••••••••••••" />
        <RHFTextField control={control} name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" placeholder="••••••••••••" />

        {errors.root && <Alert severity="error">{errors.root.message}</Alert>}

        <Button type="submit" variant="contained" fullWidth loading={isSubmitting || signup.isPending}>
          Create account
        </Button>
      </Box>
    </Box>
  )
}
