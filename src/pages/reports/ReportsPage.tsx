import { useState } from 'react'
import { useSessionPeriodReport } from '@/hooks/reports/useReports'
import { PageHeader } from '@/components/shared/PageHeader'
import { SessionsBarChart } from '@/components/shared/SessionsBarChart'
import { TableCard } from '@/components/application/table/table'
import { Button } from '@/components/base/buttons/button'

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

const PRESETS = [
  { label: 'Last 4 weeks', days: 28 },
  { label: 'Last 8 weeks', days: 56 },
  { label: 'Last 3 months', days: 91 },
  { label: 'Last 6 months', days: 182 },
]

export function ReportsPage() {
  const [preset, setPreset] = useState(1) // default: last 8 weeks

  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - PRESETS[preset].days)

  const fromStr = toISODate(from)
  const toStr = toISODate(to)

  const { data, isLoading } = useSessionPeriodReport(fromStr, toStr)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Session activity and performance metrics."
      />

      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map((p, i) => (
          <Button
            key={p.label}
            color={preset === i ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setPreset(i)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Sessions chart */}
      <div className="bg-primary rounded-xl ring-1 ring-secondary shadow-xs p-6">
        <div className="mb-4">
          <h2 className="text-md font-semibold text-primary">Sessions over time</h2>
          <p className="text-sm text-tertiary mt-0.5">
            {from.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {' — '}
            {to.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        {isLoading ? (
          <div className="h-48 bg-secondary rounded-lg animate-pulse" />
        ) : data ? (
          <SessionsBarChart weeks={data.weeks} />
        ) : null}
      </div>

      {/* Sessions by collaborator (Admin/Owner only) */}
      {data?.sessionsByCollaborator && Object.keys(data.sessionsByCollaborator).length > 0 && (
        <TableCard.Root>
          <TableCard.Header
            title="Sessions by collaborator"
            badge={String(Object.keys(data.sessionsByCollaborator).length)}
          />
          <div className="divide-y divide-secondary">
            {Object.entries(data.sessionsByCollaborator)
              .sort(([, a], [, b]) => b - a)
              .map(([name, count]) => (
                <div key={name} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-primary">{name}</span>
                  <span className="text-sm font-semibold text-primary tabular-nums">{count}</span>
                </div>
              ))}
          </div>
        </TableCard.Root>
      )}
    </div>
  )
}
