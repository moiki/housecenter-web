# SDD Design — Mobile Consultations

## Change name
`mobile-consultations`

## Status
`design` (2026-07-13)

Technical HOW for proposal `mobile-consultations` (change #8). Escalate-to-Doctor +
threaded medical conversation on mobile. **Zero new core hooks/api/types** — the core
consultations data layer is complete (`useConsultations`/`useConsultationDetail`/
`useCreateConsultation`/`usePostMessage`/`useUpdateConsultationStatus`, full key factory,
DTOs matching the API 1:1). Work is one hoisted Zod schema + three mobile screens + one
tab + reuse of #6/#7 primitives. Four-layer convention held: screens call core hooks only,
never `apiClient`.

---

## Target structure

```
packages/core/src/schemas/
  consultation.schema.ts            ← NEW (create + post-message; mirrors comment/session hoist)

apps/mobile/src/
  navigation/
    TabNavigator.tsx                ← MODIFY: add 3rd "Consultas" tab + ConsultationsStack
    PatientsStack.tsx               ← MODIFY: add CreateConsultation route ({patientId}, modal)
  screens/consultations/
    ConsultationsListScreen.tsx     ← NEW (role-filtered list → detail)
    ConsultationDetailScreen.tsx    ← NEW (thread + compose + role-conditional resolve + reply attach)
    CreateConsultationScreen.tsx    ← NEW (in PatientsStack; patient-scoped doctor picker)
  screens/patients/
    PatientDetailScreen.tsx         ← MODIFY: "Escalar a Doctor" button → CreateConsultation
  components/attachments/
    pickAndUpload.ts                ← MODIFY: split out pickPhoto (wrapper unchanged for callers)
    MessageAttachmentThumb.tsx      ← NEW (read-only thumb for historical bubbles)
  i18n/locales/es.json              ← MODIFY: nav.consultations + consultations.* keys

apps/web/*                          ← NO code change; build/lint regression gate only (shared core)
```

Reuse unchanged: `QueryBoundary`, `EmptyState`, `OfflineBanner`, `useOnline`, RHF form
components (`RHFSelect`/`RHFTextInput`), `AuthedImage`, `useAttachments`/`useUploadAttachment`,
`auth.store` (`user.id`), `usePatientFullSummary`.

---

## Architecture decisions

### D1 — One core schema hoist, web schemas untouched
**Choice**: New `packages/core/src/schemas/consultation.schema.ts` exporting
`createConsultationSchema` (assignedDoctorId/title/firstMessage required; **no** patientId —
route-supplied; **no** treatmentId — null in v1) + `postMessageSchema` (body required).
**Alternatives**: inline schemas in each mobile screen (rejected — duplicates web's intent,
no single source); migrate web's inline schemas to the hoisted one too (rejected — needless
regression surface).
**Rationale**: mirrors #6's comment/session hoist precedent exactly; additive new file, so
web is untouched and reverting is atomic. Shared core still ships behind a **web build/lint
regression gate**.

### D2 — Consultas 3rd tab + create colocated in PatientsStack (Option A), no cross-tab typed nav
**Choice**: Add a 3rd bottom tab **Consultas** wrapping a new `ConsultationsStackNavigator`
(`ConsultationsList` → `ConsultationDetail`). `CreateConsultationScreen` lives in
**`PatientsStack`** as a `presentation:'modal'` route taking `{patientId}` (identical to the
`CreateSession` precedent), reached via an **"Escalar a Doctor"** button on
`PatientDetailScreen`. `goBack()` on success. No standalone "+" on the list; no patient picker.
**Alternatives**: put create in the Consultas tab with a patient picker + cross-tab
`navigate('Pacientes', {...})` (rejected — introduces the app's first cross-tab typed
navigation and re-adds web's >100-patient picker bug); global "+" (rejected — create always
needs a patient context).
**Rationale**: create is intrinsically patient-scoped; carrying `{patientId}` from patient
detail is the minimal, precedent-matching wiring and avoids the typed cross-tab jump.

