import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  useTreatments,
  usePatchTreatmentStatus,
  useTreatmentDetails,
  useCreateTreatmentDetail,
  useTreatmentComments,
  useCreateTreatmentComment,
} from 'core/hooks/patients/useTreatments'
import { treatmentDetailSchema, type TreatmentDetailFormData } from 'core/schemas/treatmentDetail.schema'
import { commentSchema, type CommentFormData } from 'core/schemas/comment.schema'
import type { TreatmentResponse, TreatmentStatus } from 'core/types/patient.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { RHFTextInput, RHFSelect, RHFDateField, type RHFSelectOption } from '../../components/shared/form'
import { useOnline } from '../../hooks/useOnline'

const STATUS_VALUES: TreatmentStatus[] = ['Active', 'Completed', 'Paused']
const STATUS_BADGE: Record<TreatmentStatus, { bg: string; text: string }> = {
  Active: { bg: '#dcfce7', text: '#166534' },
  Completed: { bg: '#dbeafe', text: '#1e40af' },
  Paused: { bg: '#fef3c7', text: '#92400e' },
}
const COMMENT_TYPES: CommentFormData['type'][] = ['Simple', 'Medical', 'Route']

// Treatments + Details tab (R9, PR3): view-only treatment list (no create/edit/deactivate — D2)
// + status patch + an inline create-detail panel + an inline treatment-comment panel per expanded
// treatment. Every mutation gates on `useOnline()` (D7); reads render from the persisted MMKV
// cache automatically via #4's `PersistQueryClientProvider` — no special offline branch needed
// here beyond disabling submit buttons.
export function TreatmentsTab({ patientId }: { patientId: string }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data, isLoading, isError } = useTreatments(patientId, page)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        data={data}
        isEmpty={(d) => d.items.length === 0}
        emptyMessageKey="treatments.noTreatments"
      >
        {(d) => (
          <View style={styles.list}>
            {d.items.map((treatment) => (
              <View key={treatment.id} style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => setExpandedId((prev) => (prev === treatment.id ? null : treatment.id))}
                >
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {treatment.name}
                    </Text>
                    <Text style={styles.description} numberOfLines={1}>
                      {treatment.description}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_BADGE[treatment.status].bg }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_BADGE[treatment.status].text }]}>
                      {t(`treatments.status.${treatment.status}`)}
                    </Text>
                  </View>
                </Pressable>
                {expandedId === treatment.id && <ExpandedTreatment treatment={treatment} patientId={patientId} />}
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

