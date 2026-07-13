# EAS Release Runbook — HouseCenter Mobile

This is the Human/ops checklist to take `apps/mobile` from **code-ready** (all of changes #1–#11
merged, `tsc`/`expo-doctor`/`expo export` all green) to an **actual store release**. Nothing below
is automatable by `sdd-apply` — every item requires real credentials, real devices, or a deployed
backend. Follow the phases in order; each phase's prerequisites are noted.

**Framing reminder**: "change #11 done" means **code-readiness**, not a shipped app. Every item
below is a Human/ops action outside this repo's automatable surface, and none of them were
attempted as part of implementing this change.

## Phase 0 — Before you start

- [ ] Confirm all of changes #1–#11 (the full HouseCenter Mobile plan) are merged to `main`.
- [ ] Confirm `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, and `npx expo export`
      are all green on `main` — the last automated gate before any step below.

## Phase 1 — Backend/API readiness (blocks everything below)

- [ ] Deploy the production API to the URL `eas.json`'s `production` build profile points at
      (`https://api.housecenter.net`), including every endpoint shipped across changes #1–#10 —
      in particular `GET /collaborators/me` (change #10, required for Ruta del día / Reportes to
      resolve real data instead of their honest empty-state fallback).
- [ ] Set the backend's `Push:CredentialsJson` configuration (change #9) with real FCM/APNs
      credentials. Without this, `FirebasePushSender.cs` cannot deliver any push notification —
      even though the mobile client will register device tokens successfully. This is a silent,
      backend-only failure mode: nothing on the mobile side will surface it.

## Phase 2 — Branded artwork & store assets (design)

- [ ] Replace the 3 placeholder PNGs shipped in change #11/PR1 —
      `apps/mobile/assets/icon.png`, `adaptive-icon.png` (1024x1024, currently solid `#2563eb`),
      and `splash.png` (1284x2778, currently solid `#ffffff`) — with final branded artwork. Keep
      the same file paths/dimensions, or update `app.config.ts`'s `icon` / `android.adaptiveIcon`
      fields and the `expo-splash-screen` plugin entry if they change.
- [ ] Produce App Store + Google Play store screenshots across each store's required device-size
      matrix.

## Phase 3 — EAS/store credentials (ops)

- [ ] Apple Developer Program account (ops-owned, paid) + generate an App Store Connect API key;
      register it with `eas credentials` for iOS signing.
- [ ] Google Play Console account + a service-account JSON key for automated submission; register
      it with `eas credentials` / `eas submit` for Android.
- [ ] Obtain `google-services.json` from the Firebase project (change #9) and set the
      `GOOGLE_SERVICES_JSON` env var (or the path your CI/EAS build profile expects) so
      `app.config.ts`'s conditional `android.googleServicesFile` resolves at build time. This is
      silent when missing — the build still succeeds, but Android push-token registration fails
      at runtime.
- [ ] Configure the APNs push key/certificate via `eas credentials` for iOS (change #9) — required
      for native push tokens to be issued on iOS.
- [ ] Populate `eas.json`'s currently-EMPTY `submit.production` block (both `ios` and `android`
      keys) with the ASC API key reference / Play service-account path, so `eas submit` doesn't
      require interactive prompts on every release.

## Phase 4 — Build

- [ ] `eas build --profile development` (or `preview`) first — confirm a fresh dev-client build
      boots cleanly with every native module this plan added (`expo-screen-capture`,
      `expo-splash-screen`, `expo-notifications`, `@react-native-community/datetimepicker`,
      `expo-image-picker`, `expo-image`).
- [ ] `eas build --profile production` for iOS AND Android. This is the first real EAS build since
      release-hardening (change #11) landed — local `expo export`/`expo-doctor` (used as the
      closest headless proxy during `sdd-apply`) do NOT substitute for a real build.

## Phase 5 — Device QA: this change's own Human/EAS smokes (R2, R3, R5 — see `phi-at-rest-audit.md` / `spec.md`)

- [ ] **screenshots-blocked-on-device** — on the built dev-client (or production build), attempting
      a screenshot/recording on any foregrounded screen is blocked/blackened (Android
      `FLAG_SECURE`) or obscured (iOS secure overlay).
- [ ] **screen-reader-reads-labels** — with VoiceOver (iOS) / TalkBack (Android) enabled, navigate
      the 8 files scoped by change #11's accessibility sweep (`RHFTextInput`, `RHFSelect`,
      `RHFPickerField`, `RHFDateField`, `AttachmentsSection`, `MoreScreen`, `DevicesScreen`,
      `NotificationsScreen`) and confirm every interactive element announces its configured
      label/role.