### D3 — attachmentUrl always null + polymorphic ownerType=ConsultationMessage, reply-only v1
**Choice**: Always send `attachmentUrl: null` on both create + post (matching web). Photos
attach via #7's polymorphic `useUploadAttachment('ConsultationMessage', messageId)` +
`useAttachments('ConsultationMessage', messageId)`. **v1 attaches only to REPLIES.**
**Alternatives**: use the `attachmentUrl` string field (rejected — dead code; nobody populates
it, web renders it nowhere, `AttachmentAuthorizer` never derives from it); attach-on-create
(deferred — `OpenConsultation` returns **no message id**, so it needs create → re-fetch detail
for `messages[0].id` → upload = 3-call round-trip + cross-screen staged payload).
**Rationale**: `PostConsultationMessage` returns the new `ConsultationMessageResponse` **with
id**, so reply-attach is self-contained (post → upload to the returned id). Goal (photos on
messages) satisfied simpler; attach-on-create is a fast-follow.

### D4 — pickPhoto split from pickAndUpload (zero change for callers) + read-only MessageAttachmentThumb
**Choice**: Extract `pickPhoto(source)` (permission + pick + manipulate → `AttachmentPayload`,
**no upload**) from `pickAndUpload.ts`; keep `pickAndUpload` as a thin wrapper that calls
`pickPhoto` then uploads. New read-only `MessageAttachmentThumb({messageId})` =
`useAttachments('ConsultationMessage', messageId)` + `AuthedImage`, silent when empty.
**Constraint honored**: `useUploadAttachment(ownerType, ownerId)` bakes `ownerId` into its
`mutationFn` at render — you **cannot** call it with the new id inside the Send handler
(rules-of-hooks). So the compose bar **stages** the picked payload, posts the message, sets a
`uploadTargetId` state to the returned id, and an effect fires the bound upload once
`uploadTargetId` is truthy.
**Alternatives**: reuse full `AttachmentsSection` per bubble (rejected — its capture/delete
affordances are wrong for a past message); duplicate the pick/manipulate logic (rejected).
**Rationale**: existing Patient/Treatment callers keep the identical `pickAndUpload` signature
and return contract (zero regression); the compose bar reuses the pure pick step.

### D5 — Patient-scoped doctor RHFSelect from assignedDoctors + zero-doctors handling
**Choice**: Doctor picker options = `usePatientFullSummary(patientId).assignedDoctors`
(`DoctorSummaryDto{id,firstName,lastName,email}`) mapped to `RHFSelect` pills. If
`assignedDoctors.length === 0`, disable the "Escalar a Doctor" entry point on
`PatientDetailScreen` with an explanatory Spanish hint (and guard again inside create).
**Alternatives**: web's global `useUsers(1,100)` filtered by role Doctor (rejected — a latent
bug; an unassigned doctor 400s `consultations.doctor_not_assigned`).
**Rationale**: patient-scoped is both correct and less work; `usePatientFullSummary` is already
fetched by `PatientDetailScreen`, `assignedDoctors` is on the wire and currently unrendered.

### D6 — Role-conditional resolve + compose-disabled-on-Resolved + no manual transitions (+ Doctor scoped exception)
**Choice**: Render "Marcar resuelta" (`useUpdateConsultationStatus.mutate({status:'Resolved'})`)
**only** when `user.id === consultation.assignedDoctorId`. Never expose manual
Open/UnderReview. Disable/hide compose when `status === 'Resolved'` (mirror web reply-box
gating). Auto Open→UnderReview is server-side when the assigned doctor replies. The **Doctor
role can reply + resolve their assigned consultations on mobile** — the one intentional parity
exception in v1 (master plan lines 192-193).
**Alternatives**: web's status `<select>` letting any viewer attempt any status (rejected — no
client role gating, relies on 403/400); offer resolve to Members (rejected — API forbids;
a Member can never resolve, even their own opened case).
**Rationale**: match the API lifecycle exactly (`UpdateConsultationStatus` rejects non-Resolved
with 400; only assigned-doctor/admin resolves with 403 otherwise; posting on Resolved 409s) so
the UI never offers an action the server will reject.

