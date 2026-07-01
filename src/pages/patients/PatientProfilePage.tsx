import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePatientFullSummary } from '@/hooks/patients/usePatients'
import { PageHeader } from '@/components/shared/PageHeader'
import { Icon } from '@/components/shared/Icon'
import { TreatmentsTab } from './TreatmentsTab'
import { SessionsTab } from './SessionsTab'
import { CommentsTab } from './CommentsTab'
import { AttachmentsTab } from './AttachmentsTab'

type Tab = 'overview' | 'treatments' | 'sessions' | 'comments' | 'attachments'

function calculateAge(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',    label: 'Overview',    icon: 'users'   },
  { id: 'treatments',  label: 'Treatments',  icon: 'chart'   },
  { id: 'sessions',    label: 'Sessions',    icon: 'map'     },
  { id: 'comments',    label: 'Comments',    icon: 'message' },
  { id: 'attachments', label: 'Attachments', icon: 'download' },
]

function OverviewTab({ summary }: { summary: NonNullable<ReturnType<typeof usePatientFullSummary>['data']> }) {
  const { patient } = summary
  const age = calculateAge(patient.birthDate)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { label: 'Full name',      value: `${patient.firstName} ${patient.lastName}` },
        { label: 'Age',            value: `${age} years old` },
        { label: 'Gender',         value: patient.gender },
        { label: 'Birth date',     value: new Date(patient.birthDate).toLocaleDateString() },
        { label: 'Address',        value: patient.address },
        { label: 'Country / City', value: [patient.country, patient.state, patient.city].filter(Boolean).join(', ') || '—' },
        { label: 'Attention type', value: patient.primaryAttentionType === 'EducationalReinforcement' ? 'Educational Reinforcement' : patient.primaryAttentionType },
        { label: 'Description',    value: patient.description ?? '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
          <p className="text-sm font-medium text-[var(--hc-text-primary)]">{value}</p>
        </div>
      ))}
    </div>
  )
}


export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: summary, isLoading } = usePatientFullSummary(id!)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const patient = summary?.patient

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient ? `${patient.firstName} ${patient.lastName}` : 'Patient Profile'}
        description={patient
          ? `${patient.primaryAttentionType === 'EducationalReinforcement' ? 'Educational Reinforcement' : patient.primaryAttentionType} · ${patient.isActive ? 'Active' : 'Inactive'}`
          : ''}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : !summary ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Patient not found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          {/* Tab bar */}
          <div className="flex border-b border-[var(--hc-surface-border)] overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-[var(--hc-text-secondary)] hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'overview'   && <OverviewTab summary={summary} />}
            {activeTab === 'treatments' && <TreatmentsTab patientId={id!} />}
            {activeTab === 'sessions'   && <SessionsTab patientId={id!} />}
            {activeTab === 'comments'   && <CommentsTab patientId={id!} />}
            {activeTab === 'attachments' && <AttachmentsTab patientId={id!} />}
          </div>
        </div>
      )}
    </div>
  )
}
