import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSessions, useCreateSession, usePatchSessionStatus, useDeleteSession } from '@/hooks/patients/useSessions'
import { useCollaborators } from '@/hooks/collaborators/useCollaborators'
import { useClinics } from '@/hooks/clinics/useClinics'
import { useWorkRoutes } from '@/hooks/workroutes/useWorkRoutes'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { Button } from '@/components/base/buttons/button'
import type { AttentionSessionResponse, SessionStatus } from '@/types/session.types'

// ── Schemas ──────────────────────────────────────────────────────────────────
const createSchema = z
  .object({
    collaboratorId: z.string().min(1, 'Collaborator is required'),
    attentionType: z.enum(['Medical', 'EducationalReinforcement']),
    sessionDate: z.string().min(1, 'Date is required'),
    durationMinutes: z.string().optional(),
    notes: z.string().optional(),
    locationMode: z.enum(['clinic', 'workRoute']),
    clinicId: z.string().optional(),
    workRouteId: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.locationMode === 'clinic' && !d.clinicId) {
      ctx.addIssue({ code: 'custom', path: ['clinicId'], message: 'Clinic is required' })
    }
    if (d.locationMode === 'workRoute' && !d.workRouteId) {
      ctx.addIssue({ code: 'custom', path: ['workRouteId'], message: 'Work route is required' })
    }
  })
type CreateForm = z.infer<typeof createSchema>

