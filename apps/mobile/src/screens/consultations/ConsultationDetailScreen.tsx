import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  useConsultationDetail,
  usePostMessage,
  useUpdateConsultationStatus,
} from 'core/hooks/consultations/useConsultations'
import { postMessageSchema, type PostMessageFormData } from 'core/schemas/consultation.schema'
import type { ConsultationMessageResponse } from 'core/types/consultation.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { OfflineBanner } from '../../components/shared/OfflineBanner'
import { RHFTextInput } from '../../components/shared/form'
import { useOnline } from '../../hooks/useOnline'
import { useAuthStore } from '../../store/auth.store'
import type { ConsultationsStackParamList } from '../../navigation/ConsultationsStack'

type Props = NativeStackScreenProps<ConsultationsStackParamList, 'ConsultationDetail'>

// ConsultationDetailScreen (R4, R8, R9, D6): thread rendered oldest-first (author + timestamp +
// body) + a text-only compose bar wired to `usePostMessage`. NO attachments yet — `pickPhoto` /
// `MessageAttachmentThumb` land in PR2 (R6); do not add them here. "Marcar resuelta" is a SCOPED
// Doctor exception (D6/R8): it renders ONLY when the signed-in user is this consultation's
// `assignedDoctorId` — never for the Member who opened it — and there is NO manual
// Open/UnderReview control anywhere (the API rejects it with 400; an assigned-doctor reply
// auto-transitions Open→UnderReview server-side, reflected here on refetch). Compose disables
// once `status === 'Resolved'` (posting on a resolved thread 409s) in favor of a resolved-hint
// note. Both the reply-submit and resolve actions are gated on `useOnline()` + `OfflineBanner`
// (R9) — reads still render from the persisted TanStack Query cache while offline.
export function ConsultationDetailScreen({ route }: Props) {
  const { consultationId } = route.params
  const { t } = useTranslation()
  const online = useOnline()
  const userId = useAuthStore((s) => s.user!.id)
  const { data, isLoading, isError } = useConsultationDetail(consultationId)
  const postMessage = usePostMessage(consultationId)
  const updateStatus = useUpdateConsultationStatus(consultationId)

  const { control, handleSubmit, reset } = useForm<PostMessageFormData>({
    resolver: zodResolver(postMessageSchema),
    defaultValues: { body: '' },
  })

  async function onSend(d: PostMessageFormData) {
    await postMessage.mutateAsync({ body: d.body, attachmentUrl: null })
    reset()
  }

  function renderMessage({ item }: { item: ConsultationMessageResponse }) {
    const mine = item.authorId === userId
    return (
      <View style={mine ? styles.bubbleMine : styles.bubbleTheirs}>
        <View style={styles.bubbleHeader}>
          <Text style={styles.author}>{item.authorName}</Text>
          <Text style={styles.timestamp}>{new Date(item.createdDate).toLocaleString()}</Text>
        </View>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <QueryBoundary isLoading={isLoading} isError={isError} data={data}>
        {({ consultation, messages }) => {
          const resolved = consultation.status === 'Resolved'
          const canResolve = userId === consultation.assignedDoctorId && !resolved
          // Defensive ASC sort (R4 "oldest-first") — independent of whatever order the API
          // already returns `messages` in.
          const sorted = [...messages].sort(
            (a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
          )
          return (
            <>
              {canResolve && (
                <Pressable
                  disabled={!online || updateStatus.isPending}
                  onPress={() => updateStatus.mutate({ status: 'Resolved' })}
                  style={[styles.resolveBtn, (!online || updateStatus.isPending) && styles.resolveBtnDisabled]}
                >
                  <Text style={styles.resolveBtnText}>{t('consultations.resolve')}</Text>
                </Pressable>
              )}
              <FlatList
                data={sorted}
                keyExtractor={(m) => m.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.thread}
              />
              {resolved ? (
                <Text style={styles.resolvedHint}>{t('consultations.resolvedHint')}</Text>
              ) : (
                <View style={styles.composeBar}>
                  <View style={styles.composeInput}>
                    <RHFTextInput
                      control={control}
                      name="body"
                      placeholder={t('consultations.messagePlaceholder')}
                      multiline
                    />
                  </View>
                  <Pressable
                    disabled={!online || postMessage.isPending}
                    onPress={handleSubmit(onSend)}
                    style={[styles.sendBtn, (!online || postMessage.isPending) && styles.sendBtnDisabled]}
                  >
                    <Text style={styles.sendBtnText}>{t('consultations.send')}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )
        }}
      </QueryBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  thread: { padding: 16, gap: 10 },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    maxWidth: '85%',
    gap: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 10,
    maxWidth: '85%',
    gap: 4,
  },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  author: { fontSize: 12, fontWeight: '700', color: '#374151' },
  timestamp: { fontSize: 11, color: '#9ca3af' },
  body: { fontSize: 14, color: '#111827' },
  resolveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  resolveBtnDisabled: { opacity: 0.5 },
  resolveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resolvedHint: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 14,
  },
  composeBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 16 },
  composeInput: { flex: 1 },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
