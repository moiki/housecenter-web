import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateWorkRouteSchema, type UpdateWorkRouteFormData } from '@/schemas/workroute.schema'
import { useWorkRoute, useUpdateWorkRoute } from '@/hooks/workroutes/useWorkRoutes'
import { PageHeader } from '@/components/shared/PageHeader'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { TextArea } from '@/components/base/textarea/textarea'
import { Button } from '@/components/base/buttons/button'

function DestinationsEditor({ routeId }: { routeId: string }) {
  const { data: route } = useWorkRoute(routeId)
  const updateRoute = useUpdateWorkRoute(routeId)
  const [saved, setSaved] = useState(false)

  const { control, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<UpdateWorkRouteFormData>({
    resolver: zodResolver(updateWorkRouteSchema),
    values: route
      ? {
          routeName: route.routeName,
          description: route.description,
          featuredImage: route.featuredImage,
          destinations: route.destinations,
        }
      : undefined,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'destinations' })

  const onSubmit = async (data: UpdateWorkRouteFormData) => {
    await updateRoute.mutateAsync(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            />
          )}
        />

        <Controller
          control={control}
          name="featuredImage"
          render={({ field }) => (
            <Input
              label="Featured image URL (optional)"
              value={field.value ?? ''}
              onChange={(v) => field.onChange(v || null)}
              onBlur={field.onBlur}
              placeholder="https://..."
            />
          )}
        />
      </div>

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
          />
        )}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--hc-text-primary)]">Destination Points</h3>
          <button
            type="button"
            onClick={() => append({ name: '', description: '', picture: null, googleMapUrl: null })}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Icon name="map" className="w-4 h-4" />
            Add destination
          </button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-[var(--hc-text-tertiary)] py-4 text-center">
            No destinations yet. Add the first stop.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, i) => (
            <div
              key={field.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--hc-text-tertiary)] uppercase tracking-wide">
                  Stop #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      placeholder="Location name"
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
                    placeholder="Brief description of this stop"
                  />
                )}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" isDisabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">Saved!</span>
        )}
      </div>
    </form>
  )
}

export function WorkRouteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: route, isLoading } = useWorkRoute(id!)

  return (
    <div className="space-y-6">
      <PageHeader
        title={route?.routeName ?? 'Work Route'}
        description={route ? `Clinic: ${route.clinicName}` : ''}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          {id && <DestinationsEditor routeId={id} />}
        </div>
      )}
    </div>
  )
}
