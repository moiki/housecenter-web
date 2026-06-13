import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, type PatientFormData } from '@/schemas/patient.schema'
import { usePatients, useCreatePatient, useDeactivatePatient } from '@/hooks/patients/usePatients'
import { useClinics } from '@/hooks/clinics/useClinics'
import { useWorkRoutes } from '@/hooks/workroutes/useWorkRoutes'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { Button } from '@/components/base/buttons/button'
import { Select } from '@/components/base/select/select'
import { Table, TableCard } from '@/components/application/table/table'
import type { PatientResponse } from '@/types/patient.types'

const GENDER_ITEMS = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
]
const TYPE_ITEMS = [
  { id: 'Medical', label: 'Medical' },
  { id: 'EducationalReinforcement', label: 'Educational Reinforcement' },
]

function PatientForm({ onSubmit, submitLabel }: { onSubmit: (d: PatientFormData) => Promise<void>; submitLabel: string }) {
  const { data: clinics } = useClinics()
  const { data: routes } = useWorkRoutes()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '', lastName: '', profile: null,
      birthDate: '', gender: 'Male',
      country: null, state: null, city: null,
      address: '', description: null,
      primaryAttentionType: 'Medical',
      clinicId: null, workRouteId: null,
    },
  })

  const clinicItems = [
    { id: '__none__', label: 'No clinic' },
    ...(clinics ?? []).map(c => ({ id: c.id, label: c.name })),
  ]
  const routeItems = [
    { id: '__none__', label: 'No route' },
    ...(routes ?? []).map(r => ({ id: r.id, label: r.routeName })),
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Controller control={control} name="firstName" render={({ field }) => (
          <Input label="First name" isInvalid={!!errors.firstName} hint={errors.firstName?.message}
            value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Jane" />
        )} />
        <Controller control={control} name="lastName" render={({ field }) => (
          <Input label="Last name" isInvalid={!!errors.lastName} hint={errors.lastName?.message}
            value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Doe" />
        )} />
      </div>

      <Controller control={control} name="birthDate" render={({ field }) => (
        <Input label="Birth date" type="date" isInvalid={!!errors.birthDate} hint={errors.birthDate?.message}
          value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
      )} />

      <div className="grid grid-cols-2 gap-3">
        <Controller control={control} name="gender" render={({ field }) => (
          <Select label="Gender" selectedKey={field.value} onSelectionChange={k => field.onChange(k)} items={GENDER_ITEMS}>
            {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )} />
        <Controller control={control} name="primaryAttentionType" render={({ field }) => (
          <Select label="Attention type" selectedKey={field.value} onSelectionChange={k => field.onChange(k)} items={TYPE_ITEMS}>
            {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )} />
      </div>

      <Controller control={control} name="address" render={({ field }) => (
        <Input label="Address" isInvalid={!!errors.address} hint={errors.address?.message}
          value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Full address" />
      )} />

      <div className="grid grid-cols-3 gap-3">
        <Controller control={control} name="country" render={({ field }) => (
          <Input label="Country" value={field.value ?? ''} onChange={v => field.onChange(v || null)} onBlur={field.onBlur} placeholder="NI" />
        )} />
        <Controller control={control} name="state" render={({ field }) => (
          <Input label="State" value={field.value ?? ''} onChange={v => field.onChange(v || null)} onBlur={field.onBlur} />
        )} />
        <Controller control={control} name="city" render={({ field }) => (
          <Input label="City" value={field.value ?? ''} onChange={v => field.onChange(v || null)} onBlur={field.onBlur} />
        )} />
      </div>

      <Controller control={control} name="clinicId" render={({ field }) => (
        <Select label="Clinic (optional)" selectedKey={field.value ?? '__none__'}
          onSelectionChange={k => field.onChange(k === '__none__' ? null : k)} items={clinicItems}>
          {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />

      <Controller control={control} name="workRouteId" render={({ field }) => (
        <Select label="Work route (optional)" selectedKey={field.value ?? '__none__'}
          onSelectionChange={k => field.onChange(k === '__none__' ? null : k)} items={routeItems}>
          {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />

      <Button type="submit" isDisabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}

function calcAge(birthDate: string) {
  const diff = Date.now() - new Date(birthDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const TYPE_BADGE: Record<string, string> = {
  Medical: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  EducationalReinforcement: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}

export function PatientsPage() {
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
    <div>
      <PageHeader
        title="Patients"
        description="Full patient registry."
        action={
          <Button onPress={() => setSlideOpen(true)}>
            <Icon name="users" className="w-4 h-4" />
            New Patient
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <TableCard.Root>
          <div className="text-center py-16 text-gray-500">
            <Icon name="users" className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No patients registered yet.</p>
          </div>
        </TableCard.Root>
      ) : (
        <>
          <TableCard.Root className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <TableCard.Header
              title="Patients"
              badge={String(data.totalCount)}
            />
            <Table selectionMode="none" aria-label="Patients table">
              <Table.Header>
                <Table.Head label="Patient" isRowHeader />
                <Table.Head label="Age" />
                <Table.Head label="Gender" />
                <Table.Head label="Type" />
                <Table.Head label="" />
              </Table.Header>
              <Table.Body>
                {data.items.map((p) => (
                  <Table.Row key={p.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{p.firstName} {p.lastName}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{p.address}</div>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-gray-500">{calcAge(p.birthDate)} yrs</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-gray-500">{p.gender}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[p.primaryAttentionType] ?? ''}`}>
                        {p.primaryAttentionType === 'EducationalReinforcement' ? 'Educational' : p.primaryAttentionType}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        <Button color="secondary" size="sm" onPress={() => navigate(`/patients/${p.id}`)}>
                          <Icon name="eye" className="w-4 h-4" />
                          View
                        </Button>
                        <Button color="secondary-destructive" size="sm" onPress={() => setToDeactivate(p)}>
                          <Icon name="x" className="w-4 h-4" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </TableCard.Root>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400">
                {data.totalCount} patients — page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  color="secondary"
                  isDisabled={!data.hasPreviousPage}
                  onPress={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  color="secondary"
                  isDisabled={!data.hasNextPage}
                  onPress={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="New Patient">
        <PatientForm onSubmit={handleCreate} submitLabel="Create patient" />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate patient"
        description={`${toDeactivate?.firstName} ${toDeactivate?.lastName} will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivatePatient.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  )
}
