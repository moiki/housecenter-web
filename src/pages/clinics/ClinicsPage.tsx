import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  IconButton,
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
import { useClinics, useCreateClinic, useDeactivateClinic } from '@/hooks/clinics/useClinics'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ClinicForm } from '@/pages/clinics/ClinicForm'
import type { ClinicResponse } from '@/types/clinic.types'
import type { ClinicFormData } from '@/schemas/clinic.schema'

export function ClinicsPage() {
  const navigate = useNavigate()
  const { data: clinics, isLoading } = useClinics()
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
        title="Clinics"
        description="Manage the NGO's clinic locations."
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setSlideOpen(true)}>
            New Clinic
          </Button>
        }
      />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : !clinics?.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <BusinessOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No clinics yet. Create the first one.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Clinics</Typography>
            <Chip label={clinics.length} size="small" />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {clinics.map((clinic) => (
                  <TableRow key={clinic.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{clinic.name}</TableCell>
                    <TableCell>{clinic.address}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => navigate(`/clinics/${clinic.id}`)} aria-label="Edit">
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate">
                        <IconButton size="small" color="error" onClick={() => setToDeactivate(clinic)} aria-label="Deactivate">
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

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="New Clinic">
        <ClinicForm onSubmit={handleCreate} submitLabel="Create clinic" />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate clinic"
        description={`"${toDeactivate?.name}" will be deactivated. This action can be reversed by an administrator.`}
        confirmLabel="Deactivate"
        loading={deactivateClinic.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
