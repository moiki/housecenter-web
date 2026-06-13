import type { WeeklySessionBucket } from '@/types/report.types'

interface Props {
  weeks: WeeklySessionBucket[]
}

const TYPE_COLORS: Record<string, string> = {
  Medical: '#7c3aed',
  EducationalReinforcement: '#06b6d4',
}
const TYPE_LABELS: Record<string, string> = {
  Medical: 'Medical',
  EducationalReinforcement: 'Educational',
}

export function SessionsBarChart({ weeks }: Props) {
  if (!weeks.length) {
    return <p className="text-sm text-tertiary text-center py-12">No data for this period.</p>
  }

  // Aggregate by weekStart → attentionType → total count
  const weekMap = new Map<string, Record<string, number>>()
  for (const b of weeks) {
    if (!weekMap.has(b.weekStart)) weekMap.set(b.weekStart, {})
    const entry = weekMap.get(b.weekStart)!
    entry[b.attentionType] = (entry[b.attentionType] ?? 0) + b.count
  }

  const sortedWeeks = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const types = [...new Set(weeks.map((b) => b.attentionType))]

  // Max total per week for scaling
  const maxTotal = Math.max(
    ...sortedWeeks.map(([, counts]) => Object.values(counts).reduce((s, v) => s + v, 0)),
    1,
  )

  const BAR_W = 28
  const GAP = 16
  const CHART_H = 160
  const LABEL_H = 32
  const LEFT_PAD = 36
  const totalW = sortedWeeks.length * (BAR_W + GAP) + LEFT_PAD

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxTotal * f))

  function formatWeek(iso: string) {
    const d = new Date(iso + 'T00:00:00Z')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {types.map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: TYPE_COLORS[t] ?? '#94a3b8' }}
            />
            <span className="text-xs text-tertiary">{TYPE_LABELS[t] ?? t}</span>
          </div>
        ))}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${Math.max(totalW, 400)} ${CHART_H + LABEL_H}`}
        preserveAspectRatio="xMinYMid meet"
        aria-label="Weekly sessions chart"
      >
        {/* Y-axis grid + labels */}
        {gridLines.map((val) => {
          const y = CHART_H - (val / maxTotal) * CHART_H
          return (
            <g key={val}>
              <line
                x1={LEFT_PAD}
                x2={totalW}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="1"
              />
              <text x={LEFT_PAD - 6} y={y + 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.4">
                {val}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {sortedWeeks.map(([weekStart, counts], wi) => {
          const x = LEFT_PAD + wi * (BAR_W + GAP)
          let stackY = CHART_H

          return (
            <g key={weekStart}>
              {types.map((type) => {
                const count = counts[type] ?? 0
                if (!count) return null
                const barH = (count / maxTotal) * CHART_H
                stackY -= barH
                return (
                  <rect
                    key={type}
                    x={x}
                    y={stackY}
                    width={BAR_W}
                    height={barH}
                    rx="3"
                    fill={TYPE_COLORS[type] ?? '#94a3b8'}
                    opacity="0.85"
                  >
                    <title>{`${TYPE_LABELS[type] ?? type}: ${count}`}</title>
                  </rect>
                )
              })}
              {/* X-axis label */}
              <text
                x={x + BAR_W / 2}
                y={CHART_H + 18}
                textAnchor="middle"
                fontSize="9"
                fill="currentColor"
                opacity="0.45"
              >
                {formatWeek(weekStart)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
