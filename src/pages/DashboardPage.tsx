import { useAuthStore } from '@/store/auth.store'
import { useSummaryReport, useSessionPeriodReport } from '@/hooks/reports/useReports'
import { PageHeader } from '@/components/shared/PageHeader'
import { SessionsBarChart } from '@/components/shared/SessionsBarChart'

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="bg-primary rounded-xl ring-1 ring-secondary shadow-xs p-5 flex flex-col gap-1">
      <p className="text-xs font-medium text-quaternary uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-semibold tabular-nums ${accent ? 'text-brand-600' : 'text-primary'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-tertiary">{sub}</p>}
    </div>
  )
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getLast8Weeks() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 56)
  return { from: toISODate(from), to: toISODate(to) }
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: summary, isLoading: summaryLoading } = useSummaryReport()

  const { from, to } = getLast8Weeks()
  const { data: period, isLoading: chartLoading } = useSessionPeriodReport(from, to)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        description="Here's what's happening across HouseCenter."
      />

      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active patients" value={summary.activePatients} sub={`${summary.totalPatients} total`} accent />
          <MetricCard label="Sessions this month" value={summary.sessionsThisMonth} />
          <MetricCard label="Collaborators" value={summary.collaborators} />
          <MetricCard label="Active treatments" value={summary.activeTreatments} />
          <MetricCard label="Clinics" value={summary.clinics} />
          <MetricCard label="Work routes" value={summary.workRoutes} />
          {Object.entries(summary.sessionsByAttentionType).map(([type, count]) => (
            <MetricCard
              key={type}
              label={type === 'EducationalReinforcement' ? 'Educational sessions' : `${type} sessions`}
              value={count}
            />
          ))}
        </div>
      ) : null}

      <div className="bg-primary rounded-xl ring-1 ring-secondary shadow-xs p-6">
        <div className="mb-4">
          <h2 className="text-md font-semibold text-primary">Sessions — last 8 weeks</h2>
          <p className="text-sm text-tertiary mt-0.5">Weekly breakdown by attention type</p>
        </div>
        {chartLoading ? (
          <div className="h-48 bg-secondary rounded-lg animate-pulse" />
        ) : period ? (
          <SessionsBarChart weeks={period.weeks} />
        ) : (
          <p className="text-sm text-tertiary text-center py-12">No session data available.</p>
        )}
      </div>
    </div>
  )
}
