import { useTranslation } from 'react-i18next'
import type { WeeklySessionBucket } from 'core/types/report.types'

interface Props {
  weeks: WeeklySessionBucket[]
}

const TYPE_COLORS: Record<string, string> = {
  Medical: '#7c3aed',
  EducationalReinforcement: '#06b6d4',
}

export function SessionsBarChart({ weeks }: Props) {
  const { t } = useTranslation()

  function typeLabel(type: string) {
    return t(`sessionsChart.legend.${type}`, { defaultValue: type })
  }

  if (!weeks.length) {
    return <p className="text-sm text-tertiary text-center py-12">{t('sessionsChart.empty')}</p>
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
        {types.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: TYPE_COLORS[type] ?? '#94a3b8' }}
            />
            <span className="text-xs text-tertiary">{typeLabel(type)}</span>
          </div>
        ))}
      </div>

      {/* Fixed pixel width/height matching the viewBox 1:1 — NOT width="100%". SVG with no
          explicit height falls back to the viewBox aspect ratio, so stretching width to fill a
          wide dashboard card (without a matching height) inflated the height proportionally too,
          blowing up every bar. Few weeks now sit at their natural (possibly narrower-than-card)
          size instead of being warped; many weeks scroll via the wrapper's overflow-x-auto,
          which is what it was already there for. */}
      <svg
        width={Math.max(totalW, 400)}
        height={CHART_H + LABEL_H}
        viewBox={`0 0 ${Math.max(totalW, 400)} ${CHART_H + LABEL_H}`}
        aria-label={t('sessionsChart.ariaLabel')}
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
          const weekTotal = Object.values(counts).reduce((s, v) => s + v, 0)

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
                    <title>{`${typeLabel(type)}: ${count}`}</title>
                  </rect>
                )
              })}
              {/* Total-for-the-week label, so the count reads at a glance instead of
                  requiring a hover over each segment or squinting at the faint Y-axis. */}
              {weekTotal > 0 && (
                <text
                  x={x + BAR_W / 2}
                  y={stackY - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="currentColor"
                  opacity="0.65"
                >
                  {weekTotal}
                </text>
              )}
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
