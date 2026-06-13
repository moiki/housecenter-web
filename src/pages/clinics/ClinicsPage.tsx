import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClinics, useCreateClinic, useDeactivateClinic } from '@/hooks/clinics/useClinics'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ClinicForm } from '@/pages/clinics/ClinicForm'
import { Button } from '@/components/base/buttons/button'
import { Table, TableCard } from '@/components/application/table/table'
import { Icon } from '@/components/shared/Icon'
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
    <div className="space-y-6">
      <PageHeader
        title="Clinics"
        description="Manage the NGO's clinic locations."
        action={
          <Button onPress={() => setSlideOpen(true)}>
            <Icon name="building" className="w-4 h-4 mr-1.5" />
            New Clinic
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : !clinics?.length ? (
        <TableCard.Root>
          <div className="flex flex-col items-center gap-2 py-16 text-tertiary">
            <Icon name="building" className="w-10 h-10 opacity-40" />
            <p className="text-sm">No clinics yet. Create the first one.</p>
          </div>
        </TableCard.Root>
      ) : (
        <TableCard.Root>
          <TableCard.Header
            title="Clinics"
            badge={String(clinics.length)}
          />
          <Table selectionMode="none" aria-label="Clinics">
            <Table.Header>
              <Table.Head label="Name" isRowHeader />
              <Table.Head label="Address" />
              <Table.Head />
            </Table.Header>
            <Table.Body>
              {clinics.map((clinic) => (
                <Table.Row key={clinic.id}>
                  <Table.Cell>
                    <span className="font-medium text-primary">{clinic.name}</span>
                  </Table.Cell>
                  <Table.Cell>{clinic.address}</Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        color="secondary"
                        size="sm"
                        onPress={() => navigate(`/clinics/${clinic.id}`)}
                        aria-label="Edit"
                      >
                        <Icon name="settings" className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        color="secondary-destructive"
                        size="sm"
                        onPress={() => setToDeactivate(clinic)}
                        aria-label="Deactivate"
                      >
                        <Icon name="x" className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </TableCard.Root>
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
    </div>
  )
}