// Status patch + inline create-detail + inline treatment-comment panels for one expanded
// treatment (R9). `usePatchTreatmentStatus` takes a raw status string (mirrors web's pill-Chip
// idiom, `patchStatus.mutate(s)`) — no form/schema needed for the status control itself.
function ExpandedTreatment({ treatment, patientId }: { treatment: TreatmentResponse; patientId: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  const patchStatus = usePatchTreatmentStatus(patientId, treatment.id)

  const [detailsPage, setDetailsPage] = useState(1)
  const { data: details, isLoading: detailsLoading } = useTreatmentDetails(treatment.id, detailsPage)
  const createDetail = useCreateTreatmentDetail(treatment.id, patientId)
  const [addingDetail, setAddingDetail] = useState(false)

  const [commentsPage, setCommentsPage] = useState(1)
  const { data: comments, isLoading: commentsLoading } = useTreatmentComments(treatment.id, commentsPage)
  const createComment = useCreateTreatmentComment(treatment.id, patientId)
  const [addingComment, setAddingComment] = useState(false)

  const detailForm = useForm<TreatmentDetailFormData>({
    resolver: zodResolver(treatmentDetailSchema),
    defaultValues: { name: '', description: '', treatmentDate: '', profile: null },
  })
  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '', type: 'Simple' },
  })

  const commentTypeOptions: RHFSelectOption[] = COMMENT_TYPES.map((v) => ({
    value: v,
    label: t(`treatments.commentType.${v}`),
  }))

  const onAddDetail = async (d: TreatmentDetailFormData) => {
    await createDetail.mutateAsync(d)
    detailForm.reset()
    setAddingDetail(false)
  }

  const onAddComment = async (d: CommentFormData) => {
    await createComment.mutateAsync(d)
    commentForm.reset()
    setAddingComment(false)
  }

  return (
    <View style={styles.expanded}>
      {/* Status control (R9, R12) — no delete/edit anywhere on this tab (D2). */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('treatments.statusLabel')}</Text>
        <View style={styles.statusRow}>
          {STATUS_VALUES.map((s) => {
            const active = treatment.status === s
            return (
              <Pressable
                key={s}
                disabled={!online || patchStatus.isPending}
                onPress={() => patchStatus.mutate(s)}
                style={[styles.statusPill, active && styles.statusPillActive]}
              >
                <Text style={active ? styles.statusPillTextActive : styles.statusPillText}>
                  {t(`treatments.status.${s}`)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Details (create-only, R9) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('treatments.detailsLabel')}</Text>
          <Pressable onPress={() => setAddingDetail((v) => !v)}>
            <Text style={styles.addLink}>{addingDetail ? t('common.cancel') : t('treatments.addDetail')}</Text>
          </Pressable>
        </View>

        {addingDetail && (
          <View style={styles.panel}>
            <RHFTextInput
              control={detailForm.control}
              name="name"
              label={t('treatments.detailName')}
              placeholder={t('treatments.detailNamePlaceholder')}
            />
            <RHFDateField control={detailForm.control} name="treatmentDate" label={t('treatments.detailDate')} mode="date" />
            <RHFTextInput
              control={detailForm.control}
              name="description"
              label={t('treatments.detailDescription')}
              placeholder={t('treatments.detailDescriptionPlaceholder')}
              multiline
            />
            <Pressable
              disabled={!online || detailForm.formState.isSubmitting}
              onPress={detailForm.handleSubmit(onAddDetail)}
              style={[styles.saveBtn, (!online || detailForm.formState.isSubmitting) && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveBtnText}>{t('treatments.saveDetail')}</Text>
            </Pressable>
          </View>
        )}

        {detailsLoading ? (
          <ActivityIndicator />
        ) : !details?.items.length ? (
          <Text style={styles.emptyText}>{t('treatments.noDetails')}</Text>
        ) : (
          <View style={styles.itemList}>
            {details.items.map((detail) => (
              <View key={detail.id} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {detail.name}
                  </Text>
                  <Text style={styles.itemDate}>{new Date(detail.treatmentDate).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.itemBody}>{detail.description}</Text>
              </View>
            ))}
          </View>
        )}

        {details && details.totalPages > 1 && (
          <View style={styles.pagination}>
            <Pressable disabled={detailsPage <= 1} onPress={() => setDetailsPage((p) => p - 1)}>
              <Text style={[styles.pageBtnText, detailsPage <= 1 && styles.pageBtnTextDisabled]}>
                {t('common.previous')}
              </Text>
            </Pressable>
            <Text style={styles.pageLabel}>
              {detailsPage} / {details.totalPages}
            </Text>
            <Pressable disabled={detailsPage >= details.totalPages} onPress={() => setDetailsPage((p) => p + 1)}>
              <Text style={[styles.pageBtnText, detailsPage >= details.totalPages && styles.pageBtnTextDisabled]}>
                {t('common.next')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Treatment comments (create-only, R9) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('treatments.commentsLabel')}</Text>
          <Pressable onPress={() => setAddingComment((v) => !v)}>
            <Text style={styles.addLink}>{addingComment ? t('common.cancel') : t('treatments.addComment')}</Text>
          </Pressable>
        </View>

        {addingComment && (
          <View style={styles.panel}>
            <RHFSelect
              control={commentForm.control}
              name="type"
              label={t('treatments.commentTypeLabel')}
              options={commentTypeOptions}
            />
            <RHFTextInput
              control={commentForm.control}
              name="body"
              label={t('treatments.commentBody')}
              placeholder={t('treatments.commentBodyPlaceholder')}
              multiline
            />
            <Pressable
              disabled={!online || commentForm.formState.isSubmitting}
              onPress={commentForm.handleSubmit(onAddComment)}
              style={[styles.saveBtn, (!online || commentForm.formState.isSubmitting) && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveBtnText}>{t('treatments.saveComment')}</Text>
            </Pressable>
          </View>
        )}

        {commentsLoading ? (
          <ActivityIndicator />
        ) : !comments?.items.length ? (
          <Text style={styles.emptyText}>{t('treatments.noComments')}</Text>
        ) : (
          <View style={styles.itemList}>
            {comments.items.map((comment) => (
              <View key={comment.id} style={styles.item}>
                <Text style={styles.commentTypeBadge}>{t(`treatments.commentType.${comment.type}`)}</Text>
                <Text style={styles.itemBody}>{comment.body}</Text>
              </View>
            ))}
          </View>
        )}

        {comments && comments.totalPages > 1 && (
          <View style={styles.pagination}>
            <Pressable disabled={commentsPage <= 1} onPress={() => setCommentsPage((p) => p - 1)}>
              <Text style={[styles.pageBtnText, commentsPage <= 1 && styles.pageBtnTextDisabled]}>
                {t('common.previous')}
              </Text>
            </Pressable>
            <Text style={styles.pageLabel}>
              {commentsPage} / {comments.totalPages}
            </Text>
            <Pressable disabled={commentsPage >= comments.totalPages} onPress={() => setCommentsPage((p) => p + 1)}>
              <Text style={[styles.pageBtnText, commentsPage >= comments.totalPages && styles.pageBtnTextDisabled]}>
                {t('common.next')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  list: { gap: 10 },
  card: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  cardHeaderText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  description: { fontSize: 13, color: '#6b7280' },
  statusBadge: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  expanded: { borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb', padding: 12, gap: 16 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  addLink: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  statusPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusPillText: { fontSize: 13, color: '#374151' },
  statusPillTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
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
  itemList: { gap: 8 },
  item: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, backgroundColor: '#fff', gap: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
  itemDate: { fontSize: 12, color: '#9ca3af' },
  itemBody: { fontSize: 13, color: '#374151' },
  commentTypeBadge: { fontSize: 11, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' },
  emptyText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 4 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  pageBtnTextDisabled: { color: '#d1d5db' },
  pageLabel: { fontSize: 12, color: '#6b7280' },
})
