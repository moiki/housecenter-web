import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCreatePatientComment } from 'core/hooks/patients/useTreatments'
import { commentSchema, type CommentFormData } from 'core/schemas/comment.schema'
import type { PatientCommentDto } from 'core/types/patient.types'
import { RHFSelect, RHFTextInput, type RHFSelectOption } from '../../components/shared/form'
import { useOnline } from '../../hooks/useOnline'

const COMMENT_TYPES: CommentFormData['type'][] = ['Simple', 'Medical', 'Route']

// Patient Comments tab (R11, PR4): `comments` comes from `PatientDetailScreen`'s already-fetched
// `usePatientFullSummary(patientId).comments` (passed down — avoids a duplicate query for the
// same summary the segmented control already loaded) + inline create panel (RHF +
// `comment.schema` + `useCreatePatientComment`). Create ONLY — no delete rendered (D2).
export function CommentsTab({ patientId, comments }: { patientId: string; comments: PatientCommentDto[] }) {
  const { t } = useTranslation()
  const online = useOnline()
  const createComment = useCreatePatientComment(patientId)
  const [adding, setAdding] = useState(false)

  const { control, handleSubmit, reset, formState } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '', type: 'Simple' },
  })

  const typeOptions: RHFSelectOption[] = COMMENT_TYPES.map((v) => ({ value: v, label: t(`comments.type.${v}`) }))

  const onSubmit = async (d: CommentFormData) => {
    await createComment.mutateAsync(d)
    reset()
    setAdding(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => setAdding((v) => !v)}>
          <Text style={styles.addLink}>{adding ? t('common.cancel') : t('comments.add')}</Text>
        </Pressable>
      </View>

      {adding && (
        <View style={styles.panel}>
          <RHFSelect control={control} name="type" label={t('comments.typeLabel')} options={typeOptions} />
          <RHFTextInput
            control={control}
            name="body"
            label={t('comments.body')}
            placeholder={t('comments.bodyPlaceholder')}
            multiline
          />
          <Pressable
            disabled={!online || formState.isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={[styles.saveBtn, (!online || formState.isSubmitting) && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveBtnText}>{t('comments.save')}</Text>
          </Pressable>
        </View>
      )}

      {!comments.length ? (
        <Text style={styles.emptyText}>{t('comments.noComments')}</Text>
      ) : (
        <View style={styles.list}>
          {comments.map((c) => (
            <View key={c.id} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.typeBadge}>{t(`comments.type.${c.type}`)}</Text>
                <Text style={styles.itemDate}>{new Date(c.createdDate).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.itemBody}>{c.body}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'flex-end' },
  addLink: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  panel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    backgroundColor: '#fff',
  },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { gap: 10 },
  item: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, backgroundColor: '#fff', gap: 6 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typeBadge: { fontSize: 11, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' },
  itemDate: { fontSize: 12, color: '#9ca3af' },
  itemBody: { fontSize: 14, color: '#374151' },
  emptyText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
})
