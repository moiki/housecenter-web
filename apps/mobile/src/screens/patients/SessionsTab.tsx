import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSessions, usePatchSessionStatus } from 'core/hooks/patients/useSessions'
import { sessionStatusSchema, type SessionStatusFormData } from 'core/schemas/session.schema'
import type { AttentionSessionResponse, SessionStatus } from 'core/types/session.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { RHFSelect, RHFTextInput, type RHFSelectOption } from '../../components/shared/form'
import { useOnline } from '../../hooks/useOnline'
import type { PatientsStackParamList } from '../../navigation/PatientsStack'

const STATUS_VALUES: SessionStatus[] = ['Scheduled', 'Completed', 'Missed']
const STATUS_BADGE: Record<SessionStatus, { bg: string; text: string }> = {
  Scheduled: { bg: '#dbeafe', text: '#1e40af' },
  Completed: { bg: '#dcfce7', text: '#166534' },
  Missed: { bg: '#fee2e2', text: '#991b1b' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Sessions tab (R10, PR4): `useSessions` list + "Registrar sesión" → `CreateSessionScreen` modal
// + inline status-patch panel per expanded row (RHF + `sessionStatusSchema` +
// `usePatchSessionStatus`). NO delete action anywhere on this tab (Administrator-only, D2) — web
// renders a delete icon unconditionally, an existing web gap this mobile surface does not mirror.
export function SessionsTab({ patientId }: { patientId: string }) {
  const { t } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<PatientsStackParamList>>()
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data, isLoading, isError } = useSessions(patientId, { page, pageSize: 10 })

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('CreateSession', { patientId })}>
          <Text style={styles.addLink}>{t('sessions.newSession')}</Text>
        </Pressable>
      </View>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        data={data}
        isEmpty={(d) => d.items.length === 0}
        emptyMessageKey="sessions.noSessions"
      >
        {(d) => (
          <View style={styles.list}>
            {d.items.map((session) => (
              <View key={session.id} style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => setExpandedId((prev) => (prev === session.id ? null : session.id))}
                >
                  <View style={styles.cardHeaderText}>
                    <View style={styles.rowWrap}>
                      <Text style={styles.date}>{formatDate(session.sessionDate)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_BADGE[session.status].bg }]}>
                        <Text style={[styles.statusBadgeText, { color: STATUS_BADGE[session.status].text }]}>
                          {t(`sessions.status.${session.status}`)}
                        </Text>
                      </View>
                      <Text style={styles.typeText}>
                        {t(`patients.attentionType.${session.attentionType}`)}
                      </Text>
                    </View>
                    <Text style={styles.meta} numberOfLines={1}>
                      {session.collaboratorName}
                      {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
                    </Text>
                  </View>
                </Pressable>
                {expandedId === session.id && <SessionStatusPanel session={session} patientId={patientId} />}
              </View>
            ))}

            {data && data.totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
                  <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>
                    {t('common.previous')}
                  </Text>
                </Pressable>
                <Text style={styles.pageLabel}>
                  {page} / {d.totalPages}
                </Text>
                <Pressable disabled={page >= d.totalPages} onPress={() => setPage((p) => p + 1)}>
                  <Text style={[styles.pageBtnText, page >= d.totalPages && styles.pageBtnTextDisabled]}>
                    {t('common.next')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </QueryBoundary>
    </ScrollView>
  )
}

// Inline status-patch panel (R10, R12) — RHF + `sessionStatusSchema` + `usePatchSessionStatus`.
// Mirrors `TreatmentsTab`'s create-detail/comment panel gating idiom: submit disabled while
// offline or submitting; no delete control rendered.
function SessionStatusPanel({ session, patientId }: { session: AttentionSessionResponse; patientId: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  const patch = usePatchSessionStatus(patientId)

  const { control, handleSubmit, formState } = useForm<SessionStatusFormData>({
    resolver: zodResolver(sessionStatusSchema),
    defaultValues: {
      status: session.status,
      durationMinutes: session.durationMinutes?.toString() ?? '',
      notes: session.notes ?? '',
    },
  })

  const statusOptions: RHFSelectOption[] = STATUS_VALUES.map((s) => ({ value: s, label: t(`sessions.status.${s}`) }))

  const onSubmit = async (d: SessionStatusFormData) => {
    await patch.mutateAsync({
      sessionId: session.id,
      data: {
        status: d.status,
        durationMinutes: d.durationMinutes ? parseInt(d.durationMinutes, 10) : null,
        notes: d.notes || null,
      },
    })
  }

  return (
    <View style={styles.expanded}>
      <RHFSelect control={control} name="status" label={t('sessions.statusLabel')} options={statusOptions} />
      <RHFTextInput control={control} name="durationMinutes" label={t('sessions.duration')} keyboardType="number-pad" />
      <RHFTextInput control={control} name="notes" label={t('sessions.notes')} />
      <Pressable
        disabled={!online || formState.isSubmitting}
        onPress={handleSubmit(onSubmit)}
        style={[styles.saveBtn, (!online || formState.isSubmitting) && styles.saveBtnDisabled]}
      >
        <Text style={styles.saveBtnText}>{t('sessions.saveStatus')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'flex-end' },
  addLink: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  list: { gap: 10 },
  card: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { padding: 12 },
  cardHeaderText: { gap: 2 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  date: { fontSize: 15, fontWeight: '600', color: '#111827' },
  statusBadge: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  typeText: { fontSize: 12, color: '#9ca3af' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  expanded: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 12,
    gap: 10,
  },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 4 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  pageBtnTextDisabled: { color: '#d1d5db' },
  pageLabel: { fontSize: 12, color: '#6b7280' },
})
