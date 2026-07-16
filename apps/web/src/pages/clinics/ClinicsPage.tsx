import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
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
import BusinessOutlined from '@mui/icons-material/BusinessOutlined'
import { useClinics, useCreateClinic, useDeactivateClinic } from 'core/hooks/clinics/useClinics'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowLink } from '@/components/shared/RowLink'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ClinicForm } from '@/pages/clinics/ClinicForm'
import type { ClinicResponse } from 'core/types/clinic.types'
import type { ClinicFormData } from 'core/schemas/clinic.schema'

const NEW_CLINIC_FORM_ID = 'new-clinic-form'

export function ClinicsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useClinics(page)
  const createClinic = useCreateClinic()
  const deactivateClinic = useDeactivateClinic()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<ClinicResponse | null>(null)

  const handleCreate = async (data: ClinicFormData) => {
    await createClinic.mutateAsync(data)
    setSlideOpen(false)
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivateClinic.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <Box>
      <PageHeader
        title={t('clinics.title')}
        description={t('clinics.description')}
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setSlideOpen(true)}>
            {t('clinics.newClinicButton')}
          </Button>
        }
      />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : !data?.items.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <BusinessOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>{t('clinics.empty')}</Typography>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('clinics.title')}</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.fields.name')}</TableCell>
                    <TableCell>{t('common.fields.address')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((clinic) => (
                    <TableRow key={clinic.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        <RowLink onClick={() => navigate(`/clinics/${clinic.id}`)} aria-label={`${t('common.actions.view')} ${clinic.name}`}>
                          {clinic.name}
                        </RowLink>
                      </TableCell>
                      <TableCell>{clinic.address}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('common.actions.edit')}>
                          <IconButton size="small" onClick={() => navigate(`/clinics/${clinic.id}`)} aria-label={t('common.actions.edit')}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.actions.deactivate')}>
                          <IconButton size="small" color="error" onClick={() => setToDeactivate(clinic)} aria-label={t('common.actions.deactivate')}>
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
                {t('clinics.pageSummary', { count: data.totalCount, page: data.page, totalPages: data.totalPages })}
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
        title={t('clinics.newClinicDialog.title')}
        description={t('clinics.newClinicDialog.description')}
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setSlideOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" form={NEW_CLINIC_FORM_ID} variant="contained" loading={createClinic.isPending}>
              {t('clinics.newClinicDialog.createButton')}
            </Button>
          </>
        }
      >
        <ClinicForm formId={NEW_CLINIC_FORM_ID} onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title={t('clinics.confirmDeactivate.title')}
        description={t('clinics.confirmDeactivate.description', { name: toDeactivate?.name })}
        confirmLabel={t('common.actions.deactivate')}
        loading={deactivateClinic.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
