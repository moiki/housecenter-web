import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  Alert,
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
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import WorkOutlined from '@mui/icons-material/WorkOutlined'
import { collaboratorSchema, type CollaboratorFormData } from 'core/schemas/collaborator.schema'
import {
  useCollaborators,
  useCreateCollaborator,
  useUpdateCollaborator,
  useDeactivateCollaborator,
} from 'core/hooks/collaborators/useCollaborators'
import { useClinics } from 'core/hooks/clinics/useClinics'
import { useWorkRoutes } from 'core/hooks/workroutes/useWorkRoutes'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { isApiError } from 'core/types/common.types'
import { translateErrorCode } from 'core/i18n'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowLink } from '@/components/shared/RowLink'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RHFTextField, RHFSelect } from '@/components/shared/form'
import type { CollaboratorResponse } from 'core/types/collaborator.types'

const COLLABORATOR_FORM_ID = 'collaborator-form'

function CollaboratorForm({
  defaultValues,
  onSubmit,
  formId,
}: {
  defaultValues?: CollaboratorResponse
  onSubmit: (data: CollaboratorFormData) => Promise<void>
  formId: string
}) {
  const { t } = useTranslation()
  // Dropdowns need the full list; capped at the backend's clamp max (100 rows).
  const { data: clinicsData } = useClinics(1, DROPDOWN_PAGE_SIZE)
  const { data: routesData } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CollaboratorFormData>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: defaultValues
      ? {
          firstName: defaultValues.firstName,
          lastName: defaultValues.lastName,
          email: defaultValues.email,
          phoneNumber: defaultValues.phoneNumber,
          address: defaultValues.address,
          country: defaultValues.country,
          state: defaultValues.state,
          city: defaultValues.city,
          profilePicture: defaultValues.profilePicture,
          clinicId: defaultValues.clinicId,
          workRouteId: defaultValues.workRouteId,
          positions: defaultValues.positions.map((p) => p.name),
        }
      : {
          firstName: '', lastName: '', email: '', phoneNumber: '',
          address: '', country: null, state: null, city: null,
          profilePicture: null, clinicId: '', workRouteId: null,
          positions: [''],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    // @ts-expect-error positions is string[]; useFieldArray expects object[]
    name: 'positions',
  })

  const clinicOptions = (clinicsData?.items ?? []).map((c) => ({ value: c.id, label: c.name }))
  // Empty-string option => Zod transforms '' -> null (replaces the legacy '__none__' sentinel).
  const routeOptions = [
    { value: '', label: t('collaborators.form.noRouteOption') },
    ...(routesData?.items ?? []).map((r) => ({ value: r.id, label: r.routeName })),
  ]

  return (
    <Box component="form" id={formId} onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <RHFTextField control={control} name="firstName" label={t('common.fields.firstName')} placeholder={t('collaborators.form.firstNamePlaceholder')} />
        <RHFTextField control={control} name="lastName" label={t('common.fields.lastName')} placeholder={t('collaborators.form.lastNamePlaceholder')} />
      </Box>

      <RHFTextField control={control} name="email" label={t('common.fields.email')} type="email" placeholder={t('collaborators.form.emailPlaceholder')} />
      <RHFTextField control={control} name="phoneNumber" label={t('common.fields.phone')} placeholder={t('collaborators.form.phonePlaceholder')} />
      <RHFTextField control={control} name="address" label={t('common.fields.address')} placeholder={t('collaborators.form.addressPlaceholder')} />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
        <RHFTextField control={control} name="country" label={t('common.fields.country')} placeholder={t('collaborators.form.countryPlaceholder')} />
        <RHFTextField control={control} name="state" label={t('common.fields.state')} placeholder={t('collaborators.form.statePlaceholder')} />
        <RHFTextField control={control} name="city" label={t('common.fields.city')} placeholder={t('collaborators.form.cityPlaceholder')} />
      </Box>

      <RHFSelect control={control} name="clinicId" label={t('collaborators.form.clinicLabel')} options={clinicOptions} />
      <RHFSelect control={control} name="workRouteId" label={t('collaborators.form.workRouteOptionalLabel')} options={routeOptions} />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{t('collaborators.positions')}</Typography>
          <Button size="small" startIcon={<AddOutlined />} onClick={() => append('')}>
            {t('collaborators.addPositionButton')}
          </Button>
        </Box>

        {errors.positions?.root && (
          <Typography color="error" sx={{ fontSize: 12, mb: 1 }}>
            {errors.positions.root.message}
          </Typography>
        )}

        <Stack spacing={1.5}>
          {fields.map((f, i) => (
            <Box key={f.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <RHFTextField
                control={control}
                name={`positions.${i}` as `positions.${number}`}
                placeholder={t('collaborators.positionPlaceholder', { index: i + 1 })}
              />
              {fields.length > 1 && (
                <IconButton size="small" color="error" onClick={() => remove(i)} aria-label={t('collaborators.removePositionAriaLabel')} sx={{ mt: 0.5 }}>
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}

export function CollaboratorsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [page, setPage] = useState(1)
  const { data, isLoading } = useCollaborators(page)
  const createCollaborator = useCreateCollaborator()
  const deactivateCollaborator = useDeactivateCollaborator()

  const [slideMode, setSlideMode] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<CollaboratorResponse | null>(null)
  const [toDeactivate, setToDeactivate] = useState<CollaboratorResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const updateCollaborator = useUpdateCollaborator(selected?.id ?? '')

  const openCreate = () => { setSelected(null); setSlideMode('create') }
  const openEdit = (c: CollaboratorResponse) => { setSelected(c); setSlideMode('edit') }
  const closeSlide = () => { setSlideMode(null); setSelected(null) }

  const handleCreate = async (data: CollaboratorFormData) => {
    setActionError(null)
    try {
      await createCollaborator.mutateAsync(data)
      closeSlide()
    } catch (err) {
      setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang))
    }
  }

  const handleUpdate = async (data: CollaboratorFormData) => {
    setActionError(null)
    try {
      await updateCollaborator.mutateAsync(data)
      closeSlide()
    } catch (err) {
      setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang))
    }
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    setActionError(null)
    try {
      await deactivateCollaborator.mutateAsync(toDeactivate.id)
      setToDeactivate(null)
    } catch (err) {
      setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang))
    }
  }

  return (
    <Box>
      <PageHeader
        title={t('collaborators.title')}
        description={t('collaborators.description')}
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>
            {t('collaborators.newCollaboratorButton')}
          </Button>
        }
      />

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : !data?.items.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <WorkOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>{t('collaborators.empty')}</Typography>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('collaborators.title')}</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.fields.name')}</TableCell>
                    <TableCell>{t('collaborators.table.clinic')}</TableCell>
                    <TableCell>{t('collaborators.positions')}</TableCell>
                    <TableCell>{t('collaborators.table.contact')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <RowLink
                          onClick={() => openEdit(c)}
                          aria-label={t('collaborators.viewAriaLabel', { name: `${c.firstName} ${c.lastName}` })}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                        >
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main' }}>
                            {c.firstName[0]}{c.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                              {c.firstName} {c.lastName}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{c.email}</Typography>
                          </Box>
                        </RowLink>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{c.clinicName}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {c.positions.map((p) => (
                            <Chip key={p.id} label={p.name} size="small" color="primary" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{c.phoneNumber}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('common.actions.edit')}>
                          <IconButton size="small" onClick={() => openEdit(c)} aria-label={t('common.actions.edit')}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.actions.deactivate')}>
                          <IconButton size="small" color="error" onClick={() => setToDeactivate(c)} aria-label={t('common.actions.deactivate')}>
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
                {t('collaborators.pageSummary', { count: data.totalCount, page: data.page, totalPages: data.totalPages })}
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
        open={slideMode !== null}
        onClose={closeSlide}
        title={
          slideMode === 'edit'
            ? t('collaborators.slideOver.editTitle', { name: `${selected?.firstName} ${selected?.lastName}` })
            : t('collaborators.slideOver.newTitle')
        }
        description={
          slideMode === 'edit'
            ? t('collaborators.slideOver.editDescription')
            : t('collaborators.slideOver.newDescription')
        }
        footer={
          <>
            <Button variant="text" color="inherit" onClick={closeSlide}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              form={COLLABORATOR_FORM_ID}
              variant="contained"
              loading={slideMode === 'edit' ? updateCollaborator.isPending : createCollaborator.isPending}
            >
              {slideMode === 'edit' ? t('common.actions.save') : t('collaborators.slideOver.createButton')}
            </Button>
          </>
        }
      >
        {slideMode === 'edit' && selected ? (
          <CollaboratorForm formId={COLLABORATOR_FORM_ID} defaultValues={selected} onSubmit={handleUpdate} />
        ) : (
          <CollaboratorForm formId={COLLABORATOR_FORM_ID} onSubmit={handleCreate} />
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title={t('collaborators.confirmDeactivate.title')}
        description={t('collaborators.confirmDeactivate.description', { name: `${toDeactivate?.firstName} ${toDeactivate?.lastName}` })}
        confirmLabel={t('common.actions.deactivate')}
        loading={deactivateCollaborator.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
