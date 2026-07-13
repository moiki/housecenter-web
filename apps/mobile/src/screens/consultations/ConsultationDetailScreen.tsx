import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  useConsultationDetail,
  usePostMessage,
  useUpdateConsultationStatus,
} from 'core/hooks/consultations/useConsultations'
import { useUploadAttachment } from 'core/hooks/attachments/useAttachments'
import { postMessageSchema, type PostMessageFormData } from 'core/schemas/consultation.schema'
import type { ConsultationMessageResponse } from 'core/types/consultation.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { OfflineBanner } from '../../components/shared/OfflineBanner'
import { RHFTextInput } from '../../components/shared/form'
import { MessageAttachmentThumb } from '../../components/attachments/MessageAttachmentThumb'
import { pickPhoto, type PickedPhoto } from '../../components/attachments/pickAndUpload'
import { useOnline } from '../../hooks/useOnline'
import { useAuthStore } from '../../store/auth.store'
import type { ConsultationsStackParamList } from '../../navigation/ConsultationsStack'

type Props = NativeStackScreenProps<ConsultationsStackParamList, 'ConsultationDetail'>

// ConsultationDetailScreen (R4, R6, R8, R9, D4, D6): thread rendered oldest-first (author +
// timestamp + body + `MessageAttachmentThumb`) + a compose bar wired to `usePostMessage`, with an
// optional reply-time photo attach (R6). "Marcar resuelta" is a SCOPED Doctor exception (D6/R8):
// it renders ONLY when the signed-in user is this consultation's `assignedDoctorId` — never for
// the Member who opened it — and there is NO manual Open/UnderReview control anywhere (the API
// rejects it with 400; an assigned-doctor reply auto-transitions Open→UnderReview server-side,
// reflected here on refetch). Compose disables once `status === 'Resolved'` (posting on a
// resolved thread 409s) in favor of a resolved-hint note. Reply-submit, resolve, AND attach are
// all gated on `useOnline()` + `OfflineBanner` (R9) — reads still render from the persisted
// TanStack Query cache while offline.
//
// Reply-attach rules-of-hooks (D4): `useUploadAttachment(ownerType, ownerId)` bakes `ownerId`
// into its `mutationFn` at RENDER time, so it CANNOT be called with the newly-created message id
// inside the send handler. Instead: stage the picked photo locally (`staged`), post the message,
// set `uploadTargetId` to the returned id, and let a `useEffect([uploadTargetId])` fire the
// already-rebound `upload` mutation once the id is known. The staged local preview uses a plain
// `<Image>` on the picked file URI (NOT `AuthedImage`, which expects an authed download URL for
// historical thumbs).
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

  const [staged, setStaged] = useState<PickedPhoto | null>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)
  // Called unconditionally every render — `ownerId` tracks `uploadTargetId` (empty string until
  // a reply is posted, which is harmless: the mutation is only ever invoked from the effect
  // below, never eagerly).
  const upload = useUploadAttachment('ConsultationMessage', uploadTargetId ?? '')

  useEffect(() => {
    if (!uploadTargetId || !staged) return
    upload.mutateAsync({ file: staged }).finally(() => {
      setStaged(null)
      setUploadTargetId(null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadTargetId])

  async function onSend(d: PostMessageFormData) {
    const msg = await postMessage.mutateAsync({ body: d.body, attachmentUrl: null })
    reset()
    if (staged) setUploadTargetId(msg.id) // effect (above) uploads to the new message id
  }

  async function onPickPhoto() {
    const r = await pickPhoto('library')
    if (r.status === 'picked') setStaged(r.payload)
    else if (r.status === 'permission-denied') Alert.alert(t('attachments.permissionDenied'))
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
        <MessageAttachmentThumb messageId={item.id} />
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
                <View style={styles.composeArea}>
                  {staged && (
                    <View style={styles.stagedRow}>
                      {/* Plain <Image> on the picked local file URI — NOT AuthedImage, which is
                          for authed download URLs (historical thumbs) only. */}
                      <Image source={{ uri: staged.uri }} style={styles.stagedThumb} />
                    </View>
                  )}
                  <View style={styles.composeBar}>
                    <Pressable
                      disabled={!online}
                      onPress={onPickPhoto}
                      style={[styles.attachBtn, !online && styles.attachBtnDisabled]}
                    >
                      <Text style={styles.attachBtnText}>{t('consultations.attach')}</Text>
                    </Pressable>
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
  composeArea: { gap: 8, padding: 16 },
  stagedRow: { flexDirection: 'row' },
  stagedThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#e5e7eb' },
  composeBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composeInput: { flex: 1 },
  attachBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnDisabled: { opacity: 0.5 },
  attachBtnText: { fontSize: 13, color: '#374151' },
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