- [ ] **large-font-scaling-holds** — with the device's OS font-scale at its largest accessibility
      setting, confirm the same 8 files' touch targets stay reachable (≥44x44px) and text doesn't
      clip/overlap.
- [ ] **real-eas-build-succeeds** — confirmed by Phase 4 completing successfully for both
      platforms using the (placeholder or real) icon/splash/adaptiveIcon.

## Phase 6 — Device QA: accumulated Human/EAS smokes from changes #5–#10

Requires: a live production (or staging) API from Phase 1, a build from Phase 4, and — for
several items — specific role-seeded test accounts.

- [ ] **#5 — login persistence** (`mobile-auth-session`): cold-start silent token refresh, session
      revoke, and manual logout all behave correctly on a real device (reported as
      Human/EAS-smoke-only when that change was implemented — never automatable headlessly).
- [ ] **#6 — session attribution** (`mobile-patients-progress`): create an attention session as a
      Member with `locationMode=clinic` and a `workRoute`; confirm `collaboratorId===user.id` and
      that the attribution renders correctly on `apps/web`'s Patient Profile page. The underlying
      assumption (`AttentionSession.CollaboratorId` is actually a `User.Id`) was confirmed via
      backend code inspection during change #10's exploration — but this live device round-trip
      has not yet been run and remains the one open item for full confirmation. Also confirm
      patch-session-status, add-patient-comment, and the offline-write-then-syncs-on-reconnect
      round-trip.
- [ ] **#7 — photo upload** (`mobile-attachments-camera`): pick-from-camera, pick-from-library,
      HEIC-to-JPEG downscale, upload-with-progress, and authed-thumbnail-display all succeed on a
      real device against the live API. Watch specifically for the **D2b multipart boundary
      risk**: the client deliberately drops the hardcoded `Content-Type: multipart/form-data`
      header so React Native sets its own boundary; if a real device gets a 400 on upload, the
      documented fallback is an explicit `multipart/form-data; boundary=…` header — re-run the web
      upload regression gate if that fallback is applied (it's a shared-code change).
- [ ] **#8 — consultations** (`mobile-consultations`): create-consultation,
      escalate-to-Doctor (confirm the 403 `not_patient_collaborator` friendly-error path for
      non-collaborators), doctor-reply-auto-under-review, attach-photo-to-reply, and
      resolve-only-assigned-doctor (confirm "Marcar resuelta" is gated on
      `user.id===assignedDoctorId` with no other status-control path anywhere). The last two
      require a seeded Doctor-role test account assigned to the test consultation.
- [ ] **#9 — push notifications** (`mobile-notifications-push`): permission-prompt-and-registration,
      token-registers-subscription-post (confirm via backend logs/DB), foreground-push-received,
      tap-live-deep-links-to-consultation-detail, tap-cold-start-deep-links-to-consultation-detail
      (app fully killed), logout-unsubscribes, revoke-all-stops-push, and
      android-channel-noop-below-api26 (on an API-24/25 emulator specifically). Requires the
      FCM/APNs credentials from Phase 3 and a real device (or the API-24/25 emulator for the last
      item).
- [ ] **#10 — Ruta del día / reports** (`mobile-reports-workroutes`): confirm Ruta del día renders
      real route/patient data (not the honest-empty-state fallback) once `GET /collaborators/me`
      is live; confirm "Open in Maps" deep links launch the device's map app for each route stop;
      confirm the Reportes tab's session-period report is scoped correctly per role (Member vs.
      Admin/Doctor/Sponsor). Requires a seeded Member account whose auth email matches a
      `Collaborator` row with a `workRouteId`.

## Phase 7 — Submit & store listing

- [ ] `eas submit` for iOS and Android, using the credentials populated in Phase 3.
- [ ] Store listing metadata: app name/description (Spanish-first, matching this app's i18n
      convention), category, support URL/email, age rating questionnaire.
- [ ] Privacy/data-safety disclosures (Apple "App Privacy" / Google "Data safety" forms) — both
      stores require disclosing what data is collected. Use `phi-at-rest-audit.md`'s inventory
      (Section 1) as the source of truth for what this app actually stores and where.
- [ ] Submit both apps for store review.
