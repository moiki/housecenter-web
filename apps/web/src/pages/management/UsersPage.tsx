import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Avatar,
  Box,
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
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import { useUsers, useDeactivateUser } from 'core/hooks/users/useUsers'
import { isApiError } from 'core/types/common.types'
import { translateErrorCode } from 'core/i18n'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { UserResponse } from 'core/types/user.types'

type ChipColor = 'default' | 'error' | 'warning' | 'info' | 'success'

const ROLE_COLOR: Record<string, ChipColor> = {
  Owner: 'error',
  Administrator: 'warning',
  Doctor: 'info',
  Member: 'default',
  Sponsor: 'success',
}

export function UsersPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [page, setPage] = useState(1)
  const { data, isLoading } = useUsers(page)
  const deactivate = useDeactivateUser()
  const [toDeactivate, setToDeactivate] = useState<UserResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    setActionError(null)
    try {
      await deactivate.mutateAsync(toDeactivate.id)
      setToDeactivate(null)
    } catch (err) {
      setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang))
    }
  }

  return (
    <Box>
      <PageHeader title={t('management.users.title')} description={t('management.users.description')} />

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
          <AdminPanelSettingsOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>{t('management.users.empty')}</Typography>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('management.users.title')}</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('management.users.table.user')}</TableCell>
                    <TableCell>{t('management.users.table.roles')}</TableCell>
                    <TableCell>{t('management.users.table.status')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main' }}>
                            {user.firstName[0]}{user.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{user.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.roles.map((r) => (
                            <Chip key={r} label={t(`roles.${r}`)} size="small" color={ROLE_COLOR[r] ?? 'default'} variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? t('management.users.status.active') : t('management.users.status.inactive')}
                          size="small"
                          color={user.isActive ? 'success' : 'default'}
                          variant={user.isActive ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {user.isActive && (
                          <Tooltip title={t('common.actions.deactivate')}>
                            <IconButton size="small" color="error" onClick={() => setToDeactivate(user)} aria-label={t('common.actions.deactivate')}>
                              <DeleteOutlineOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                {t('management.users.pageSummary', { count: data.totalCount, page: data.page, totalPages: data.totalPages })}
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

      <ConfirmDialog
        open={!!toDeactivate}
        title={t('management.users.confirmDeactivate.title')}
        description={t('management.users.confirmDeactivate.description', { name: `${toDeactivate?.firstName} ${toDeactivate?.lastName}` })}
        confirmLabel={t('common.actions.deactivate')}
        loading={deactivate.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
