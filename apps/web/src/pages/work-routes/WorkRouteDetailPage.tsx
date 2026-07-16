import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { Box, Button, Chip, IconButton, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import { updateWorkRouteSchema, type UpdateWorkRouteFormData } from 'core/schemas/workroute.schema'
import { useWorkRoute, useUpdateWorkRoute, useAssignPatientToRoute, useUnassignPatientFromRoute } from 'core/hooks/workroutes/useWorkRoutes'
import { usePatients } from 'core/hooks/patients/usePatients'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormSection } from '@/components/shared/FormSection'
import { HelpTooltip } from '@/components/shared/HelpTooltip'
import { WorkRouteFormFields } from '@/pages/work-routes/WorkRouteFormFields'
import type { WorkRouteStopDto } from 'core/types/workroute.types'

// Stops are derived from Patient.workRouteId, not a separately-entered list — so
// adding/removing a patient here calls the two dedicated assign/unassign endpoints
// (same shape as "Assigned Doctors" on the patient profile) instead of editing a field
// array. This is the only place in the UI to change who's on a route.
function PatientsOnRouteSection({ routeId, stops }: { routeId: string; stops: WorkRouteStopDto[] }) {
  const { t } = useTranslation()
  // Dropdown needs the full patient list; capped at the backend's clamp max (100 rows).
  const { data: patientsData } = usePatients(1, DROPDOWN_PAGE_SIZE)
  const assignPatient = useAssignPatientToRoute(routeId)
  const unassignPatient = useUnassignPatientFromRoute(routeId)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [visitTime, setVisitTime] = useState<string | null>(null)

  const patientOptions = (patientsData?.items ?? [])
    .filter((p) => !stops.some((s) => s.patientId === p.id))
    .map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))

  const handleAssign = () => {
    if (!selectedPatientId) return
    assignPatient.mutate(
      { patientId: selectedPatientId, data: { visitTime } },
      { onSuccess: () => { setSelectedPatientId(''); setVisitTime(null) } },
    )
  }

  return (
    <FormSection
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span>{t('workRoutes.detail.patientsOnRoute.title')}</span>
          <HelpTooltip topicKey="workroutes.manage" />
        </Box>
      }
    >
      {stops.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, color: 'text.secondary' }}>
          <PeopleOutlined sx={{ fontSize: 32, opacity: 0.4, mb: 0.5 }} />
          <Typography sx={{ fontSize: 13 }}>{t('workRoutes.detail.patientsOnRoute.empty')}</Typography>
        </Box>
      ) : (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {stops.map((stop) => (
            <Box
              key={stop.patientId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{stop.patientName}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{stop.address}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {stop.visitTime ? (
                  <Chip size="small" label={stop.visitTime.slice(0, 5)} />
                ) : (
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{t('workRoutes.detail.noVisitTime')}</Typography>
                )}
                <IconButton
                  size="small"
                  color="error"
                  disabled={unassignPatient.isPending}
                  onClick={() => unassignPatient.mutate(stop.patientId)}
                  aria-label={t('workRoutes.detail.removeAriaLabel', { name: stop.patientName })}
                >
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label={t('workRoutes.detail.patientLabel')}
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          sx={{ minWidth: 220 }}
          disabled={patientOptions.length === 0}
        >
          {patientOptions.length === 0 ? (
            <MenuItem value="" disabled>{t('workRoutes.detail.noPatientsAvailable')}</MenuItem>
          ) : (
            patientOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))
          )}
        </TextField>
        <TimePicker
          label={t('workRoutes.detail.visitTimeOptional')}
          value={visitTime ? dayjs(`2000-01-01T${visitTime}`) : null}
          onChange={(d) => setVisitTime(d && d.isValid() ? d.format('HH:mm:ss') : null)}
          slotProps={{ textField: { size: 'small', sx: { minWidth: 170 } } }}
        />
        <Button
          size="small"
          variant="outlined"
          onClick={handleAssign}
          disabled={!selectedPatientId || assignPatient.isPending}
          sx={{ mt: 0.5 }}
        >
          {t('common.actions.add')}
        </Button>
      </Box>
    </FormSection>
  )
}

function WorkRouteEditor({ routeId }: { routeId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: route } = useWorkRoute(routeId)
  const updateRoute = useUpdateWorkRoute(routeId)
  const [saved, setSaved] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<UpdateWorkRouteFormData>({
    resolver: zodResolver(updateWorkRouteSchema),
    values: route
      ? {
          routeName: route.routeName,
          description: route.description,
          featuredImage: route.featuredImage,
          recurrenceDays: route.recurrenceDays,
          recurrenceStartDate: route.recurrenceStartDate,
          recurrenceEndDate: route.recurrenceEndDate,
          isRecurrenceIndefinite: route.isRecurrenceIndefinite,
        }
      : undefined,
  })

  const onSubmit = async (data: UpdateWorkRouteFormData) => {
    await updateRoute.mutateAsync(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <WorkRouteFormFields control={control} isCreate={false} />

      {route && <PatientsOnRouteSection routeId={routeId} stops={route.stops} />}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button type="submit" variant="contained" disabled={!isDirty} loading={isSubmitting}>
          {t('common.actions.save')}
        </Button>
        <Button color="inherit" onClick={() => navigate('/work-routes')}>
          {t('common.actions.cancel')}
        </Button>
        {saved && (
          <Typography color="success.main" sx={{ fontSize: 14, fontWeight: 500 }}>
            {t('workRoutes.detail.savedMessage')}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export function WorkRouteDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: route, isLoading } = useWorkRoute(id!)

  return (
    <Box>
      <PageHeader
        title={route?.routeName ?? t('workRoutes.detail.fallbackTitle')}
        description={route ? t('workRoutes.detail.clinicDescription', { clinic: route.clinicName }) : ''}
        action={
          <Button color="inherit" startIcon={<ArrowBackOutlined />} onClick={() => navigate('/work-routes')}>
            {t('common.actions.back')}
          </Button>
        }
      />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={48} />
          ))}
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          {id && <WorkRouteEditor routeId={id} />}
        </Paper>
      )}
    </Box>
  )
}
