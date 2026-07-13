import { useState } from 'react'
import dayjs from 'dayjs'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSessionPeriodReport } from 'core/hooks/reports/useReports'
import type { WeeklySessionBucket } from 'core/types/report.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'

// Preset days-back list — mirrors web's `ReportsPage.tsx` PRESETS exactly (28/56/91/182 days),
// device-local date math (`to = today`, `from = today - N days`, never `.utc()`). Index 1
// ("Last 8 weeks" / 56 days) is the default, matching web's `useState(1)`.
const PRESET_DAYS = [28, 56, 91, 182] as const
const DEFAULT_PRESET_INDEX = 1

interface WeekRow {
  weekStart: string
  count: number
}

// Reduces the raw per-{weekStart, attentionType, status} buckets to one summed row per week,
// client-side — D5's decision to avoid porting web's `SessionsBarChart` (recharts) internals,
// since recharts does not run on RN/Hermes. Sorted ascending so bars read left-to-right in time.
function toWeekRows(weeks: WeeklySessionBucket[]): WeekRow[] {
  const totals = new Map<string, number>()
  for (const w of weeks) {
    totals.set(w.weekStart, (totals.get(w.weekStart) ?? 0) + w.count)
  }
  return Array.from(totals.entries())
    .map(([weekStart, count]) => ({ weekStart, count }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

// Reportes — session-period only (R7, D5). NO recharts/charting library import anywhere in this
// file — `weeks` renders as plain RN `View` proportional-width bars instead. Role projection
// (Member=own, Sponsor=org-wide aggregate, Admin=named breakdown) is 100% server-side already
// (`GetSessionPeriodReport.cs`) — this screen is a pure renderer, zero client-side role branching.
// The `sessionsByCollaborator` breakdown renders if-and-only-if the API returns it non-null,
// mirroring web's `byCollaborator.length > 0` guard as-is. `summary`/clinic/work-route reports are
// intentionally NOT surfaced here (R7).
export function ReportsScreen() {
  const { t } = useTranslation()
  const [presetIndex, setPresetIndex] = useState(DEFAULT_PRESET_INDEX)

  const to = dayjs().format('YYYY-MM-DD')
  const from = dayjs().subtract(PRESET_DAYS[presetIndex], 'day').format('YYYY-MM-DD')

  const { data, isLoading, isError } = useSessionPeriodReport(from, to)

  return (
    <View style={styles.container}>
      <View style={styles.presetRow}>
        {PRESET_DAYS.map((days, i) => (
          <Pressable
            key={days}
            style={[styles.presetButton, presetIndex === i && styles.presetButtonActive]}
            onPress={() => setPresetIndex(i)}
          >
            <Text style={[styles.presetText, presetIndex === i && styles.presetTextActive]}>
              {t(`reports.preset.d${days}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        data={data}
        isEmpty={(d) => d.weeks.length === 0}
        emptyMessageKey="reports.empty"
      >
        {(report) => {
          const rows = toWeekRows(report.weeks)
          const maxCount = Math.max(...rows.map((r) => r.count), 1)
          const byCollaborator = report.sessionsByCollaborator
            ? Object.entries(report.sessionsByCollaborator).sort(([, a], [, b]) => b - a)
            : []

          return (
            <FlatList
              data={rows}
              keyExtractor={(r) => r.weekStart}
              contentContainerStyle={styles.list}
              ListHeaderComponent={<Text style={styles.sectionTitle}>{t('reports.sessionsTitle')}</Text>}
              renderItem={({ item }) => {
                const pct = Math.round((item.count / maxCount) * 100)
                return (
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>{item.weekStart}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` as const }]} />
                    </View>
                    <Text style={styles.barCount}>{item.count}</Text>
                  </View>
                )
              }}
              ListFooterComponent={
                byCollaborator.length > 0 ? (
                  <View style={styles.collabSection}>
                    <Text style={styles.sectionTitle}>{t('reports.byCollaboratorTitle')}</Text>
                    {byCollaborator.map(([name, count]) => (
                      <View key={name} style={styles.collabRow}>
                        <Text style={styles.collabName}>{name}</Text>
                        <Text style={styles.collabCount}>{count}</Text>
                      </View>
                    ))}
                  </View>
                ) : null
              }
            />
          )
        }}
      </QueryBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  presetButtonActive: { backgroundColor: '#111827', borderColor: '#111827' },
  presetText: { fontSize: 13, color: '#374151' },
  presetTextActive: { color: '#ffffff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 84, fontSize: 12, color: '#6b7280' },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 7 },
  barCount: { width: 32, fontSize: 12, color: '#374151', textAlign: 'right' },
  collabSection: { marginTop: 20, gap: 8 },
  collabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  collabName: { fontSize: 14, color: '#111827' },
  collabCount: { fontSize: 14, fontWeight: '600', color: '#111827' },
})
