import { useParams, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Paper, Skeleton, Typography } from '@mui/material'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import { useClinic, useUpdateClinic } from 'core/hooks/clinics/useClinics'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClinicForm } from '@/pages/clinics/ClinicForm'
import type { ClinicFormData } from 'core/schemas/clinic.schema'

export function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: clinic, isLoading, isError } = useClinic(id!)
  const updateClinic = useUpdateClinic(id!)

  const handleUpdate = async (data: ClinicFormData) => {
    await updateClinic.mutateAsync(data)
  }

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rounded" width={200} height={32} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    )
  }

  if (isError || !clinic) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          Clinic not found.
        </Typography>
        <Button onClick={() => navigate('/clinics')} sx={{ mt: 1.5 }}>
          Back to clinics
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 520 }}>
      <PageHeader
        title={clinic.name}
        description="Edit clinic details"
        action={
          <Button color="inherit" startIcon={<ArrowBackOutlined />} onClick={() => navigate('/clinics')}>
            Back
          </Button>
        }
      />

      {updateClinic.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Clinic updated successfully.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <ClinicForm defaultValues={clinic} onSubmit={handleUpdate} submitLabel="Save changes" />
      </Paper>
    </Box>
  )
}
