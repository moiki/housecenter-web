# SDD Design — Mobile Patients & Progress Recording

## Change name
`mobile-patients-progress`

## Status
`design` (2026-07-13)

---

## Technical approach

Build a **Pacientes** tab in `apps/mobile` that lets a field Member browse patients, open a
patient with a **custom segmented control** over Overview / Treatments / Sessions / Comments, and
record progress — create AttentionSessions, create TreatmentDetails, patch treatment/session
status, add patient/treatment comments. Screens call **core hooks only** (never `apiClient`),
Spanish-first, every mutation write-gated on `onlineManager`, reads served from the persisted MMKV
cache. Core's patient data layer is **complete** — the only shared work is hoisting **3 inline web
Zod schemas** into `packages/core/src/schemas/` so RN and web share one source of truth. Because
those 3 files are shared, **PR1 carries a web build/lint regression gate**. This change also
**introduces the RHF + zodResolver form pattern to mobile** (auth #5 used plain `useState`), via a
small set of RN Controller field wrappers.

---

## Target structure

```
packages/core/src/schemas/                (SHARED with apps/web — keep web build green)
├── treatmentDetail.schema.ts   NEW   treatmentDetailSchema (name/description/profile[""→null]/treatmentDate)
├── session.schema.ts           NEW   createSessionSchema (locationMode discriminator + superRefine) + sessionStatusSchema
└── comment.schema.ts           NEW   commentSchema (body + type) — replaces 2 byte-identical web copies
                                       (treatment.schema stays INLINE in web — out of mobile scope)

apps/web/src/pages/patients/              (rewire only — no behavior change)
├── TreatmentsTab.tsx           MODIFIED  drop inline detailSchema + commentSchema → import from core
├── SessionsTab.tsx             MODIFIED  drop inline createSchema + statusSchema → import from core
└── CommentsTab.tsx             MODIFIED  drop inline schema → import core commentSchema

apps/mobile/
├── package.json                MODIFIED  + react-hook-form ^7.79, @hookform/resolvers ^5.4, @react-native-community/datetimepicker (expo install)
└── src/
    ├── navigation/TabNavigator.tsx        MODIFIED  Home→Pacientes; mount PatientsStackNavigator
    ├── navigation/PatientsStack.tsx       NEW       native-stack: PatientsList → PatientDetail (+ CreateSession modal); PatientsStackParamList
    ├── components/shared/form/            NEW       RN RHF field wrappers (RHFTextInput, RHFSelect, RHFPickerField, RHFDateField)  [RN-only, R7]
    ├── screens/patients/
    │   ├── PatientsListScreen.tsx         NEW       usePatients + FlatList + client-side search
    │   ├── PatientDetailScreen.tsx        NEW       usePatientFullSummary + segmented control<TabId>
    │   ├── OverviewTab.tsx                NEW       read-only summary
    │   ├── TreatmentsTab.tsx              NEW       useTreatments + status patch + create-detail + treatment-comment
    │   ├── SessionsTab.tsx                NEW       useSessions + status patch (no delete)
    │   ├── CommentsTab.tsx                NEW       patient comments (from summary) + create
    │   └── CreateSessionScreen.tsx        NEW       modal form: RHF + createSessionSchema + datetimepicker
    └── i18n/locales/es.json               MODIFIED  + patients namespace + enum-label maps
```

---

## Architecture decisions

### D1 — Hoist exactly 3 schemas (byte-identical move), leave `treatment.schema` inline
**Choice.** Create `core/schemas/{treatmentDetail,session,comment}.schema.ts` as **verbatim moves**
of the web inline schemas, then rewire the 3 web tabs to import them. `session.schema.ts` exports
`createSessionSchema` (keeps the UI-only `locationMode: clinic|workRoute` discriminator +
`superRefine` and the `collaboratorId` field) **and** `sessionStatusSchema`. `comment.schema.ts`
collapses the **two byte-identical** copies (`TreatmentsTab` + `CommentsTab`). Do **not** hoist
`treatmentSchema` (treatment create/edit) — it stays inline in web.
**Alternatives.** Hoist all 4 web schemas — **rejected**: treatment create/edit is out of mobile
scope, so moving it adds web churn + regression surface for zero mobile reuse. Rewrite mobile
schemas from scratch — **rejected**: two divergent validators for one API contract.
**Rationale.** DRY single source of truth for RN+web; `core` already deps `zod ^4` (no new dep).
Keeping `collaboratorId` in the shared `createSessionSchema` (mobile pre-fills it, see D6) means the
schema is a **pure move** — the web rewire is mechanical and the regression gate stays trivial.
Gotcha: `treatmentDetailSchema.profile` carries a `""→null` transform, so `z.infer` yields the
**output** type (`profile: string|null`); forms default `profile: null` and type `useForm` with the
inferred type — exactly what web does today (no RHF input/output divergence at the field boundary).

### D2 — Member write-scope boundary (surface ≠ server capability)
**Choice.** Patients **VIEW-ONLY** (list/search/detail — no create/edit/deactivate). Treatments
**VIEW + status patch** (create/edit hooks exist in core but stay unwired). Treatment details
**CREATE only** (no delete rendered). Sessions **CREATE + status patch, NO delete**. Comments
(patient + treatment) **CREATE only**.
**Alternatives.** Mirror web 1:1 (renders delete everywhere, any-collaborator dropdown, patient
CRUD) — **rejected**: web renders a session delete icon unconditionally (an existing web gap; the
API 403s a Member), and patients are registered on intake via web, not mid-visit on a phone.
**Rationale.** Reconciles the master-plan self-contradiction (API permits CRUD; product hides it):
server capability ≠ mobile surface. Do **not** render actions a Member cannot perform (avoids 403
dead-ends). This is a UI decision, not a client security boundary — the server still enforces.

### D3 — Custom segmented control over `material-top-tabs`
**Choice.** A single `PatientDetailScreen` with a local `useState<TabId>` and a row of Pressable
pills (Overview / Treatments / Sessions / Comments — no Attachments = #7).
**Alternatives.** `@react-navigation/material-top-tabs` (+`react-native-pager-view`) for swipeable
tabs — **rejected**: two new deps (one native) for 4 non-deep-linked tabs.
**Rationale.** Mirrors web's `activeTab` `useState`; zero new nav dep; consistent with #4 decision
#8 (dependency-light). Reconsider only if product asks for swipe gestures.

### D4 — Form pattern: RHF + zodResolver + core schemas + RN Controller wrappers
**Choice.** All forms use `useForm({ resolver: zodResolver(coreSchema) })` with a `Controller` per
field, via a small **new** RN wrapper set in `components/shared/form/`: `RHFTextInput`
(TextInput + error text), `RHFSelect` (Pressable pills — for small enum sets: attentionType,
locationMode, status, commentType), `RHFPickerField` (RN `Modal` + `FlatList` — for large lists:
clinics/work routes), `RHFDateField` (datetimepicker, D5). Screens stay declarative like the web
tabs.
**Alternatives.** Plain `useState` like `LoginScreen` — **rejected**: a 2-field login is no
precedent for multi-field enum/conditional forms; hand-rolled validation would duplicate the
hoisted Zod. A new picker dep (`@react-native-picker/picker`) — **rejected**: `Modal`+`FlatList`
covers the two large-list cases without a native dep. Formik/RN-Paper — **rejected**: diverges from
the web RHF+Zod stack and can't share the core schemas.
**Rationale.** RHF+Zod is the project convention (web CLAUDE.md); sharing core schemas = one
validation source across platforms. Wrappers are RN-only (R7) — they must **not** go to core.

### D5 — `@react-native-community/datetimepicker` for sessionDate / treatmentDate
**Choice.** Install via `npx expo install`. `RHFDateField` wraps it: `mode="date"` for
`treatmentDate`, `mode="datetime"` for `sessionDate`; stores the value as a string in form state
and converts on submit (`new Date(v).toISOString()` — mirrors web `SessionsTab.handleCreate`). The
wrapper abstracts the platform split (Android `DateTimePickerAndroid.open` imperative dialog; iOS
inline spinner).
**Alternatives.** A text field for ISO input (web uses `<input type="datetime-local">`) —
**rejected**: no `datetime-local` on RN and hostile UX. A JS-only calendar lib — **rejected**:
datetimepicker is the community-standard native picker, Expo-installable.
**Rationale.** Native pickers, well established. **Risk:** Expo SDK 55 compat — verify at
`expo-doctor` / `expo export` (PR4).

### D6 — `collaboratorId = self` (user.id) working assumption + smoke verification + fallback
**Choice.** Auto-fill `collaboratorId = useAuthStore().user.id` as the `createSessionSchema` default
— **no** collaborator field rendered (unlike web's admin any-collaborator dropdown). Working
assumption: the API accepts the authenticated `UserResponse.id` as `collaboratorId`.
**Alternatives.** Reproduce web's `useCollaborators()` dropdown — **rejected**: wrong UX (a Member
records their own visit) and would let a Member attribute to others. Filter `useCollaborators()` by
`email` — **rejected**: fragile past the 100-row `DROPDOWN_PAGE_SIZE` clamp.
**Rationale.** Cheapest, correct-UX, reversible path. **This is the one real risk** (medium
confidence — no `/collaborators/me` endpoint, no frontend-visible `UserResponse↔CollaboratorResponse`
id contract). **Verify in PR4 human/EAS smoke**: create a session as a Member, confirm the
collaborator attribution surfaces correctly on web. **Fallback if wrong**: request
`/collaborators/me` from the API team (cross-repo) — do not ship the any-collaborator dropdown.

### D7 — Write-gating via `onlineManager` + `OfflineBanner`; reads from persisted cache
**Choice.** Every mutation (create session/detail/comment, patch treatment/session status) gates on
`onlineManager.isOnline()` — submit disabled + `OfflineBanner` shown when offline. Reads flow
through `QueryBoundary`, served from the encrypted MMKV cache offline (automatic — #4's
`PersistQueryClientProvider`, no dehydrate filter).
**Alternatives.** An optimistic offline write queue — **rejected**: out of #6 scope; risks stale/
conflicting PHI writes. Rely on API failure alone — **rejected**: wasted taps, ambiguous PHI-write
state.
**Rationale.** Reuses #4's foundation (`connectivity.ts` NetInfo→onlineManager, `OfflineBanner`
subscriber). Reads-offline is satisfied by persistence; writes are explicitly blocked with clear
feedback — the correct minimal behavior for intermittent rural connectivity.

### D8 — Nav: repurpose `Home` → `Pacientes` + a patients native-stack
**Choice.** Rename the `Home` placeholder tab to `Pacientes` and mount a nested
`PatientsStackNavigator` (native-stack): `PatientsList` → `PatientDetail` (+ `CreateSession` as a
`presentation:'modal'` route). `PatientsStackParamList = { PatientsList: undefined; PatientDetail:
{ patientId: string }; CreateSession: { patientId: string } }`. `headerShown:false` on the tab to
avoid a double header (the stack owns chrome) — same idiom as `MoreStack`.
**Alternatives.** Add a 2nd tab and keep `Home` — **rejected**: `Home` is an empty placeholder
whose own comment says real screens land "once auth #5 + feature APIs exist" = now; a real
`Inicio/Ruta` dashboard needs #10 work-route data — defer, don't stub a 2nd placeholder.
**Rationale.** Mirrors the existing `MoreStack` pattern exactly; no new nav concept. Bottom tabs
become **Pacientes + Más**.

### D9 — Spanish-first i18n keys
**Choice.** Extend `i18n/locales/es.json` with a `patients` namespace (list/search/detail, tab
labels, form labels, actions) + centralized enum-label maps (`attentionType`, `treatmentStatus`,
`sessionStatus`, `commentType`). Enum **values** stay API-canonical (PascalCase) in payloads; only
labels are translated. All copy via `useTranslation()`.
**Alternatives.** Hard-code Spanish in screens — **rejected**: every #4/#5 shared component uses
`t()`; hard-coding breaks the convention and scatters copy.
**Rationale.** Consistent with the existing es.json structure; one enum-label map shared by the
segmented control, chips, and form selects.

---

## Screen tree

```
Tab.Navigator (bottom tabs)
├── Pacientes  (was Home, D8) → PatientsStackNavigator (native-stack)
│     ├── PatientsListScreen          usePatients(page) → FlatList + search; row → PatientDetail({patientId})
│     ├── PatientDetailScreen         usePatientFullSummary(id) → SegmentedControl<TabId> (D3)
│     │     ├── [Overview]   OverviewTab   — read-only patient summary (AssignedDoctors NOT surfaced — Owner-only on web)
│     │     ├── [Treatments] TreatmentsTab — useTreatments list + usePatchTreatmentStatus
│     │     │                                 + inline create-detail panel (useCreateTreatmentDetail, RHFDateField mode=date)
│     │     │                                 + inline treatment-comment panel (useCreateTreatmentComment)   [no delete, D2]
│     │     ├── [Sessions]   SessionsTab   — useSessions list + inline status-patch panel (usePatchSessionStatus)
│     │     │                                 → "Nueva sesión" opens CreateSessionScreen (modal)             [no delete, D2]
│     │     └── [Comments]   CommentsTab   — summary.comments list + inline create panel (useCreatePatientComment)  [no delete, D2]
│     └── CreateSessionScreen (modal)   RHF + createSessionSchema: attentionType, sessionDate (datetimepicker),
│                                       locationMode toggle → clinic|workRoute picker, duration/notes;
│                                       collaboratorId = self (D6); write-gated (D7)
└── Más → MoreStackNavigator  (unchanged, #5)
```

Form surfaces: the large **create-session** form is a stack **modal screen** (many fields + conditional +
date picker → benefits from full screen). The smaller **create-detail / add-comment / status-patch**
forms are **inline toggled panels** inside their tab (mirrors web's dashed-panel idiom) — no extra nav.

---

## Code sketches

**`core/schemas/session.schema.ts`** (verbatim hoist; shared by web + mobile)
```ts
import { z } from 'zod'
export const createSessionSchema = z
  .object({
    collaboratorId: z.string().min(1, 'Collaborator is required'), // mobile pre-fills = user.id (D6)
    attentionType: z.enum(['Medical', 'EducationalReinforcement']),
    sessionDate: z.string().min(1, 'Date is required'),
    durationMinutes: z.string().optional(),
    notes: z.string().optional(),
    locationMode: z.enum(['clinic', 'workRoute']),
    clinicId: z.string().optional(),
    workRouteId: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.locationMode === 'clinic' && !d.clinicId)
      ctx.addIssue({ code: 'custom', path: ['clinicId'], message: 'Clinic is required' })
    if (d.locationMode === 'workRoute' && !d.workRouteId)
      ctx.addIssue({ code: 'custom', path: ['workRouteId'], message: 'Work route is required' })
  })
export type CreateSessionFormData = z.infer<typeof createSessionSchema>

export const sessionStatusSchema = z.object({
  status: z.enum(['Scheduled', 'Completed', 'Missed']),
  durationMinutes: z.string().optional(),
  notes: z.string().optional(),
})
export type SessionStatusFormData = z.infer<typeof sessionStatusSchema>
```

**Web rewire — `apps/web/src/pages/patients/SessionsTab.tsx`** (mechanical; behavior unchanged)
```diff
- import { z } from 'zod'
+ import { createSessionSchema, sessionStatusSchema,
+   type CreateSessionFormData, type SessionStatusFormData } from 'core/schemas/session.schema'
- const createSchema = z.object({ ... }).superRefine(...)   // DELETE inline (was lines 33-51)
- type CreateForm = z.infer<typeof createSchema>
- const statusSchema = z.object({ ... })                    // DELETE inline (was lines 54-58)
- type StatusForm = z.infer<typeof statusSchema>
+ type CreateForm = CreateSessionFormData        // local aliases keep the component body untouched
+ type StatusForm = SessionStatusFormData
  // zodResolver(createSchema) → zodResolver(createSessionSchema); zodResolver(statusSchema) → zodResolver(sessionStatusSchema)
```
(Analogous: `TreatmentsTab` `detailSchema`+`commentSchema` → core; `CommentsTab` `schema` → core `commentSchema`.)

**RN field wrapper (new pattern, D4) — `components/shared/form/RHFTextInput.tsx`**
```tsx
export function RHFTextInput({ control, name, ...props }: { control: Control<any>; name: string } & TextInputProps) {
  return (
    <Controller control={control} name={name} render={({ field, fieldState }) => (
      <View>
        <TextInput value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} {...props} />
        {fieldState.error && <Text style={styles.err}>{fieldState.error.message}</Text>}
      </View>
    )} />
  )
}
```

**`screens/patients/PatientsListScreen.tsx`** (usePatients + QueryBoundary + list)
```tsx
export function PatientsListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<PatientsStackParamList>>()
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const { data, isLoading, isError } = usePatients(page)   // no server search param → client-side filter
  return (
    <View style={styles.container}>
      <OfflineBanner />
      <TextInput style={styles.search} placeholder={t('patients.search')} value={q} onChangeText={setQ} />
      <QueryBoundary isLoading={isLoading} isError={isError} data={data} isEmpty={(d) => d.items.length === 0}>
        {(d) => (
          <FlatList
            data={d.items.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q.toLowerCase()))}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => nav.navigate('PatientDetail', { patientId: item.id })}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
              </Pressable>
            )}
            onEndReached={() => data && page < data.totalPages && setPage((p) => p + 1)}
          />
        )}
      </QueryBoundary>
    </View>
  )
}
```

**`screens/patients/PatientDetailScreen.tsx`** (segmented control, D3)
```tsx
type TabId = 'overview' | 'treatments' | 'sessions' | 'comments'
const TABS: { id: TabId; labelKey: string }[] = [/* patients.tab.* */]
export function PatientDetailScreen({ route }: { route: RouteProp<PatientsStackParamList, 'PatientDetail'> }) {
  const { patientId } = route.params
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('overview')
  const { data, isLoading, isError } = usePatientFullSummary(patientId)
  return (
    <View style={styles.container}>
      <OfflineBanner />
      <View style={styles.segment}>
        {TABS.map((x) => (
          <Pressable key={x.id} onPress={() => setTab(x.id)} style={[styles.pill, tab === x.id && styles.pillActive]}>
            <Text style={tab === x.id ? styles.pillTextActive : styles.pillText}>{t(x.labelKey)}</Text>
          </Pressable>
        ))}
      </View>
      <QueryBoundary isLoading={isLoading} isError={isError} data={data}>
        {(summary) => (
          <>
            {tab === 'overview' && <OverviewTab summary={summary} />}
            {tab === 'treatments' && <TreatmentsTab patientId={patientId} />}
            {tab === 'sessions' && <SessionsTab patientId={patientId} />}
            {tab === 'comments' && <CommentsTab patientId={patientId} comments={summary.comments} />}
          </>
        )}
      </QueryBoundary>
    </View>
  )
}
```

**`screens/patients/CreateSessionScreen.tsx`** (RHF + zodResolver + locationMode toggle + datetimepicker + online gate)
```tsx
export function CreateSessionScreen({ route, navigation }: CreateSessionProps) {
  const { patientId } = route.params
  const userId = useAuthStore((s) => s.user!.id)                        // D6: collaboratorId = self
  const [online, setOnline] = useState(() => onlineManager.isOnline())  // D7
  useEffect(() => onlineManager.subscribe(() => setOnline(onlineManager.isOnline())), [])
  const createSession = useCreateSession(patientId)
  const { control, handleSubmit } = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { collaboratorId: userId, attentionType: 'Medical', sessionDate: '',
      durationMinutes: '', notes: '', locationMode: 'clinic', clinicId: '', workRouteId: '' },
  })
  const locationMode = useWatch({ control, name: 'locationMode' })
  const onSubmit = async (d: CreateSessionFormData) => {
    await createSession.mutateAsync({
      collaboratorId: d.collaboratorId,
      clinicId: d.locationMode === 'clinic' ? d.clinicId || null : null,
      workRouteId: d.locationMode === 'workRoute' ? d.workRouteId || null : null,
      attentionType: d.attentionType,
      sessionDate: new Date(d.sessionDate).toISOString(),               // mirror web
      durationMinutes: d.durationMinutes ? parseInt(d.durationMinutes, 10) : null,
      notes: d.notes || null,
    })
    navigation.goBack()
  }
  return (
    <ScrollView>
      <OfflineBanner />
      <RHFSelect control={control} name="attentionType" options={ATTENTION_TYPE_OPTIONS} />
      <RHFDateField control={control} name="sessionDate" mode="datetime" />
      <RHFSelect control={control} name="locationMode" options={LOCATION_MODE_OPTIONS} />
      {locationMode === 'clinic'
        ? <RHFPickerField control={control} name="clinicId" useOptions={useClinicOptions} />
        : <RHFPickerField control={control} name="workRouteId" useOptions={useWorkRouteOptions} />}
      <RHFTextInput control={control} name="durationMinutes" keyboardType="number-pad" />
      <RHFTextInput control={control} name="notes" multiline />
      <Pressable disabled={!online || createSession.isPending} onPress={handleSubmit(onSubmit)}>
        <Text>{/* patients.session.save */}</Text>
      </Pressable>
    </ScrollView>
  )
}
```

**Status-patch form (inline panel — sessions & treatments share the shape)**
```tsx
function SessionStatusForm({ session, patientId, onDone }: { session: AttentionSessionResponse; patientId: string; onDone: () => void }) {
  const patch = usePatchSessionStatus(patientId)
  const online = useOnline()   // small hook over onlineManager.subscribe (D7)
  const { control, handleSubmit } = useForm<SessionStatusFormData>({
    resolver: zodResolver(sessionStatusSchema),
    defaultValues: { status: session.status, durationMinutes: session.durationMinutes?.toString() ?? '', notes: session.notes ?? '' },
  })
  const onSubmit = (d: SessionStatusFormData) =>
    patch.mutateAsync({ sessionId: session.id, data: {
      status: d.status,
      durationMinutes: d.durationMinutes ? parseInt(d.durationMinutes, 10) : null,
      notes: d.notes || null } }).then(onDone)
  return (/* RHFSelect status + RHFTextInput duration/notes; submit disabled={!online || patch.isPending} */)
}
// treatment status uses usePatchTreatmentStatus(patientId, treatmentId).mutate(status) — raw string, pill row like web.
```

---

## Build / PR sequence (4 chained PRs, ≤400 lines each, lockfile excluded)

| PR | Scope | Verification gates |
|----|-------|--------------------|
| **PR1 — Core schema hoisting** | `core/schemas/{treatmentDetail,session,comment}.schema.ts`; rewire the 3 web tabs to import them (drop inline; keep `treatmentSchema` inline) | `pnpm --filter core exec tsc -b`; **`pnpm --filter web build` + `pnpm --filter web lint`** (shared-file regression guard) |
| **PR2 — Deps + Pacientes tab + list + detail shell** | add RHF/resolvers/datetimepicker; RN form wrappers; `TabNavigator` Home→Pacientes; `PatientsStack`; `PatientsListScreen`; `PatientDetailScreen` + segmented control + `OverviewTab`; es.json base | `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export` |
| **PR3 — Treatments + Details tab** | `TreatmentsTab` (list + `usePatchTreatmentStatus`) + inline create-detail (`useCreateTreatmentDetail`, `RHFDateField` mode=date) + inline treatment-comment (`useCreateTreatmentComment`) | typecheck/doctor/export; smoke: create detail + patch treatment status → surfaces on web |
| **PR4 — Sessions tab + patient Comments tab** | `SessionsTab` + `CreateSessionScreen` (locationMode + datetimepicker + `collaboratorId=self`) + status patch (no delete); `CommentsTab` (`useCreatePatientComment`) | typecheck/doctor/export; smoke: **create session as Member → confirm collaborator attribution (resolves D6)**; patch session status; add comment; offline read-cache round-trip |

PR2 depends on PR1; PR3 depends on PR2; PR4 depends on PR3. Web depends on neither (PR1 regression-guarded only). One work unit per PR, conventional commits.

---

## Verification

- **Typecheck/build (gating, no test runner — `strict_tdd:false`):** `pnpm --filter core exec tsc -b`;
  **`pnpm --filter web build` + `pnpm --filter web lint`** (schemas are shared — the web-regression
  guard); `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export`.
- **Human/EAS smoke vs local API :5080:** create a session **as a Member** and confirm the
  collaborator attribution surfaces correctly on web (**resolves D6**); create a treatment detail and
  patch treatment + session status; add a patient and a treatment comment — confirm all surface on
  web. **Offline round-trip:** kill connectivity, reopen a viewed patient → renders from the MMKV
  cache with `OfflineBanner`; confirm all mutation submit buttons are disabled while offline.
- **Risk watch:** D6 attribution (the one real open risk); D5 datetimepicker Expo SDK 55 compat at
  `expo-doctor`/`export`; Metro resolving core's new raw-TS `schemas/*` subpaths at `expo export`.

## Rollback

- **PR1 (core schema hoisting)** is backward-compatible: web imports are rewired in the *same* PR, so
  no half-migrated state ships; revert restores the inline schemas atomically.
- **PR2–PR4 (mobile)** are **purely additive** — new screens + a repurposed placeholder tab + RN form
  wrappers, with no change to #5 auth or core runtime behavior. Revert the branch
  (`feat/mobile-patients-progress`) to remove the feature with no data or contract impact; each chained
  PR reverts independently. `pnpm install` regenerates the lockfile.

## Open questions

**D6 (`collaboratorId = self`)** is the only unresolved item — a *working assumption* to confirm in
PR4 human/EAS smoke, not a blocker to design/apply. Fallback if attribution is wrong: request
`/collaborators/me` from the API team (cross-repo). All other proposal positions are ratified.
