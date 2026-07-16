import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import { patientSchema, type PatientFormData } from 'core/schemas/patient.schema'
import { usePatients, useCreatePatient, useDeactivatePatient } from 'core/hooks/patients/usePatients'
import { useClinics } from 'core/hooks/clinics/useClinics'
import { useWorkRoutes } from 'core/hooks/workroutes/useWorkRoutes'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowLink } from '@/components/shared/RowLink'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormSection } from '@/components/shared/FormSection'
import { RHFTextField, RHFSelect, RHFDatePicker, RHFTimePicker } from '@/components/shared/form'
import type { PatientResponse } from 'core/types/patient.types'

const NEW_PATIENT_FORM_ID = 'new-patient-form'

// The submit button lives in the SlideOver footer (a DOM sibling), so the form is
// tagged with `id` and the button links to it via its `form` attribute — validation
// and submit still run through react-hook-form's handleSubmit.
function PatientForm({ formId, onSubmit }: { formId: string; onSubmit: (d: PatientFormData) => Promise<void> }) {
  const { t } = useTranslation()
  // Dropdowns need the full list; capped at the backend's clamp max (100 rows).
  const { data: clinicsData } = useClinics(1, DROPDOWN_PAGE_SIZE)
  const { data: routesData } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)

  const GENDER_OPTIONS = [
    { value: 'Male', label: t('enums.gender.Male') },
    { value: 'Female', label: t('enums.gender.Female') },
  ]
  const TYPE_OPTIONS = [
    { value: 'Medical', label: t('enums.attentionType.Medical') },
    { value: 'EducationalReinforcement', label: t('enums.attentionType.EducationalReinforcement') },
  ]

  const { control, handleSubmit } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '', lastName: '', profile: null,
      birthDate: '', gender: 'Male',
      country: null, state: null, city: null,
      address: '', description: null,
      primaryAttentionType: 'Medical',
      clinicId: null, workRouteId: null, routeVisitTime: null,
    },
  })
  const selectedWorkRouteId = useWatch({ control, name: 'workRouteId' })

  // Empty-string option => Zod transforms '' -> null (replaces the legacy '__none__' sentinel).
  const clinicOptions = [
    { value: '', label: t('patients.form.noClinicOption') },
    ...(clinicsData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]
  const routeOptions = [
    { value: '', label: t('patients.form.noRouteOption') },
    ...(routesData?.items ?? []).map((r) => ({ value: r.id, label: r.routeName })),
  ]

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}
    >
      <FormSection title={t('patients.form.sections.details')}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <RHFTextField control={control} name="firstName" label={t('common.fields.firstName')} />
          <RHFTextField control={control} name="lastName" label={t('common.fields.lastName')} />
        </Box>
        <RHFDatePicker control={control} name="birthDate" label={t('patients.fields.birthDate')} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <RHFSelect control={control} name="gender" label={t('patients.fields.gender')} options={GENDER_OPTIONS} />
          <RHFSelect control={control} name="primaryAttentionType" label={t('patients.fields.attentionType')} options={TYPE_OPTIONS} />
        </Box>
      </FormSection>

      <FormSection title={t('patients.form.sections.location')}>
        <RHFTextField control={control} name="address" label={t('common.fields.address')} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
          <RHFTextField control={control} name="country" label={t('common.fields.country')} />
          <RHFTextField control={control} name="state" label={t('common.fields.state')} />
          <RHFTextField control={control} name="city" label={t('common.fields.city')} />
        </Box>
      </FormSection>

      <FormSection title={t('patients.form.sections.assignment')}>
        <RHFSelect control={control} name="clinicId" label={t('patients.form.clinicOptional')} options={clinicOptions} />
        <RHFSelect control={control} name="workRouteId" label={t('patients.form.workRouteOptional')} options={routeOptions} />
        {/* Only meaningful once a route is picked — drives stop ordering on that
            route's calendar/map view. */}
        {!!selectedWorkRouteId && (
          <RHFTimePicker control={control} name="routeVisitTime" label={t('patients.form.visitTimeOnRoute')} />
        )}
      </FormSection>
    </Box>
  )
}

function calcAge(birthDate: string) {
  const diff = Date.now() - new Date(birthDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export function PatientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = usePatients(page)
  const createPatient = useCreatePatient()
  const deactivatePatient = useDeactivatePatient()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<PatientResponse | null>(null)

  const handleCreate = async (d: PatientFormData) => {
    await createPatient.mutateAsync(d)
    setSlideOpen(false)
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivatePatient.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <Box>
      <PageHeader
        title={t('patients.title')}
        description={t('patients.description')}
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setSlideOpen(true)}>
            {t('patients.newPatientButton')}
          </Button>
        }
      />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : !data?.items.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <PeopleOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>{t('patients.empty')}</Typography>
        </Paper>
      ) : (
        <>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden', opacity: isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('patients.title')}</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('patients.table.patient')}</TableCell>
                    <TableCell>{t('patients.fields.age')}</TableCell>
                    <TableCell>{t('patients.fields.gender')}</TableCell>
                    <TableCell>{t('patients.fields.type')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <RowLink
                          onClick={() => navigate(`/patients/${p.id}`)}
                          aria-label={`${t('common.actions.view')} ${p.firstName} ${p.lastName}`}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                        >
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main' }}>
                            {p.firstName[0]}{p.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                              {p.firstName} {p.lastName}
                            </Typography>
                            <Typography
                              sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {p.address}
                            </Typography>
                          </Box>
                        </RowLink>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{t('patients.ageYears', { age: calcAge(p.birthDate) })}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{t(`enums.gender.${p.gender}`)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={p.primaryAttentionType === 'Medical' ? 'info' : 'primary'}
                          label={t(`enums.attentionType.${p.primaryAttentionType}`)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('common.actions.view')}>
                          <IconButton size="small" onClick={() => navigate(`/patients/${p.id}`)} aria-label={t('common.actions.view')}>
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.actions.deactivate')}>
                          <IconButton size="small" color="error" onClick={() => setToDeactivate(p)} aria-label={t('common.actions.deactivate')}>
                            <DeleteOutlineOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {data.totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {t('patients.pageSummary', { count: data.totalCount, page: data.page, totalPages: data.totalPages })}
              </Typography>
              <Pagination
                count={data.totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={t('patients.newPatientDialog.title')}
        description={t('patients.newPatientDialog.description')}
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setSlideOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" form={NEW_PATIENT_FORM_ID} variant="contained" loading={createPatient.isPending}>
              {t('patients.newPatientDialog.createButton')}
            </Button>
          </>
        }
      >
        <PatientForm formId={NEW_PATIENT_FORM_ID} onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title={t('patients.confirmDeactivate.title')}
        description={t('patients.confirmDeactivate.description', { name: `${toDeactivate?.firstName} ${toDeactivate?.lastName}` })}
        confirmLabel={t('common.actions.deactivate')}
        loading={deactivatePatient.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
