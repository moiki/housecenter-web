import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useConsultations, useCreateConsultation } from '@/hooks/consultations/useConsultations'
import { usePatients } from '@/hooks/patients/usePatients'
import { useUsers } from '@/hooks/users/useUsers'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { Button } from '@/components/base/buttons/button'
import type { ConsultationStatus } from '@/types/consultation.types'

// ── Schema ────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  assignedDoctorId: z.string().min(1, 'Doctor is required'),
  title: z.string().min(1, 'Title is required'),
  firstMessage: z.string().min(1, 'First message is required'),
  treatmentId: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<ConsultationStatus, string> = {
  Open:        'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  UnderReview: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Resolved:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const STATUS_FILTER_ITEMS = [
  { id: '__all__', label: 'All statuses' },
  { id: 'Open', label: 'Open' },
  { id: 'UnderReview', label: 'Under Review' },
  { id: 'Resolved', label: 'Resolved' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ── Create form ───────────────────────────────────────────────────────────────
function CreateConsultationForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: patients } = usePatients(1, 200)
  const { data: users } = useUsers()
  const createConsultation = useCreateConsultation()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { patientId: '', assignedDoctorId: '', title: '', firstMessage: '', treatmentId: '' },
  })

  const patientItems = patients?.items.map((p) => ({
    id: p.id,
    label: `${p.firstName} ${p.lastName}`,
  })) ?? []

  const doctorItems = (users ?? [])
    .filter((u) => u.roles.includes('Doctor'))
    .map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` }))

  const onSubmit = async (data: CreateForm) => {
    await createConsultation.mutateAsync({
      patientId: data.patientId,
      assignedDoctorId: data.assignedDoctorId,
      title: data.title,
      firstMessage: data.firstMessage,
      treatmentId: data.treatmentId || null,
      attachmentUrl: null,
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Controller control={control} name="patientId" render={({ field }) => (
        <Select label="Patient" items={patientItems}
          selectedKey={field.value} onSelectionChange={(k) => field.onChange(k as string)}
          isInvalid={!!errors.patientId} hint={errors.patientId?.message}>
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />

      <Controller control={control} name="assignedDoctorId" render={({ field }) => (
        <Select label="Assigned Doctor" items={doctorItems}
          selectedKey={field.value} onSelectionChange={(k) => field.onChange(k as string)}
          isInvalid={!!errors.assignedDoctorId} hint={errors.assignedDoctorId?.message}>
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      )} />

      <Controller control={control} name="title" render={({ field }) => (
        <Input label="Title" placeholder="Subject of the consultation"
          value={field.value} onChange={field.onChange}
          isInvalid={!!errors.title} hint={errors.title?.message} />
      )} />

      <Controller control={control} name="firstMessage" render={({ field }) => (
        <Input label="First Message" placeholder="Describe the case..."
          value={field.value} onChange={field.onChange}
          isInvalid={!!errors.firstMessage} hint={errors.firstMessage?.message} />
      )} />

      <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
        Open Consultation
      </Button>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ConsultationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | undefined>()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useConsultations({
    page,
    pageSize: 15,
    status: statusFilter,
  })

  const consultations = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        description="Medical inbox — open cases and threads"
        action={
          <Button onPress={() => setCreateOpen(true)}>
            <Icon name="plus" className="w-4 h-4 mr-1.5" />
            New Consultation
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Select
          label=""
          items={STATUS_FILTER_ITEMS}
          selectedKey={statusFilter ?? '__all__'}
          onSelectionChange={(k) => {
            const v = k as string
            setStatusFilter(v === '__all__' ? undefined : (v as ConsultationStatus))
            setPage(1)
          }}
          className="w-48"
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      </div>

      {/* Inbox list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-16 text-[var(--hc-text-tertiary)] text-sm">
          No consultations found.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-[var(--hc-surface-border)]">
          {consultations.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/consultations/${c.id}`)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--hc-surface-raised)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-medium text-[var(--hc-text-primary)] truncate">
                    {c.title}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[c.status as ConsultationStatus]}`}>
                    {c.status === 'UnderReview' ? 'Under Review' : c.status}
                  </span>
                </div>
                {c.resolvedAt && (
                  <p className="text-xs text-[var(--hc-text-tertiary)]">
                    Resolved {formatDate(c.resolvedAt)}
                  </p>
                )}
              </div>
              <Icon name="chevron" className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 rotate-90" />
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button color="secondary" isDisabled={page === 1} onPress={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-[var(--hc-text-secondary)]">
            Page {page} of {totalPages}
          </span>
          <Button color="secondary" isDisabled={page === totalPages} onPress={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Create slide-over */}
      <SlideOver title="New Consultation" open={createOpen} onClose={() => setCreateOpen(false)}>
        <CreateConsultationForm onSuccess={() => setCreateOpen(false)} />
      </SlideOver>
    </div>
  )
}
