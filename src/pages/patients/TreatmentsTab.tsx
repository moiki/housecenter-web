import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useTreatments, useCreateTreatment, useUpdateTreatment,
  usePatchTreatmentStatus, useDeactivateTreatment,
  useCreateTreatmentDetail,
  useCreateTreatmentComment,
} from '@/hooks/patients/useTreatments'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { Button } from '@/components/base/buttons/button'
import type { TreatmentResponse } from '@/types/patient.types'

// ── Schemas ──────────────────────────────────────────────────────────────────
const treatmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  type: z.enum(['Medical', 'EducationalReinforcement']).nullable(),
  profile: z.string().url().nullable().or(z.literal('')).transform(v => v || null),
})
type TreatmentForm = z.infer<typeof treatmentSchema>

const detailSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  treatmentDate: z.string().min(1),
  profile: z.string().url().nullable().or(z.literal('')).transform(v => v || null),
})
type DetailForm = z.infer<typeof detailSchema>

const commentSchema = z.object({
  body: z.string().min(1, 'Comment is required'),
  type: z.enum(['Route', 'Medical', 'Simple']),
})
type CommentForm = z.infer<typeof commentSchema>

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Active:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Completed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Paused:    'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
}

const STATUS_ITEMS = [
  { id: 'Active', label: 'Active' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Paused', label: 'Paused' },
]

const TYPE_ITEMS = [
  { id: '__inherit__', label: 'Inherit from patient' },
  { id: 'Medical', label: 'Medical' },
  { id: 'EducationalReinforcement', label: 'Educational Reinforcement' },
]

const COMMENT_TYPE_ITEMS = [
  { id: 'Simple', label: 'Simple' },
  { id: 'Medical', label: 'Medical' },
  { id: 'Route', label: 'Route' },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function TreatmentFormPanel({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: TreatmentResponse
  onSubmit: (d: TreatmentForm) => Promise<void>
  submitLabel: string
}) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<TreatmentForm>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: defaultValues
      ? { name: defaultValues.name, description: defaultValues.description, startDate: defaultValues.startDate.slice(0, 10), endDate: defaultValues.endDate.slice(0, 10), type: defaultValues.type, profile: defaultValues.profile }
      : { name: '', description: '', startDate: '', endDate: '', type: null, profile: null },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller control={control} name="name" render={({ field }) => (
        <Input label="Name" isInvalid={!!errors.name} hint={errors.name?.message}
          value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Treatment name" />
      )} />
      <Controller control={control} name="description" render={({ field }) => (
        <Input label="Description" isInvalid={!!errors.description} hint={errors.description?.message}
          value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Brief description" />
      )} />
      <div className="grid grid-cols-2 gap-3">
        <Controller control={control} name="startDate" render={({ field }) => (
          <Input label="Start date" type="date" isInvalid={!!errors.startDate} hint={errors.startDate?.message}
            value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
        )} />
        <Controller control={control} name="endDate" render={({ field }) => (
          <Input label="End date" type="date" isInvalid={!!errors.endDate} hint={errors.endDate?.message}
            value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
        )} />
      </div>
      <Controller control={control} name="type" render={({ field }) => (
        <Select label="Type" selectedKey={field.value ?? '__inherit__'}
          onSelectionChange={k => field.onChange(k === '__inherit__' ? null : k)} items={TYPE_ITEMS}>
          {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />
      <Button type="submit" isDisabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}

function ExpandedTreatment({ treatment, patientId }: { treatment: TreatmentResponse; patientId: string }) {
  const patchStatus = usePatchTreatmentStatus(patientId, treatment.id)
  const createDetail = useCreateTreatmentDetail(treatment.id, patientId)
  // const deleteDetail = useDeleteTreatmentDetail(treatment.id, patientId)
  const createComment = useCreateTreatmentComment(treatment.id, patientId)
  // const deleteComment = useDeleteTreatmentComment(treatment.id, patientId)

  const [addingDetail, setAddingDetail] = useState(false)
  const [addingComment, setAddingComment] = useState(false)

  const detailForm = useForm<DetailForm>({ resolver: zodResolver(detailSchema), defaultValues: { name: '', description: '', treatmentDate: '', profile: null } })
  const commentForm = useForm<CommentForm>({ resolver: zodResolver(commentSchema), defaultValues: { body: '', type: 'Simple' } })

  const onAddDetail = async (d: DetailForm) => {
    await createDetail.mutateAsync(d)
    detailForm.reset()
    setAddingDetail(false)
  }

  const onAddComment = async (d: CommentForm) => {
    await createComment.mutateAsync(d)
    commentForm.reset()
    setAddingComment(false)
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-700 p-4 space-y-5">
      {/* Status control */}
      <div className="flex items-center gap-3">
        <p className="text-xs font-medium text-[var(--hc-text-secondary)] uppercase tracking-wide">Status:</p>
        <div className="flex gap-2">
          {STATUS_ITEMS.map(s => (
            <button key={s.id}
              onClick={() => patchStatus.mutate(s.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                treatment.status === s.id
                  ? `${STATUS_COLORS[s.id]} border-current`
                  : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-400'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Details section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Details</p>
          <button onClick={() => setAddingDetail(v => !v)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            {addingDetail ? 'Cancel' : '+ Add detail'}
          </button>
        </div>

        {addingDetail && (
          <form onSubmit={detailForm.handleSubmit(onAddDetail)} className="grid grid-cols-2 gap-2 mb-3 p-3 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg">
            <Controller control={detailForm.control} name="name" render={({ field }) => (
              <Input label="Name" value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Detail name" />
            )} />
            <Controller control={detailForm.control} name="treatmentDate" render={({ field }) => (
              <Input label="Date" type="date" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
            )} />
            <div className="col-span-2">
              <Controller control={detailForm.control} name="description" render={({ field }) => (
                <Input label="Description" value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Brief description" />
              )} />
            </div>
            <div className="col-span-2">
              <Button type="submit" isDisabled={detailForm.formState.isSubmitting} className="w-full">Save detail</Button>
            </div>
          </form>
        )}

        {/* Detail items — the API returns them embedded in the treatment list from the summary; real paginated data comes from the detail endpoints. For now we show a placeholder until the full detail list endpoint is called */}
        <p className="text-xs text-[var(--hc-text-tertiary)] italic">Details load from treatment detail endpoints (T10).</p>
      </div>

      {/* Comments section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Comments</p>
          <button onClick={() => setAddingComment(v => !v)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            {addingComment ? 'Cancel' : '+ Add comment'}
          </button>
        </div>

        {addingComment && (
          <form onSubmit={commentForm.handleSubmit(onAddComment)} className="space-y-2 mb-3 p-3 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg">
            <Controller control={commentForm.control} name="type" render={({ field }) => (
              <Select label="Type" selectedKey={field.value} onSelectionChange={k => field.onChange(k)} items={COMMENT_TYPE_ITEMS}>
                {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
              </Select>
            )} />
            <Controller control={commentForm.control} name="body" render={({ field }) => (
              <Input label="Comment" isInvalid={!!commentForm.formState.errors.body}
                hint={commentForm.formState.errors.body?.message}
                value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Write your comment…" />
            )} />
            <Button type="submit" isDisabled={commentForm.formState.isSubmitting} className="w-full">Post comment</Button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────
export function TreatmentsTab({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useTreatments(patientId, page)
  const createTreatment = useCreateTreatment(patientId)
  // const updateTreatment = useUpdateTreatment(patientId, '')
  const deactivateTreatment = useDeactivateTreatment(patientId)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [slideMode, setSlideMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<TreatmentResponse | null>(null)
  const [toDelete, setToDelete] = useState<TreatmentResponse | null>(null)

  const handleCreate = async (d: TreatmentForm) => {
    await createTreatment.mutateAsync(d)
    setSlideMode(null)
  }

  const handleUpdate = async (d: TreatmentForm) => {
    if (!editing) return
    await useUpdateTreatment(patientId, editing.id).mutateAsync(d)
    setSlideMode(null)
    setEditing(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setSlideMode('create') }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          <Icon name="chart" className="w-4 h-4" />
          New Treatment
        </button>
      </div>

      {!data?.items.length ? (
        <div className="text-center py-10 text-[var(--hc-text-tertiary)]">
          <Icon name="chart" className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No treatments yet. Create the first one.</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-[var(--hc-surface-border)]">
          {data.items.map(t => (
            <div key={t.id}>
              <div
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                onClick={() => setExpanded(prev => prev === t.id ? null : t.id)}
              >
                <Icon name={expanded === t.id ? 'x' : 'chart'} className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--hc-text-primary)] truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 truncate">{t.description}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                  {t.status}
                </span>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditing(t); setSlideMode('edit') }}
                    className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
                    <Icon name="settings" className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setToDelete(t)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {expanded === t.id && <ExpandedTreatment treatment={t} patientId={patientId} />}
            </div>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <button disabled={!data.hasPreviousPage} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Previous
          </button>
          <button disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Next
          </button>
        </div>
      )}

      <SlideOver open={slideMode !== null} onClose={() => { setSlideMode(null); setEditing(null) }}
        title={slideMode === 'edit' ? 'Edit Treatment' : 'New Treatment'}>
        {slideMode === 'edit' && editing
          ? <TreatmentFormPanel defaultValues={editing} onSubmit={handleUpdate} submitLabel="Save changes" />
          : <TreatmentFormPanel onSubmit={handleCreate} submitLabel="Create treatment" />
        }
      </SlideOver>

      <ConfirmDialog
        open={!!toDelete}
        title="Deactivate treatment"
        description={`"${toDelete?.name}" will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivateTreatment.isPending}
        onConfirm={async () => { if (toDelete) { await deactivateTreatment.mutateAsync(toDelete.id); setToDelete(null) } }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