const statusSchema = z.object({
  status: z.enum(['Scheduled', 'Completed', 'Missed']),
  durationMinutes: z.string().optional(),
  notes: z.string().optional(),
})
type StatusForm = z.infer<typeof statusSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<SessionStatus, string> = {
  Scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Missed:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STATUS_ITEMS = [
  { id: 'Scheduled', label: 'Scheduled' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Missed', label: 'Missed' },
]

const TYPE_ITEMS = [
  { id: 'Medical', label: 'Medical' },
  { id: 'EducationalReinforcement', label: 'Educational Reinforcement' },
]

const LOCATION_MODE_ITEMS = [
  { id: 'clinic', label: 'Clinic' },
  { id: 'workRoute', label: 'Work Route' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ── Create form (inside SlideOver) ────────────────────────────────────────────
function CreateSessionForm({ patientId, onSuccess }: { patientId: string; onSuccess: () => void }) {
  const { data: collaboratorsData } = useCollaborators()
  const { data: clinics } = useClinics()
  const { data: workRoutesData } = useWorkRoutes()
  const createSession = useCreateSession(patientId)

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({
      resolver: zodResolver(createSchema),
      defaultValues: {
        collaboratorId: '',
        attentionType: 'Medical',
        sessionDate: '',
        durationMinutes: '',
        notes: '',
        locationMode: 'clinic',
        clinicId: '',
        workRouteId: '',
      },
    })

  const locationMode = watch('locationMode')

  const collaboratorItems =
    collaboratorsData?.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` })) ?? []
  const clinicItems = clinics?.map((c) => ({ id: c.id, label: c.name })) ?? []
  const workRouteItems = workRoutesData?.map((w) => ({ id: w.id, label: w.routeName })) ?? []

  const onSubmit = async (data: CreateForm) => {
    await createSession.mutateAsync({
      collaboratorId: data.collaboratorId,
      clinicId: data.locationMode === 'clinic' ? (data.clinicId || null) : null,
      workRouteId: data.locationMode === 'workRoute' ? (data.workRouteId || null) : null,
      attentionType: data.attentionType,
      sessionDate: new Date(data.sessionDate).toISOString(),
      durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : null,
      notes: data.notes || null,
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Controller control={control} name="collaboratorId" render={({ field }) => (
        <Select label="Collaborator" items={collaboratorItems}
          selectedKey={field.value} onSelectionChange={(k) => field.onChange(k as string)}
          isInvalid={!!errors.collaboratorId} hint={errors.collaboratorId?.message}>
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />

      <Controller control={control} name="attentionType" render={({ field }) => (
        <Select label="Attention Type" items={TYPE_ITEMS}
          selectedKey={field.value} onSelectionChange={(k) => field.onChange(k as string)}>
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />

      <Controller control={control} name="sessionDate" render={({ field }) => (
        <Input label="Session Date" type="datetime-local"
          value={field.value} onChange={field.onChange}
          isInvalid={!!errors.sessionDate} hint={errors.sessionDate?.message} />
      )} />

      <Controller control={control} name="locationMode" render={({ field }) => (
        <Select label="Location Type" items={LOCATION_MODE_ITEMS}
          selectedKey={field.value} onSelectionChange={(k) => field.onChange(k as 'clinic' | 'workRoute')}>
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />

      {locationMode === 'clinic' && (
        <Controller control={control} name="clinicId" render={({ field }) => (
          <Select label="Clinic" items={clinicItems}
            selectedKey={field.value ?? ''} onSelectionChange={(k) => field.onChange(k as string)}
            isInvalid={!!errors.clinicId} hint={errors.clinicId?.message}>
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )} />
      )}

      {locationMode === 'workRoute' && (
        <Controller control={control} name="workRouteId" render={({ field }) => (
          <Select label="Work Route" items={workRouteItems}
            selectedKey={field.value ?? ''} onSelectionChange={(k) => field.onChange(k as string)}
            isInvalid={!!errors.workRouteId} hint={errors.workRouteId?.message}>
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )} />
      )}

      <Controller control={control} name="durationMinutes" render={({ field }) => (
        <Input label="Duration (minutes)" type="number" placeholder="Optional"
          value={field.value ?? ''} onChange={field.onChange} />
      )} />

      <Controller control={control} name="notes" render={({ field }) => (
        <Input label="Notes" placeholder="Optional"
          value={field.value ?? ''} onChange={field.onChange} />
      )} />

      <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
        Create Session
      </Button>
    </form>
  )
}

// ── Status patch form (inline below row) ─────────────────────────────────────
function StatusPatchForm({
  session,
  patientId,
  onClose,
}: {
  session: AttentionSessionResponse
  patientId: string
  onClose: () => void
}) {
  const patchStatus = usePatchSessionStatus(patientId)

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: session.status,
      durationMinutes: session.durationMinutes?.toString() ?? '',
      notes: session.notes ?? '',
    },
  })

  const onSubmit = async (data: StatusForm) => {
    await patchStatus.mutateAsync({
      sessionId: session.id,
      data: {
        status: data.status,
        durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : null,
        notes: data.notes || null,
      },
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Controller control={control} name="status" render={({ field }) => (
          <Select label="Status" items={STATUS_ITEMS}
            selectedKey={field.value} onSelectionChange={(k) => field.onChange(k as string)}>
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )} />
        <Controller control={control} name="durationMinutes" render={({ field }) => (
          <Input label="Duration (min)" type="number"
            value={field.value ?? ''} onChange={field.onChange} />
        )} />
        <Controller control={control} name="notes" render={({ field }) => (
          <Input label="Notes" value={field.value ?? ''} onChange={field.onChange} />
        )} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" color="secondary" onPress={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isSubmitting}>Save</Button>
      </div>
    </form>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────
interface Props {
  patientId: string
}

export function SessionsTab({ patientId }: Props) {
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AttentionSessionResponse | null>(null)

  const { data, isLoading } = useSessions(patientId, { page, pageSize: 10 })
  const deleteSession = useDeleteSession(patientId)

  const sessions = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--hc-text-primary)]">
          Attention Sessions
        </h3>
        <Button size="sm" onPress={() => setCreateOpen(true)}>
          <Icon name="plus" className="w-4 h-4 mr-1.5" />
          New Session
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-[var(--hc-text-tertiary)] text-sm">
          No sessions recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <Icon
                    name="chevron"
                    className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                      expandedId === session.id ? 'rotate-180' : 'rotate-90'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--hc-text-primary)]">
                        {formatDate(session.sessionDate)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[session.status]}`}>
                        {session.status}
                      </span>
                      <span className="text-xs text-[var(--hc-text-tertiary)]">
                        {session.attentionType === 'EducationalReinforcement' ? 'Educational' : session.attentionType}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--hc-text-secondary)] mt-0.5 truncate">
                      {session.collaboratorName}
                      {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setDeleteTarget(session)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  aria-label="Delete session"
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>

              {expandedId === session.id && (
                <div className="px-4 pb-4">
                  <StatusPatchForm session={session} patientId={patientId} onClose={() => setExpandedId(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" color="secondary" isDisabled={page === 1} onPress={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-[var(--hc-text-secondary)]">
            Page {page} of {totalPages}
          </span>
          <Button size="sm" color="secondary" isDisabled={page === totalPages} onPress={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Create slide-over */}
      <SlideOver title="New Attention Session" open={createOpen} onClose={() => setCreateOpen(false)}>
        <CreateSessionForm patientId={patientId} onSuccess={() => setCreateOpen(false)} />
      </SlideOver>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete session?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTarget) await deleteSession.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
