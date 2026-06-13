import { useParams, useNavigate } from 'react-router-dom'
import { useClinic, useUpdateClinic } from '@/hooks/clinics/useClinics'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClinicForm } from '@/pages/clinics/ClinicForm'
import { Icon } from '@/components/shared/Icon'
import type { ClinicFormData } from '@/schemas/clinic.schema'

export function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: clinic, isLoading, isError } = useClinic(id!)
  const updateClinic = useUpdateClinic(id!)

  const handleUpdate = async (data: ClinicFormData) => {
    await updateClinic.mutateAsync(data)
  }

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    )
  }

  if (isError || !clinic) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--hc-text-secondary)] text-sm">Clinic not found.</p>
        <button onClick={() => navigate('/clinics')} className="mt-3 text-sm text-blue-600 hover:underline">
          Back to clinics
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title={clinic.name}
        description="Edit clinic details"
        action={
          <button
            onClick={() => navigate('/clinics')}
            className="flex items-center gap-1.5 text-sm text-[var(--hc-text-secondary)] hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Icon name="chevron" className="w-4 h-4 rotate-180" />
            Back
          </button>
        }
      />

      {updateClinic.isSuccess && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          Clinic updated successfully.
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <ClinicForm
          defaultValues={clinic}
          onSubmit={handleUpdate}
          submitLabel="Save changes"
        />
      </div>
    </div>
  )
}
