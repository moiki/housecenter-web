# Verify Report — Mobile Attachments & Camera

**Change**: mobile-attachments-camera
**Mode**: Standard (`strict_tdd: false` — verified via tsc/expo-doctor/expo-export/web-build + adversarial code review; camera/upload/download round-trips are Human/EAS-smoke-only)
**Date**: 2026-07-13
**Verified**: `feat/mobile-attachments-camera` @ `fd3060a` (independently re-run, apply reports not trusted; working tree clean)

## Verdict

**PASS WITH WARNINGS** — 0 CRITICAL / 2 WARNING / 5 SUGGESTION.

All headless gates independently reproduced green; the core File-debt fix + the mobile photo pipeline match spec R1–R13 and design D1–D8, including the adversarial checks (web `AttachmentsTab.tsx` byte-unchanged; no hardcoded `Content-Type`; `file` mutation key preserved; no AttentionSession attachment). The 2 warnings are the unavoidable Human/EAS runtime gap (esp. the D2b RN multipart-boundary behavior).

## Requirements checklist (R1–R13)

R1 `AttachmentPayload` type ✅ · R2 `upload(payload)` + single `payload as any` cast (grep count=1) ✅ · R3 `useUploadAttachment` retyped, **`file` mutation key kept (D1b)** ✅ · R4 web build/lint green + `AttachmentsTab.tsx` byte-unchanged (`git diff main` empty) ✅ · R5 mobile deps (expo-image-picker/manipulator/image ~55) ✅ · R6 config plugin + Spanish permission strings ✅ · R7 capture (camera/library, images-only, permission handling) ✅ (headless-structural; hardware = smoke) · R8 ALWAYS-manipulate → JPEG + ~1600px + ~0.75 (manipulate/resize/renderAsync/saveAsync verified vs installed 55.0.18 `.d.ts`) ✅ · R9 axios upload w/ progress, `useOnline`-gated ✅ · R10 `AuthedImage` via expo-image `source.headers` (Bearer from auth store, `env.API_BASE_URL + downloadUrl`) ✅ · R11 reusable `AttachmentsSection(ownerType,ownerId)` — exactly 2 usage sites (Patient tab + Treatment nested), no AttentionSession ✅ · R12 Fotos 5th tab (Patient) ✅ · R13 Spanish-first + web green ✅.

## Independent verification results

| Command | Result |
|---|---|
| `pnpm install` | clean, single react@19.2.7 |
| `pnpm --filter core exec tsc -b` | exit 0 |
| `pnpm --filter mobile exec tsc --noEmit` | exit 0 |
| `npx expo-doctor` | 19/19 |
| `npx expo export` | ran twice, byte-identical bundle hashes; no unresolved imports (ios ~1118-1126 / android 1202 modules) |
| `pnpm --filter web build` + `lint` | GREEN (1465 modules) |
| `git diff main -- apps/web/.../AttachmentsTab.tsx` | **EMPTY (byte-unchanged)** — the D1/D1b regression guard |
| grep hardcoded Content-Type in upload path | none (D2b confirmed) |
| grep `mutateAsync({ file` | present on both web + mobile call sites (D1b) |
| `git status` / `git log main..` | clean; docs + 3 slice commits |

## Scenario coverage (14)

9/14 proven headless (core-payload-typechecks, web-build-unbroken, mobile-typechecks, expo-doctor-clean, expo-export-bundles, fotos-tab-renders, delete-attachment [code-trace], offline-upload-blocked [code-trace], attentionsession-attach-absent). 5/14 **pending Human/EAS smoke** (pick-camera, pick-library, heic-to-jpeg-downscale, upload-with-progress, authed-thumbnail-displays) — need a device camera + API `:5080` + storage; not fabricated. (+ the PR2 treatment-attach smoke.)

## Findings

**CRITICAL**: None.

**WARNING**:
1. **5 Human/EAS smoke scenarios (+ treatment smoke) unexecuted** — no camera hardware / running API headless. Correctly reported pending; mandatory before production/EAS-build promotion.
2. **D2b RN multipart-boundary is structurally correct (header removed) but functionally unverified** — the single highest-risk item; only the real-device `upload-with-progress` smoke resolves it. If a device 400s, the fallback (per design.md) is setting an explicit `multipart/form-data; boundary=…` for the RN path (then re-run the web regression gate).

**SUGGESTION** (5, per engram obs #567): incl. pagination/list-widget reuse, `expo-image` optional `disableLibdav1d` Podfile flag as an escape hatch if iOS AV1 issues surface, and minor i18n/styling consistency notes — none blocking.

## Documented deviations reviewed

`pickAndUpload` return widened to a 3-way discriminator (`uploaded|canceled|permission-denied`) so the section can show a Spanish permission-denied alert — accepted (design's `Promise<void>` couldn't signal the reason). `sectionLabel` + bordered `photosPanel` wrapper on the Treatment section for visual consistency with Details/Comments — accepted (no logic change). `expo-image` `disableLibdav1d` not added (expo-doctor clean without it) — accepted.

## Recommendation

**PASS.** No CRITICAL issues; everything statically verifiable is green, the core fix is backward-compatible (web byte-unchanged), and the Member scope is exactly as ratified (Patient + Treatment; AttentionSession deferred). Before production/EAS promotion, run the Human/EAS smoke on a dev client vs local API `:5080` — **prioritizing the D2b real-device multipart upload** (a real iPhone HEIC photo → JPEG <10MB upload with progress → Bearer-gated thumbnail displays; delete syncs to web; treatment attach works). If the multipart upload 400s, apply the explicit-boundary fallback.
