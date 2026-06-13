import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workRouteSchema, type WorkRouteFormData } from '@/schemas/workroute.schema'
import { useWorkRoutes, useCreateWorkRoute, useDeactivateWorkRoute } from '@/hooks/workroutes/useWorkRoutes'
import { useClinics } from '@/hooks/clinics/useClinics'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { TextArea } from '@/components/base/textarea/textarea'
import { Button } from '@/components/base/buttons/button'
import { Select } from '@/components/base/select/select'
import { Table, TableCard } from '@/components/application/table/table'
import type { WorkRouteResponse } from '@/types/workroute.types'

function WorkRouteForm({ onSubmit }: { onSubmit: (data: WorkRouteFormData) => Promise<void> }) {
  const { data: clinics } = useClinics()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<WorkRouteFormData>({
    resolver: zodResolver(workRouteSchema),
    defaultValues: {
      routeName: '',
      description: '',
      featuredImage: null,
      clinicId: '',
      destinations: [{ name: '', description: '', picture: null, googleMapUrl: null }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'destinations' })

  const clinicItems = (clinics ?? []).map(c => ({ id: c.id, label: c.name }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Controller
        control={control}
        name="routeName"
        render={({ field }) => (
          <Input
            label="Route name"
            isInvalid={!!errors.routeName}
            hint={errors.routeName?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="e.g. North District"
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextArea
            label="Description"
            isInvalid={!!errors.description}
            hint={errors.description?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Brief description of this route"
          />
        )}
      />

      <Controller
        control={control}
        name="clinicId"
        render={({ field }) => (
          <Select
            label="Clinic"
            placeholder="Select a clinic"
            isInvalid={!!errors.clinicId}
            hint={errors.clinicId?.message}
            selectedKey={field.value || null}
            onSelectionChange={(key) => field.onChange(key)}
            items={clinicItems}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )}
      />

      <Controller
        control={control}
        name="featuredImage"
        render={({ field }) => (
          <Input
            label="Featured image URL (optional)"
            isInvalid={!!errors.featuredImage}
            hint={errors.featuredImage?.message}
            value={field.value ?? ''}
            onChange={(v) => field.onChange(v || null)}
            onBlur={field.onBlur}
            placeholder="https://..."
          />
        )}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Destinations</p>
          <button
            type="button"
            onClick={() => append({ name: '', description: '', picture: null, googleMapUrl: null })}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add destination
          </button>
        </div>

        {errors.destinations?.root && (
          <p className="text-xs text-red-500">{errors.destinations.root.message}</p>
        )}

        {fields.map((field, i) => (
          <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Destination {i + 1}
              </p>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>

            <Controller
              control={control}
              name={`destinations.${i}.name`}
              render={({ field: f }) => (
                <Input
                  label="Name"
                  isInvalid={!!errors.destinations?.[i]?.name}
                  hint={errors.destinations?.[i]?.name?.message}
                  value={f.value}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                  placeholder="e.g. Community Center"
                />
              )}
            />

            <Controller
              control={control}
              name={`destinations.${i}.description`}
              render={({ field: f }) => (
                <Input
                  label="Description"
                  isInvalid={!!errors.destinations?.[i]?.description}
                  hint={errors.destinations?.[i]?.description?.message}
                  value={f.value}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                  placeholder="Brief description"
                />
              )}
            />

            <Controller
              control={control}
              name={`destinations.${i}.googleMapUrl`}
              render={({ field: f }) => (
                <Input
                  label="Google Maps URL (optional)"
                  value={f.value ?? ''}
                  onChange={(v) => f.onChange(v || null)}
                  onBlur={f.onBlur}
                  placeholder="https://maps.google.com/..."
                />
              )}
            />
          </div>
        ))}
      </div>

      <Button type="submit" isDisabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating…' : 'Create work route'}
      </Button>
    </form>
  )
}

export function WorkRoutesPage() {
  const navigate = useNavigate()
  const { data: routes, isLoading } = useWorkRoutes()
  const createRoute = useCreateWorkRoute()
  const deactivateRoute = useDeactivateWorkRoute()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<WorkRouteResponse | null>(null)

  const handleCreate = async (data: WorkRouteFormData) => {
    await createRoute.mutateAsync(data)
    setSlideOpen(false)
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivateRoute.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <div>
      <PageHeader
        title="Work Routes"
        description="Routes assigned to home-visit teams."
        action={
          <Button onPress={() => setSlideOpen(true)}>
            <Icon name="map" className="w-4 h-4" />
            New Route
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : !routes?.length ? (
        <TableCard.Root>
          <div className="text-center py-16 text-gray-500">
            <Icon name="map" className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No work routes yet. Create the first one.</p>
          </div>
        </TableCard.Root>
      ) : (
        <TableCard.Root>
          <TableCard.Header
            title="Work Routes"
            badge={String(routes.length)}
          />
          <Table selectionMode="none" aria-label="Work routes table">
            <Table.Header>
              <Table.Head label="Route" isRowHeader />
              <Table.Head label="Clinic" />
              <Table.Head label="Destinations" />
              <Table.Head label="" />
            </Table.Header>
            <Table.Body>
              {routes.map((route) => (
                <Table.Row key={route.id}>
                  <Table.Cell>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{route.routeName}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[240px]">{route.description}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-gray-500">{route.clinicName}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-gray-500">
                      {route.destinations.length} stop{route.destinations.length !== 1 ? 's' : ''}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      <Button color="secondary" size="sm" onPress={() => navigate(`/work-routes/${route.id}`)}>
                        <Icon name="settings" className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button color="secondary-destructive" size="sm" onPress={() => setToDeactivate(route)}>
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

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="New Work Route">
        <WorkRouteForm onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate work route"
        description={`"${toDeactivate?.routeName}" will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivateRoute.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  )
}