### D7 — Collaborator gating = none client-side, graceful 403
**Choice**: Show "Escalar a Doctor" unconditionally (subject to D5's zero-doctors guard); on
create, catch the API 403 `consultations.not_patient_collaborator` and surface a friendly
Spanish Alert — no crash, stay on the form.
**Alternatives**: pre-gate on collaborator membership (impossible — **no DTO exposes a
patient's `Collaborators`** to the frontend; `PatientFullSummaryResponse` has no
`collaborators` field).
**Rationale**: the API 403 is the only available gate; the UI must handle it gracefully rather
than attempt prevention.

### D8 — Online-gated writes
**Choice**: Gate create, reply-post, resolve, and photo-attach behind `useOnline()` +
`OfflineBanner` (reads stay cached via the existing `PersistQueryClientProvider`).
**Rationale**: Members work on intermittent rural connectivity; mirrors the #6/#7 write-gating
pattern (`CreateSessionScreen`, `AttachmentsSection`).

---

## Message thread + compose sequence

```
List (Consultas tab)                     Detail                                Create (PatientsStack modal)
────────────────────                     ──────                                ────────────────────────────
useConsultations(filters)                useConsultationDetail(id)             PatientDetail "Escalar a Doctor"
  server role-filters                      messages ASC (bubbles)                → navigate CreateConsultation {patientId}
  QueryBoundary/EmptyState               MessageAttachmentThumb per bubble      usePatientFullSummary → assignedDoctors
  tap row ──────────────────────────────▶  (silent if none)                    RHFSelect(doctor) + title + firstMessage
                                                                                useCreateConsultation.mutateAsync(
POST REPLY (compose bar):                                                         {patientId, assignedDoctorId, title,
  1. [optional] pickPhoto(source) → stage AttachmentPayload (thumb preview)        firstMessage, treatmentId:null,
  2. Send → postMessage.mutateAsync({body, attachmentUrl:null}) → newMsg{id}       attachmentUrl:null})
     └─ server: assigned-doctor reply auto Open→UnderReview                      → 201 → goBack()
  3. if staged: setUploadTargetId(newMsg.id)                                     → 403 not_patient_collaborator → Alert (stay)
  4. effect [uploadTargetId]: useUploadAttachment('ConsultationMessage',
     uploadTargetId).mutateAsync({file:staged}) → clear staged + target
  5. onSuccess invalidations refresh detail + the bubble's thumb

RESOLVE (assigned doctor only): useUpdateConsultationStatus.mutate({status:'Resolved'})
  → compose hides/disables; further posts 409
```

Key ordering fact: `usePostMessage` returns the message **with id** → attach follows the post.
`useCreateConsultation` (OpenConsultation) returns **no** message id → attach-on-create deferred.

---

## Code sketches

**`packages/core/src/schemas/consultation.schema.ts`** (new)
```ts
import { z } from 'zod'

export const createConsultationSchema = z.object({
  assignedDoctorId: z.string().min(1, 'Doctor is required'),
  title: z.string().min(1, 'Title is required'),
  firstMessage: z.string().min(1, 'Message is required'),
})
export type CreateConsultationFormData = z.infer<typeof createConsultationSchema>

export const postMessageSchema = z.object({
  body: z.string().min(1, 'Message is required'),
})
export type PostMessageFormData = z.infer<typeof postMessageSchema>
```

**`pickAndUpload.ts`** split (existing callers unchanged)
```ts
export type PickPhotoResult =
  | { status: 'picked'; payload: AttachmentPayload }
  | { status: 'canceled' }
  | { status: 'permission-denied' }

// permission + pick + ALWAYS manipulate (JPEG + downscale 1600px) → payload. No upload.
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickPhotoResult> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return { status: 'permission-denied' }
  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  if (res.canceled) return { status: 'canceled' }
  const context = ImageManipulator.manipulate(res.assets[0].uri)
  context.resize({ width: 1600 })
  const rendered = await context.renderAsync()
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 })
  return { status: 'picked', payload: { uri: out.uri, name: 'photo.jpg', type: 'image/jpeg' } }
}

// unchanged contract for AttachmentsSection: now a thin wrapper over pickPhoto
export async function pickAndUpload(source, upload, onProgress): Promise<PickAndUploadResult> {
  const picked = await pickPhoto(source)
  if (picked.status !== 'picked') return picked.status // 'canceled' | 'permission-denied'
  onProgress(0)
  try { await upload.mutateAsync({ file: picked.payload, onProgress }) } finally { onProgress(null) }
  return 'uploaded'
}
```

**`MessageAttachmentThumb.tsx`** (new, read-only)
```tsx
export function MessageAttachmentThumb({ messageId }: { messageId: string }) {
  const { data } = useAttachments('ConsultationMessage', messageId)
  if (!data || data.length === 0) return null // silent when empty
  return (
    <View style={styles.row}>
      {data.map((a) => <AuthedImage key={a.id} downloadUrl={a.downloadUrl} style={styles.thumb} />)}
    </View>
  )
}
```

**`ConsultationsListScreen.tsx`** (new)
```tsx
export function ConsultationsListScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useConsultations({ page: 1, pageSize: 20 }) // server role-filters
  return (
    <QueryBoundary isLoading={isLoading} isError={isError} data={data}
      isEmpty={(d) => d.items.length === 0} emptyMessageKey="consultations.empty">
      {(page) => (
        <FlatList data={page.items} keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('ConsultationDetail', { consultationId: item.id })}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.status}>{t(`consultations.status.${item.status}`)}</Text>
            </Pressable>
          )} />
      )}
    </QueryBoundary>
  )
}
```

**`ConsultationDetailScreen.tsx`** (new — thread + compose + reply-attach + resolve)
```tsx
export function ConsultationDetailScreen({ route }: Props) {
  const { consultationId } = route.params
  const { t } = useTranslation()
  const online = useOnline()
  const userId = useAuthStore((s) => s.user!.id)
  const { data, isLoading, isError } = useConsultationDetail(consultationId)
  const postMessage = usePostMessage(consultationId)
  const updateStatus = useUpdateConsultationStatus(consultationId)

  const { control, handleSubmit, reset } = useForm<PostMessageFormData>({
    resolver: zodResolver(postMessageSchema), defaultValues: { body: '' },
  })
  const [staged, setStaged] = useState<AttachmentPayload | null>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)
  const upload = useUploadAttachment('ConsultationMessage', uploadTargetId ?? '')

  // Rules-of-hooks: can't call useUploadAttachment with the new id in the handler → drive via effect.
  useEffect(() => {
    if (!uploadTargetId || !staged) return
    upload.mutateAsync({ file: staged }).finally(() => { setStaged(null); setUploadTargetId(null) })
  }, [uploadTargetId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSend(form: PostMessageFormData) {
    const msg = await postMessage.mutateAsync({ body: form.body, attachmentUrl: null })
    reset()
    if (staged) setUploadTargetId(msg.id) // effect uploads to the new message id
  }
  async function onPickPhoto() {
    const r = await pickPhoto('library')
    if (r.status === 'picked') setStaged(r.payload)
    else if (r.status === 'permission-denied') Alert.alert(t('attachments.permissionDenied'))
  }

  return (
    <QueryBoundary isLoading={isLoading} isError={isError} data={data}>
      {({ consultation, messages }) => {
        const resolved = consultation.status === 'Resolved'
        const canResolve = userId === consultation.assignedDoctorId && !resolved
        return (
          <View style={styles.container}>
            <OfflineBanner />
            {canResolve && (
              <Pressable disabled={!online || updateStatus.isPending}
                onPress={() => updateStatus.mutate({ status: 'Resolved' })}>
                <Text>{t('consultations.resolve')}</Text>
              </Pressable>
            )}
            <FlatList data={messages} keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <View style={item.authorId === userId ? styles.mine : styles.theirs}>
                  <Text style={styles.author}>{item.authorName}</Text>
                  <Text>{item.body}</Text>
                  <MessageAttachmentThumb messageId={item.id} />
                </View>
              )} />
            {resolved ? (
              <Text style={styles.resolvedHint}>{t('consultations.resolvedHint')}</Text>
            ) : (
              <View style={styles.composeBar}>
                {staged && <AuthedImage downloadUrl={staged.uri} style={styles.stagedThumb} />}
                <Pressable disabled={!online} onPress={onPickPhoto}><Text>{t('consultations.attach')}</Text></Pressable>
                <RHFTextInput control={control} name="body" placeholder={t('consultations.messagePlaceholder')} multiline />
                <Pressable disabled={!online || postMessage.isPending} onPress={handleSubmit(onSend)}>
                  <Text>{t('consultations.send')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )
      }}
    </QueryBoundary>
  )
}
```
> Note: the staged local preview uses the picked file URI, not an authed download URL — a
> plain `<Image uri={staged.uri}>` is simplest; `AuthedImage` above is illustrative for the
> in-thread historical thumbs only.

**`CreateConsultationScreen.tsx`** (new — in PatientsStack)
```tsx
export function CreateConsultationScreen({ route, navigation }: Props) {
  const { patientId } = route.params
  const { t } = useTranslation()
  const online = useOnline()
  const { data: summary } = usePatientFullSummary(patientId)
  const create = useCreateConsultation()
  const { control, handleSubmit, setError } = useForm<CreateConsultationFormData>({
    resolver: zodResolver(createConsultationSchema),
    defaultValues: { assignedDoctorId: '', title: '', firstMessage: '' },
  })
  const doctorOptions = (summary?.assignedDoctors ?? [])
    .map((d) => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))

  if (summary && summary.assignedDoctors.length === 0)
    return <EmptyState messageKey="consultations.noDoctors" /> // zero-doctors guard

  async function onSubmit(d: CreateConsultationFormData) {
    try {
      await create.mutateAsync({
        patientId, assignedDoctorId: d.assignedDoctorId, title: d.title,
        firstMessage: d.firstMessage, treatmentId: null, attachmentUrl: null,
      })
      navigation.goBack()
    } catch (err) {
      if (isApiError(err) && err.detail?.includes('not_patient_collaborator'))
        Alert.alert(t('consultations.notCollaborator')) // graceful 403, stay on form
      else throw err
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <OfflineBanner />
      <RHFSelect control={control} name="assignedDoctorId" label={t('consultations.doctor')} options={doctorOptions} />
      <RHFTextInput control={control} name="title" label={t('consultations.title')} />
      <RHFTextInput control={control} name="firstMessage" label={t('consultations.firstMessage')} multiline />
      <Pressable disabled={!online || create.isPending} onPress={handleSubmit(onSubmit)}>
        <Text>{t('consultations.create')}</Text>
      </Pressable>
    </ScrollView>
  )
}
```

**`PatientDetailScreen.tsx`** — "Escalar a Doctor" wiring (switch to `NativeStackScreenProps` for `navigation`)
```tsx
{(summary) => {
  const canEscalate = summary.assignedDoctors.length > 0
  return (
    <View style={styles.panel}>
      <Pressable disabled={!canEscalate}
        onPress={() => navigation.navigate('CreateConsultation', { patientId })}
        style={[styles.escalate, !canEscalate && styles.escalateDisabled]}>
        <Text style={styles.escalateText}>{t('consultations.escalate')}</Text>
      </Pressable>
      {!canEscalate && <Text style={styles.hint}>{t('consultations.noDoctors')}</Text>}
      {/* ...existing tab panels... */}
    </View>
  )
}}
```

**`PatientsStack.tsx`** — add route
```tsx
export type PatientsStackParamList = {
  PatientsList: undefined
  PatientDetail: { patientId: string }
  CreateSession: { patientId: string }
  CreateConsultation: { patientId: string }   // NEW
}
// <Stack.Screen name="CreateConsultation" component={CreateConsultationScreen}
//   options={{ title: t('consultations.createTitle'), presentation: 'modal' }} />
```

**`TabNavigator.tsx`** — 3rd Consultas tab + its stack
```tsx
export type ConsultationsStackParamList = {
  ConsultationsList: undefined
  ConsultationDetail: { consultationId: string }
}
const ConsultationsStack = createNativeStackNavigator<ConsultationsStackParamList>()
function ConsultationsStackNavigator() {
  const { t } = useTranslation()
  return (
    <ConsultationsStack.Navigator>
      <ConsultationsStack.Screen name="ConsultationsList" component={ConsultationsListScreen}
        options={{ title: t('consultations.title') }} />
      <ConsultationsStack.Screen name="ConsultationDetail" component={ConsultationDetailScreen}
        options={{ title: t('consultations.detailTitle') }} />
    </ConsultationsStack.Navigator>
  )
}
// In <Tab.Navigator> between Pacientes and More:
// <Tab.Screen name="Consultas" component={ConsultationsStackNavigator}
//   options={{ title: t('nav.consultations'), headerShown: false }} />
```

---

## Build/PR sequence

Two ordered, independently green PRs, each ≤400 lines, conventional commits.

| PR | Scope | Gate / smoke |
|---|---|---|
| **PR1 — Core schema + Consultas tab + list + thread** | `consultation.schema.ts`; 3rd Consultas tab + `ConsultationsStack`; `ConsultationsListScreen`; `ConsultationDetailScreen` (thread + compose + role-conditional resolve, **no attachments yet**); es.json nav + status/thread keys | core `tsc -b` + **web build/lint regression** (shared core); mobile `tsc --noEmit`, `expo-doctor`, `expo export`; smoke: list renders role-filtered; assigned Doctor reply → auto Under Review; resolve as assigned doctor → compose disables + further reply 409 |
| **PR2 — Create + reply attachments** | `CreateConsultationScreen` (PatientsStack modal, "Escalar a Doctor" button, patient-scoped doctor RHFSelect, zero-doctors guard, graceful 403); `pickPhoto` split; `MessageAttachmentThumb`; reply-time staged upload; es.json create/attach keys | typecheck/doctor/export + web regression; smoke: Member escalates an attended patient w/ assigned doctor → 201 Open; escalates a non-attended patient → friendly 403 (no crash); attach photo to a reply → thumb renders in-thread + retrievable via API |

No test runner (`strict_tdd:false`) — verify via `tsc` / `expo-doctor` / `expo export` / web build + lint.

---

## Verification

- **Core**: `pnpm --filter core tsc -b` (new schema type-checks; `CreateConsultationFormData`
  omits patientId/treatmentId — supplied at the mutate call).
- **Web regression**: `pnpm --filter web build` + `pnpm --filter web lint` — shared core must
  not break the existing web app (web schemas untouched).
- **Mobile**: `pnpm --filter mobile exec tsc --noEmit`; `expo-doctor`; `expo export` — screens,
  nav param lists (`ConsultationsStackParamList`, `PatientsStackParamList+CreateConsultation`),
  and the `pickAndUpload`→`pickPhoto` split all compile; existing attachment callers unchanged.
- **Human/EAS smoke** vs `:5080` (attachments render nowhere on web → mobile is the sole
  renderer; verify thumbnails via the API directly): (1) escalate attended patient → 201 Open;
  (2) escalate non-attended patient → friendly Spanish 403, no crash; (3) reply as assigned
  Doctor → auto Under Review; (4) attach photo to a reply → thumb renders + retrievable;
  (5) resolve as assigned doctor → compose disables, further reply 409; (6) offline: cached
  list/thread render, writes blocked + banner.

---

## Rollback

- **Core schema (PR1)** — additive new file, web's inline schemas untouched; no consumer is
  forced to migrate, no half-migrated state ships; reverting removes the file atomically.
- **Mobile (PR1+PR2)** — purely additive: new screens + one bottom tab + one PatientsStack
  route + a button + a split helper (existing Patient/Treatment attachment callers keep the
  identical `pickAndUpload` contract). No change to #5 auth, #6 patients, or #7 attachments
  runtime. Revert `feat/mobile-consultations` to remove the feature with no data/contract
  impact. Each chained PR reverts independently.
