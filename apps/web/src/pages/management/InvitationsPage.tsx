import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  Alert,
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
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined'
import SendOutlined from '@mui/icons-material/SendOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import MailOutlined from '@mui/icons-material/MailOutlined'
import { useInvitations, useCreateInvitation, useResendInvitation, useDeleteInvitation } from 'core/hooks/invitations/useInvitations'
import { useRoles } from 'core/hooks/roles/useRoles'
import { isApiError } from 'core/types/common.types'
import { translateErrorCode } from 'core/i18n'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RHFTextField, RHFSelect } from '@/components/shared/form'
import type { InvitationResponse } from 'core/types/invitation.types'

type ChipColor = 'default' | 'warning' | 'success'
const STATUS_COLOR: Record<string, ChipColor> = {
  Pending: 'warning',
  Accepted: 'success',
  Expired: 'default',
}

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  roleId: z.string().min(1, 'Select a role'),
})
type FormData = z.infer<typeof schema>

const INVITE_FORM_ID = 'invite-form'

function InviteForm({
  formId,
  roleOptions,
  onSubmit,
}: {
  formId: string
  roleOptions: { value: string; label: string }[]
  onSubmit: (data: FormData) => Promise<void>
}) {
  const { t } = useTranslation()
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', roleId: '' },
  })

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      <RHFTextField control={control} name="email" label={t('common.fields.email')} type="email" placeholder={t('management.invitations.form.emailPlaceholder')} />
      <RHFSelect control={control} name="roleId" label={t('management.invitations.form.roleLabel')} options={roleOptions} />
    </Box>
  )
}

export function InvitationsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [page, setPage] = useState(1)
  const { data, isLoading } = useInvitations(page)
  const { data: roles } = useRoles()
  const createInvitation = useCreateInvitation()
  const resendInvitation = useResendInvitation()
  const deleteInvitation = useDeleteInvitation()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDelete, setToDelete] = useState<InvitationResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const roleOptions = (roles ?? []).map((r) => ({ value: r.id, label: t(`roles.${r.name}`) }))

  const handleCreate = async (data: FormData) => {
    setActionError(null)
    try {
      await createInvitation.mutateAsync(data)
      setSlideOpen(false)
    } catch (err) {
      setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang))
    }
  }

  const handleResend = (id: string) => {
    setActionError(null)
    resendInvitation.mutate(id, {
      onError: (err) => setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang)),
    })
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setActionError(null)
    try {
      await deleteInvitation.mutateAsync(toDelete.id)
      setToDelete(null)
    } catch (err) {
      setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang))
    }
  }

  return (
    <Box>
      <PageHeader
        title={t('management.invitations.title')}
        description={t('management.invitations.description')}
        action={
          <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setSlideOpen(true)}>
            {t('management.invitations.inviteButton')}
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
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : !data?.items.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <MailOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>{t('management.invitations.empty')}</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('management.invitations.title')}</Typography>
            <Chip label={data.totalCount} size="small" />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.fields.email')}</TableCell>
                  <TableCell>{t('management.invitations.table.status')}</TableCell>
                  <TableCell>{t('management.invitations.table.sent')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{inv.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={t(`management.invitations.status.${inv.status}`)}
                        size="small"
                        color={STATUS_COLOR[inv.status] ?? 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                      {new Date(inv.createdDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      {inv.status === 'Pending' && (
                        <Tooltip title={t('management.invitations.resendAriaLabel')}>
                          <IconButton size="small" onClick={() => handleResend(inv.id)} aria-label={t('management.invitations.resendAriaLabel')}>
                            <SendOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('common.actions.delete')}>
                        <IconButton size="small" color="error" onClick={() => setToDelete(inv)} aria-label={t('common.actions.delete')}>
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
      )}

      {data && data.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Pagination count={data.totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}

      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={t('management.invitations.slideOver.title')}
        description={t('management.invitations.slideOver.description')}
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setSlideOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" form={INVITE_FORM_ID} variant="contained" loading={createInvitation.isPending}>
              {t('management.invitations.slideOver.sendButton')}
            </Button>
          </>
        }
      >
        <InviteForm formId={INVITE_FORM_ID} roleOptions={roleOptions} onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDelete}
        title={t('management.invitations.confirmDelete.title')}
        description={t('management.invitations.confirmDelete.description', { email: toDelete?.email })}
        confirmLabel={t('common.actions.delete')}
        loading={deleteInvitation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  )
}
