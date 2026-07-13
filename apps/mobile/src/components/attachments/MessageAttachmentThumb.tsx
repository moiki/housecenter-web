import { StyleSheet, View } from 'react-native'
import { useAttachments } from 'core/hooks/attachments/useAttachments'
import { AuthedImage } from './AuthedImage'

// Read-only historical-attachment strip for a single consultation message bubble (R4, R6, D4).
// `useAttachments('ConsultationMessage', messageId)` + Bearer-gated `AuthedImage` (downloadUrl,
// not a local file URI — unlike the compose bar's staged preview, which uses a plain `<Image>`).
// Renders `null` when empty — most messages have no attachment, so this must not add any
// placeholder/empty-state chrome inside the thread. No capture/delete affordances here (that's
// `AttachmentsSection`'s job for Patient/Treatment "Fotos" tabs) — this is intentionally read-only.
export function MessageAttachmentThumb({ messageId }: { messageId: string }) {
  const { data } = useAttachments('ConsultationMessage', messageId)
  if (!data || data.length === 0) return null
  return (
    <View style={styles.row}>
      {data.map((a) => (
        <AuthedImage key={a.id} downloadUrl={a.downloadUrl} style={styles.thumb} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#e5e7eb' },
})
