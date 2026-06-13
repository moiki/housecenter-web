import { useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { collaboratorSchema, type CollaboratorFormData } from '@/schemas/collaborator.schema'
import {
  useCollaborators,
  useCreateCollaborator,
  useUpdateCollaborator,
  useDeactivateCollaborator,
} from '@/hooks/collaborators/useCollaborators'
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
import type { CollaboratorResponse } from '@/types/collaborator.types'

function CollaboratorForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: CollaboratorResponse
  onSubmit: (data: CollaboratorFormData) => Promise<void>
  submitLabel: string
}) {
  const { data: clinics } = useClinics()
  const { data: routes } = useWorkRoutes()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CollaboratorFormData>({
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
          positions: defaultValues.positions.map(p => p.name),
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
    // @ts-expect-error positions is string[], useFieldArray expects object[]
    name: 'positions',
  })

  const clinicItems = (clinics ?? []).map(c => ({ id: c.id, label: c.name }))
  const routeItems = [
    { id: '__none__', label: 'No route assigned' },
    ...(routes ?? []).map(r => ({ id: r.id, label: r.routeName })),
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="firstName"
          render={({ field }) => (
            <Input label="First name" isInvalid={!!errors.firstName} hint={errors.firstName?.message}
              value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Jane" />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field }) => (
            <Input label="Last name" isInvalid={!!errors.lastName} hint={errors.lastName?.message}
              value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Smith" />
          )}
        />
      </div>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input label="Email" type="email" isInvalid={!!errors.email} hint={errors.email?.message}
            value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="jane@example.com" />
        )}
      />

      <Controller
        control={control}
        name="phoneNumber"
        render={({ field }) => (
          <Input label="Phone" isInvalid={!!errors.phoneNumber} hint={errors.phoneNumber?.message}
            value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="+1 555 0000" />
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <Input label="Address" isInvalid={!!errors.address} hint={errors.address?.message}
            value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Full address" />
        )}
      />

      <div className="grid grid-cols-3 gap-3">
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <Input label="Country" value={field.value ?? ''} onChange={v => field.onChange(v || null)}
              onBlur={field.onBlur} placeholder="US" />
          )}
        />
        <Controller
          control={control}
          name="state"
          render={({ field }) => (
            <Input label="State" value={field.value ?? ''} onChange={v => field.onChange(v || null)}
              onBlur={field.onBlur} placeholder="CA" />
          )}
        />
        <Controller
          control={control}
          name="city"
          render={({ field }) => (
            <Input label="City" value={field.value ?? ''} onChange={v => field.onChange(v || null)}
              onBlur={field.onBlur} placeholder="LA" />
          )}
        />
      </div>

      <Controller
        control={control}
        name="clinicId"
        render={({ field }) => (
          <Select label="Clinic" placeholder="Select clinic" isInvalid={!!errors.clinicId}
            hint={errors.clinicId?.message} selectedKey={field.value || null}
            onSelectionChange={key => field.onChange(key)} items={clinicItems}>
            {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )}
      />

      <Controller
        control={control}
        name="workRouteId"
        render={({ field }) => (
          <Select label="Work route (optional)" placeholder="No route" selectedKey={field.value ?? '__none__'}
            onSelectionChange={key => field.onChange(key === '__none__' ? null : key)}
            items={routeItems}>
            {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )}
      />

      {/* Positions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Positions</p>
          <button type="button" onClick={() => append('')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            + Add position
          </button>
        </div>
        {errors.positions?.root && (
          <p className="text-xs text-red-500">{errors.positions.root.message}</p>
        )}
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <Controller
              control={control}
              name={`positions.${i}` as `positions.${number}`}
              render={({ field: f }) => (
                <Input
                  placeholder={`Position ${i + 1}`}
                  isInvalid={!!errors.positions?.[i]}
                  value={f.value as string}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                />
              )}
            />
            {fields.length > 1 && (
              <button type="button" onClick={() => remove(i)}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                <Icon name="x" className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Button type="submit" isDisabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}

export function CollaboratorsPage() {
  const { data: collaborators, isLoading } = useCollaborators()
  const createCollaborator = useCreateCollaborator()
  const deactivateCollaborator = useDeactivateCollaborator()

  const [slideMode, setSlideMode] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<CollaboratorResponse | null>(null)
  const [toDeactivate, setToDeactivate] = useState<CollaboratorResponse | null>(null)

  const updateCollaborator = useUpdateCollaborator(selected?.id ?? '')

  const openCreate = () => { setSelected(null); setSlideMode('create') }
  const openEdit = (c: CollaboratorResponse) => { setSelected(c); setSlideMode('edit') }
  const closeSlide = () => { setSlideMode(null); setSelected(null) }

  const handleCreate = async (data: CollaboratorFormData) => {
    await createCollaborator.mutateAsync(data)
    closeSlide()
  }

  const handleUpdate = async (data: CollaboratorFormData) => {
    await updateCollaborator.mutateAsync(data)
    closeSlide()
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivateCollaborator.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <div>
      <PageHeader
        title="Collaborators"
        description="Staff directory — nurses, doctors, and field workers."
        action={
          <Button onPress={openCreate}>
            <Icon name="briefcase" className="w-4 h-4" />
            New Collaborator
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : !collaborators?.length ? (
        <TableCard.Root>
          <div className="flex flex-col items-center gap-2 py-16 text-gray-500">
            <Icon name="briefcase" className="w-10 h-10 opacity-40" />
            <p className="text-sm">No collaborators yet. Add the first one.</p>
          </div>
        </TableCard.Root>
      ) : (
        <TableCard.Root>
          <TableCard.Header
            title="Collaborators"
            badge={String(collaborators.length)}
          />
          <Table selectionMode="none" aria-label="Collaborators">
            <Table.Header>
              <Table.Head label="Name" isRowHeader />
              <Table.Head label="Clinic" />
              <Table.Head label="Positions" />
              <Table.Head label="Contact" />
              <Table.Head label="" />
            </Table.Header>
            <Table.Body>
              {collaborators.map((c) => (
                <Table.Row key={c.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0 text-xs font-semibold text-violet-700 dark:text-violet-300">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-xs text-gray-400">{c.email}</div>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-gray-500">{c.clinicName}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {c.positions.map(p => (
                        <span key={p.id}
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-gray-500">{c.phoneNumber}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      <Button color="secondary" size="sm" onPress={() => openEdit(c)} aria-label="Edit">
                        <Icon name="settings" className="w-4 h-4" />
                      </Button>
                      <Button color="secondary-destructive" size="sm" onPress={() => setToDeactivate(c)} aria-label="Deactivate">
                        <Icon name="x" className="w-4 h-4" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </TableCard.Root>
      )}

      <SlideOver
        open={slideMode !== null}
        onClose={closeSlide}
        title={slideMode === 'edit' ? `Edit — ${selected?.firstName} ${selected?.lastName}` : 'New Collaborator'}
      >
        {slideMode === 'edit' && selected ? (
          <CollaboratorForm defaultValues={selected} onSubmit={handleUpdate} submitLabel="Save changes" />
        ) : (
          <CollaboratorForm onSubmit={handleCreate} submitLabel="Create collaborator" />
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate collaborator"
        description={`${toDeactivate?.firstName} ${toDeactivate?.lastName} will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivateCollaborator.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  )
}
