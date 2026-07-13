import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAttachments, useUploadAttachment, useDeleteAttachment } from 'core/hooks/attachments/useAttachments'
import type { AttachmentOwnerType, AttachmentResponse } from 'core/types/attachment.types'
import { QueryBoundary } from '../shared/QueryBoundary'
import { OfflineBanner } from '../shared/OfflineBanner'
import { useOnline } from '../../hooks/useOnline'
import { AuthedImage } from './AuthedImage'
import { pickAndUpload } from './pickAndUpload'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Reusable owner-agnostic attachments list + capture/upload + delete (R11, D5). Wraps
// `useAttachments`/`useUploadAttachment`/`useDeleteAttachment` in `QueryBoundary`/`EmptyState`,
// gates every write (capture/upload/delete) on `useOnline()` + `OfflineBanner` (R9, D8), and
// renders thumbnails via the Bearer-gated `AuthedImage` (R10, D3). Patient "Fotos" tab wires
// ownerType="Patient" (D6); ownerType="Treatment" is PR2's near-zero-code reuse. NO instance of
// this component renders anywhere for ownerType="AttentionSession" (deferred, D6, R12).
export function AttachmentsSection({ ownerType, ownerId }: { ownerType: AttachmentOwnerType; ownerId: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  const { data, isLoading, isError } = useAttachments(ownerType, ownerId)
  const upload = useUploadAttachment(ownerType, ownerId)
  const del = useDeleteAttachment(ownerType, ownerId)
  const [progress, setProgress] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Disabled while offline OR while an upload is already in flight (prevents double-tap
  // double-uploads); delete is gated per-row so one pending delete doesn't freeze the others.
  const captureDisabled = !online || progress !== null

  async function handlePick(source: 'camera' | 'library') {
    const result = await pickAndUpload(source, upload, setProgress)
    if (result === 'permission-denied') {
      Alert.alert(t('attachments.permissionDenied'))
    }
  }

  function confirmDelete(attachment: AttachmentResponse) {
    Alert.alert(t('attachments.delete'), t('attachments.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('attachments.delete'),
        style: 'destructive',
        onPress: () => {
          setDeletingId(attachment.id)
          del.mutate(attachment.id, { onSettled: () => setDeletingId(null) })
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, captureDisabled && styles.actionBtnDisabled]}
          disabled={captureDisabled}
          onPress={() => handlePick('camera')}
          accessibilityRole="button"
          accessibilityLabel={t('attachments.takePhoto')}
        >
          <Text style={styles.actionBtnText}>{t('attachments.takePhoto')}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, captureDisabled && styles.actionBtnDisabled]}
          disabled={captureDisabled}
          onPress={() => handlePick('library')}
          accessibilityRole="button"
          accessibilityLabel={t('attachments.chooseFromLibrary')}
        >
          <Text style={styles.actionBtnText}>{t('attachments.chooseFromLibrary')}</Text>
        </Pressable>
      </View>

      {progress !== null && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{t('attachments.uploading', { percent: progress })}</Text>
        </View>
      )}

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        data={data}
        isEmpty={(d) => d.length === 0}
        emptyMessageKey="attachments.empty"
      >
        {(list) => (
          <View style={styles.grid}>
            {list.map((a) => (
              <View key={a.id} style={styles.item}>
                <AuthedImage downloadUrl={a.downloadUrl} style={styles.thumb} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {a.fileName}
                </Text>
                <Text style={styles.fileSize}>{formatBytes(a.sizeBytes)}</Text>
                <Pressable
                  style={[styles.deleteBtn, (!online || deletingId === a.id) && styles.deleteBtnDisabled]}
                  disabled={!online || deletingId === a.id}
                  onPress={() => confirmDelete(a)}
                  accessibilityRole="button"
                  accessibilityLabel={t('attachments.delete')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteBtnText}>{t('attachments.delete')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </QueryBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#2563eb' },
  progressText: { fontSize: 12, color: '#6b7280', minWidth: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { width: '47%', gap: 4 },
  thumb: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#e5e7eb' },
  fileName: { fontSize: 12, fontWeight: '500', color: '#111827' },
  fileSize: { fontSize: 11, color: '#6b7280' },
  deleteBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
})
