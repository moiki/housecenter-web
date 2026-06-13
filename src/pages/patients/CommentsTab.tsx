import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePatientFullSummary } from '@/hooks/patients/usePatients'
import { useCreatePatientComment, useDeletePatientComment } from '@/hooks/patients/useTreatments'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { Button } from '@/components/base/buttons/button'
import type { PatientCommentDto } from '@/types/patient.types'

const COMMENT_TYPES = [
  { id: 'Simple', label: 'Simple' },
  { id: 'Medical', label: 'Medical' },
  { id: 'Route', label: 'Route' },
]

const TYPE_BADGE: Record<string, string> = {
  Simple:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Medical: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Route:   'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}

const STATUS_BADGE: Record<string, string> = {
  Pending:  'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Accepted: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const schema = z.object({
  body: z.string().min(1, 'Comment is required'),
  type: z.enum(['Route', 'Medical', 'Simple']),
})
type FormData = z.infer<typeof schema>

export function CommentsTab({ patientId }: { patientId: string }) {
  const { data: summary } = usePatientFullSummary(patientId)
  const createComment = useCreatePatientComment(patientId)
  const deleteComment = useDeletePatientComment(patientId)

  const [toDelete, setToDelete] = useState<PatientCommentDto | null>(null)
  const [adding, setAdding] = useState(false)

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { body: '', type: 'Simple' },
  })

  const onSubmit = async (data: FormData) => {
    await createComment.mutateAsync(data)
    reset()
    setAdding(false)
  }

  const comments = summary?.comments ?? []

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <div className="flex justify-end">
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          <Icon name="message" className="w-4 h-4" />
          {adding ? 'Cancel' : 'Add comment'}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-4 border border-dashed border-blue-300 dark:border-blue-700 rounded-xl">
          <Controller control={control} name="type" render={({ field }) => (
            <Select label="Type" selectedKey={field.value} onSelectionChange={k => field.onChange(k)} items={COMMENT_TYPES}>
              {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
          )} />
          <Controller control={control} name="body" render={({ field }) => (
            <Input label="Comment" isInvalid={!!errors.body} hint={errors.body?.message}
              value={field.value} onChange={field.onChange} onBlur={field.onBlur}
              placeholder="Write your observation…" />
          )} />
          <Button type="submit" isDisabled={isSubmitting} className="w-full">Post comment</Button>
        </form>
      )}

      {/* Comments list */}
      {!comments.length ? (
        <div className="text-center py-10 text-[var(--hc-text-tertiary)]">
          <Icon name="message" className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No comments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[c.type] ?? ''}`}>
                    {c.type}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(c.createdDate).toLocaleDateString()}</span>
                </div>
                <button onClick={() => setToDelete(c)}
                  className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete comment"
        description="This comment will be permanently removed."
        confirmLabel="Delete"
        loading={deleteComment.isPending}
        onConfirm={async () => { if (toDelete) { await deleteComment.mutateAsync(toDelete.id); setToDelete(null) } }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
