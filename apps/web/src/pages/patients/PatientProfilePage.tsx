import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, MenuItem, Paper, Skeleton, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import MedicalServicesOutlined from '@mui/icons-material/MedicalServicesOutlined'
import EventOutlined from '@mui/icons-material/EventOutlined'
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined'
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined'
import { usePatientFullSummary } from 'core/hooks/patients/usePatients'
import { useUsers } from 'core/hooks/users/useUsers'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { useAssignDoctor, useRemoveDoctor } from 'core/hooks/patients/useTreatments'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { HelpTooltip } from '@/components/shared/HelpTooltip'
import { TreatmentsTab } from './TreatmentsTab'
import { SessionsTab } from './SessionsTab'
import { CommentsTab } from './CommentsTab'
import { AttachmentsTab } from './AttachmentsTab'
import type { DoctorSummaryDto } from 'core/types/patient.types'

type TabId = 'overview' | 'treatments' | 'sessions' | 'comments' | 'attachments'

function calculateAge(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function AssignedDoctorsSection({ patientId, doctors }: { patientId: string; doctors: DoctorSummaryDto[] }) {
  const { t } = useTranslation()
  const isOwner = useAuthStore((s) => s.user?.roles.includes('Owner') ?? false)
  // Dropdown needs the full user list; capped at the backend's clamp max (100 rows).
  const { data: usersData } = useUsers(1, DROPDOWN_PAGE_SIZE)
  const assignDoctor = useAssignDoctor(patientId)
  const removeDoctor = useRemoveDoctor(patientId)
  const [selectedDoctorId, setSelectedDoctorId] = useState('')

  const doctorOptions = (usersData?.items ?? [])
    .filter((u) => u.roles.includes('Doctor') && !doctors.some((d) => d.id === u.id))
    .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))

  const handleAssign = () => {
    if (!selectedDoctorId) return
    assignDoctor.mutate(selectedDoctorId, { onSuccess: () => setSelectedDoctorId('') })
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('patients.assignedDoctors.title')}
        </Typography>
        <HelpTooltip topicKey="patients.assign-doctor" />
      </Box>

      {doctors.length === 0 ? (
        <Typography sx={{ fontSize: 14, color: 'text.disabled', mb: 1.5 }}>{t('patients.assignedDoctors.empty')}</Typography>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
          {doctors.map((d) => (
            <Chip
              key={d.id}
              size="small"
              label={`${d.firstName} ${d.lastName}`}
              onDelete={isOwner ? () => removeDoctor.mutate(d.id) : undefined}
            />
          ))}
        </Stack>
      )}

      {isOwner && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            select
            size="small"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            sx={{ minWidth: 220 }}
            disabled={doctorOptions.length === 0}
          >
            {doctorOptions.length === 0 ? (
              <MenuItem value="" disabled>{t('patients.assignedDoctors.noneAvailable')}</MenuItem>
            ) : (
              doctorOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))
            )}
          </TextField>
          <Button
            size="small"
            variant="outlined"
            onClick={handleAssign}
            disabled={!selectedDoctorId || assignDoctor.isPending}
          >
            {t('patients.assignedDoctors.assignButton')}
          </Button>
        </Box>
      )}
    </Box>
  )
}

function OverviewTab({ summary }: { summary: NonNullable<ReturnType<typeof usePatientFullSummary>['data']> }) {
  const { t } = useTranslation()
  const { patient } = summary
  const age = calculateAge(patient.birthDate)

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {[
          { label: t('patients.overview.fullName'),      value: `${patient.firstName} ${patient.lastName}` },
          { label: t('patients.fields.age'),              value: t('patients.overview.ageValue', { age }) },
          { label: t('patients.fields.gender'),           value: t(`enums.gender.${patient.gender}`) },
          { label: t('patients.fields.birthDate'),        value: new Date(patient.birthDate).toLocaleDateString() },
          { label: t('common.fields.address'),            value: patient.address },
          { label: t('patients.overview.countryCity'),    value: [patient.country, patient.state, patient.city].filter(Boolean).join(', ') || '—' },
          { label: t('patients.fields.attentionType'),    value: t(`enums.attentionType.${patient.primaryAttentionType}`) },
          { label: t('common.fields.description'),        value: patient.description ?? '—' },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ bgcolor: 'action.hover', borderRadius: 1.5, px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 0.25 }}>{label}</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{value}</Typography>
          </Box>
        ))}
      </Box>
      <AssignedDoctorsSection patientId={patient.id} doctors={summary.assignedDoctors} />
    </>
  )
}


export function PatientProfilePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: summary, isLoading } = usePatientFullSummary(id!)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const TABS: { id: TabId; label: string; icon: SvgIconComponent }[] = [
    { id: 'overview',    label: t('patients.tabs.overview'),    icon: PersonOutlined },
    { id: 'treatments',  label: t('patients.tabs.treatments'),  icon: MedicalServicesOutlined },
    { id: 'sessions',    label: t('patients.tabs.sessions'),    icon: EventOutlined },
    { id: 'comments',    label: t('patients.tabs.comments'),    icon: ChatBubbleOutlineOutlined },
    { id: 'attachments', label: t('patients.tabs.attachments'), icon: AttachFileOutlined },
  ]

  const patient = summary?.patient

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title={patient ? `${patient.firstName} ${patient.lastName}` : t('patients.detail.fallbackTitle')}
        description={patient
          ? `${t(`enums.attentionType.${patient.primaryAttentionType}`)} · ${patient.isActive ? t('patients.status.active') : t('patients.status.inactive')}`
          : ''}
      />

      {isLoading ? (
        <Stack spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : !summary ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <Typography sx={{ fontSize: 14 }}>{t('patients.detail.notFound')}</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: TabId) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                icon={<tab.icon fontSize="small" />}
                iconPosition="start"
                sx={{ minHeight: 48, fontSize: 14, fontWeight: 500 }}
              />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 'overview'   && <OverviewTab summary={summary} />}
            {activeTab === 'treatments' && <TreatmentsTab patientId={id!} />}
            {activeTab === 'sessions'   && <SessionsTab patientId={id!} />}
            {activeTab === 'comments'   && <CommentsTab patientId={id!} />}
            {activeTab === 'attachments' && <AttachmentsTab patientId={id!} />}
          </Box>
        </Paper>
      )}
    </Box>
  )
}
