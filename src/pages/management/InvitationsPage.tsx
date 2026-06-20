import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
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
import { useCreateInvitation, useResendInvitation, useDeleteInvitation } from '@/hooks/invitations/useInvitations'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RHFTextField, RHFSelect } from '@/components/shared/form'
import type { InvitationResponse } from '@/types/invitation.types'

const ROLES = [
  { value: 'owner-role-id', label: 'Owner' },
  { value: 'administrator-role-id', label: 'Administrator' },
  { value: 'doctor-role-id', label: 'Doctor' },
  { value: 'member-role-id', label: 'Member' },
  { value: 'sponsor-role-id', label: 'Sponsor' },
]

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

function InviteForm({ onSubmit }: { onSubmit: (data: FormData) => Promise<void> }) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', roleId: '' },
  })

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <RHFTextField control={control} name="email" label="Email" type="email" placeholder="colleague@example.com" />
      <RHFSelect control={control} name="roleId" label="Role" options={ROLES} />
      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        Send invitation
      </Button>
    </Box>
  )
}

export function InvitationsPage() {
  const createInvitation = useCreateInvitation()
  const resendInvitation = useResendInvitation()
  const deleteInvitation = useDeleteInvitation()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDelete, setToDelete] = useState<InvitationResponse | null>(null)
  const [sent, setSent] = useState<InvitationResponse[]>([])

  const handleCreate = async (data: FormData) => {
    const inv = await createInvitation.mutateAsync(data)
    setSent((prev) => [inv, ...prev])
    setSlideOpen(false)
  }

  const handleResend = async (id: string) => {
    await resendInvitation.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    await deleteInvitation.mutateAsync(toDelete.id)
    setSent((prev) => prev.filter((i) => i.id !== toDelete.id))
    setToDelete(null)
  }

  return (
    <Box>
      <PageHeader
        title="Invitations"
        description="Invite new members to join HouseCenter."
        action={
          <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setSlideOpen(true)}>
            Invite user
          </Button>
        }
      />

      {sent.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <MailOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No invitations sent yet in this session.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Invitations</Typography>
            <Chip label={sent.length} size="small" />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {sent.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{inv.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={inv.status}
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
                        <Tooltip title="Resend">
                          <IconButton size="small" onClick={() => handleResend(inv.id)} aria-label="Resend">
                            <SendOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setToDelete(inv)} aria-label="Delete">
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

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Invite user">
        <InviteForm onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete invitation"
        description={`The invitation to "${toDelete?.email}" will be permanently deleted.`}
        confirmLabel="Delete"
        loading={deleteInvitation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  )
}
