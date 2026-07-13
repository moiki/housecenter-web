# Tasks: Mobile Consultations

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | PR1 ~250–290; PR2 ~250–300 (styles/imports inflate the terse design sketches) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | 2 PRs (per design's Build/PR sequence) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

**Basis:** PR1 = schema (~15) + `TabNavigator` 3rd-tab/stack addition (~25, sized against
#6/#7 stack wiring) + `ConsultationsListScreen` (~45 w/ styles) + `ConsultationDetailScreen`
thread/compose/resolve **without attach** (~85 w/ styles; design sketch is 75 lines *with*
attach logic — removing staged/upload adds back via styles/imports) + es.json (~18) ≈ 258
lines. PR2 = `CreateConsultationScreen` (~95 w/ styles vs. 44-line terse sketch) +
`PatientsStack` route (~8) + `PatientDetailScreen` button + `NativeStackScreenProps` switch
(~25) + `pickAndUpload.ts` split (~35 diff) + `MessageAttachmentThumb` (~20) +
`ConsultationDetailScreen` attach additions (staged state/effect/handler/UI, ~55) + es.json
(~15) ≈ 253 lines. Both land under 400 individually (matches design's own "each ≤400 lines"
claim) — Medium not High, but PR2 crosses the most concerns (create form + doctor picker +
attach split + new thumb component). **Swing factor:** if attach UI/styling grows during
apply, split PR2 into **2a** (create screen + escalate button) and **2b** (reply-attach +
`MessageAttachmentThumb`) — each independently green and revertable.

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| 1 | Core schema + Consultas tab/list/thread (no attach) | PR1 | Touches shared `packages/core` → web build/lint regression is mandatory, not optional |
| 2 | Create screen + reply-time attachments | PR2 | Depends on PR1 merged (extends `ConsultationDetailScreen`, adds `PatientsStack`/`PatientDetailScreen` changes); split into 2a/2b if >400 lines |

---

## Phase 1: Core schema + Consultas tab + list + thread — PR1

- [x] 1.1 `packages/core/src/schemas/consultation.schema.ts` — new: `createConsultationSchema`
      (title/firstMessage/assignedDoctorId all `.trim().min(1)`, `treatmentId: z.null()`) +
      `postMessageSchema` (body `.trim().min(1)`); web's inline schemas untouched (R1)
- [x] 1.2 Gate: `pnpm --filter core exec tsc -b` exits 0 (R1)
- [x] 1.3 **Mandatory** gate: `pnpm --filter web build` + `pnpm --filter web lint` green — shared
      core regression, non-negotiable since `packages/core` is consumed by web (R1, R10)
- [x] 1.4 `apps/mobile/src/navigation/TabNavigator.tsx` — add `ConsultationsStackParamList`,
      `ConsultationsStackNavigator` (List→Detail), 3rd bottom tab "Consultas" (order:
      Pacientes/Consultas/More) (R2) — implemented as a standalone `ConsultationsStack.tsx`
      (mirrors `PatientsStack.tsx`'s file idiom) rather than inline in `TabNavigator.tsx` like
      `MoreStack`; `TabNavigator.tsx` imports and wires it. See Deviations.
- [x] 1.5 `apps/mobile/src/screens/consultations/ConsultationsListScreen.tsx` — new:
      `useConsultations(filters)` (server role-filters, no client re-filter), wrapped in
      `QueryBoundary`/`EmptyState`, row tap → `navigate('ConsultationDetail', {consultationId})`,
      no standalone "+" (R3)
- [x] 1.6 `apps/mobile/src/screens/consultations/ConsultationDetailScreen.tsx` — new:
      `useConsultationDetail(id)` thread rendered oldest-first (author, timestamp, body); NO
      attachments/thumbs yet — added in PR2 (R4)
- [x] 1.7 Same file — compose bar wired to `usePostMessage(id)`, disabled when
      `consultation.status === 'Resolved'`; no manual Open/UnderReview control anywhere (R4)
- [x] 1.8 Same file — "Marcar resuelta" wired to `useUpdateConsultationStatus(id)` rendered
      ONLY when `useAuthStore().user.id === consultation.assignedDoctorId` (R4, R8 — scoped
      exception, do NOT generalize to other Doctor mobile capabilities)
- [x] 1.9 Same file — gate compose-submit and resolve actions on `useOnline()` +
      `OfflineBanner` (reads still render from persisted cache while offline) (R9)
- [x] 1.10 `apps/mobile/src/i18n/locales/es.json` — add `nav.consultations` +
      `consultations.{title,detailTitle,status.*,empty,messagePlaceholder,send,resolve,
      resolvedHint}`, Spanish-first (R10)
- [x] 1.11 Gates: `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`
      (R2–R4, R8, R9) — all green, see apply-progress for full output.

**PR1 done when:** core `tsc -b` + web build/lint + mobile `tsc --noEmit`/`expo-doctor`/
`expo export` all green; code trace confirms "Marcar resuelta" gated on
`user.id===assignedDoctorId` and no manual status control exists anywhere. Human/EAS smoke
(needs dev/CI env — live API `:5080` + dev client + a Doctor-role account):
**doctor-reply-auto-under-review**, **resolve-only-assigned-doctor**, **offline** (list/thread
scenarios, R9).

## Phase 2: Create + reply attachments — PR2

- [ ] 2.1 `apps/mobile/src/navigation/PatientsStack.tsx` — add `CreateConsultation:
      {patientId}` route (`presentation:'modal'`) to `PatientsStackParamList` (R5)
- [ ] 2.2 `apps/mobile/src/screens/consultations/CreateConsultationScreen.tsx` — new: RHF +
      `zodResolver(createConsultationSchema)`, doctor `RHFSelect` sourced from
      `usePatientFullSummary(patientId).assignedDoctors` (never a global doctor list),
      title + firstMessage fields (R5)
- [ ] 2.3 Same file — always send `treatmentId: null` + `attachmentUrl: null`; **zero-assigned-
      doctors guard**: disable/hide the escalate action with an explanatory Spanish message,
      no doctor picker rendered with zero options (R5)
- [ ] 2.4 Same file — `useCreateConsultation().mutateAsync(...)`, `navigation.goBack()` on 201;
      on 403 match `consultations.not_patient_collaborator` via `isApiError` (confirm mobile
      can import `isApiError` from core) → friendly Spanish `Alert`, stay on form, no crash,
      no client-side collaborator pre-gate (R7)
- [ ] 2.5 `apps/mobile/src/screens/patients/PatientDetailScreen.tsx` — switch screen typing to
      `NativeStackScreenProps` (to get `navigation`); add "Escalar a Doctor" button →
      `navigate('CreateConsultation', {patientId})`, shown unconditionally, disabled when
      `assignedDoctors.length===0` with hint text (R5, R7)
- [ ] 2.6 `apps/mobile/src/components/attachments/pickAndUpload.ts` — split out
      `pickPhoto(source)` (permission + pick + manipulate → `AttachmentPayload`, no upload);
      `pickAndUpload` becomes a thin wrapper (`pickPhoto` then upload) — existing Patient/
      Treatment callers' signature and return contract unchanged (R6)
- [ ] 2.7 `apps/mobile/src/components/attachments/MessageAttachmentThumb.tsx` — new, read-only:
      `useAttachments('ConsultationMessage', messageId)` + `AuthedImage`, renders `null` when
      empty; render one per message bubble in `ConsultationDetailScreen` (R4, R6)
- [ ] 2.8 `ConsultationDetailScreen.tsx` — add optional `pickPhoto` stage to the compose bar;
      staged preview via **plain `<Image uri={staged.uri}>`, NOT `AuthedImage`** (local file
      URI, not an authed download URL) (R6)
- [ ] 2.9 Same file — on send: `usePostMessage.mutateAsync` → on success
      `setUploadTargetId(newMsg.id)`; a `useUploadAttachment('ConsultationMessage',
      uploadTargetId)` hook wired at component level + a `useEffect([uploadTargetId])` fires
      the upload. **Rules-of-hooks constraint: do NOT call
      `useUploadAttachment(...).mutateAsync()` inline inside the send handler** — `ownerId` is
      baked into the hook at render time, so the id-dependent upload must be effect-driven (R6)
- [ ] 2.10 Same file — clear staged payload + `uploadTargetId` when the upload settles;
      invalidate/refetch the detail query so the new message's thumbnail appears (R6)
- [ ] 2.11 `apps/mobile/src/i18n/locales/es.json` — add `consultations.{doctor,title,
      firstMessage,create,createTitle,escalate,noDoctors,notCollaborator,attach}`,
      Spanish-first (R5, R10)
- [ ] 2.12 Gates: `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`,
      `npx expo export`, `pnpm --filter web build` (regression unaffected by PR2 — no core
      change in this PR) (R1–R10)

**PR2 done when:** mobile tsc/expo-doctor/expo export green, web build still green; code
trace confirms the zero-doctors guard, the 403 friendly-error path, and the
`uploadTargetId`+effect pattern (not inline `mutateAsync`). Human/EAS smoke (needs dev/CI
env — live API `:5080` + dev client + a Doctor-role account for the reply/resolve paths):
**create-consultation**, **escalate-not-collaborator-403**, **attach-photo-to-reply**. Web
renders no consultation attachments — verify uploaded thumbnails via the API directly, not
the web UI.

---

## Risks / Notes Carried From Design

- **Rules-of-hooks reply-attach**: `uploadTargetId` state + effect is mandatory; calling
  `useUploadAttachment(...).mutateAsync()` inline in the send handler is invalid (hook bakes
  `ownerId` at render). Flag in review if PR2 deviates from this pattern.
- **Staged preview** uses a plain `<Image>` on the picked local URI — `AuthedImage` is for
  authed download URLs (historical thumbs) only, not the pre-upload local file.
- **`PatientDetailScreen`** must move to `NativeStackScreenProps` before the "Escalar a
  Doctor" button can call `navigation.navigate(...)`.
- Confirm mobile can import `isApiError` from `packages/core` for the 403
  `not_patient_collaborator` match (blocking dependency for task 2.4).
- **Doctor scoped exception (R8)** is intentionally narrow — reply/resolve on assigned
  consultations only. Do not let apply generalize this into any other Doctor/Admin mobile
  capability.
- `strict_tdd:false` — no test runner; verification is `tsc`/`expo-doctor`/`expo export`/web
  build + code trace. 6 of 15 spec scenarios are **Human/EAS smoke** (create,
  escalate-not-collaborator-403, doctor-reply-auto-under-review, attach-photo-to-reply,
  resolve-only-assigned-doctor, offline-write-blocked) — sdd-apply should report these as
  "needs dev/CI env" rather than attempt to automate them.
