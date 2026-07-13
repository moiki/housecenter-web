# Verification Report — mobile-release-hardening (Change #11, FINAL)

**Mode**: Standard (strict_tdd: false for `apps/mobile` — no test runner; verified via
tsc/expo-doctor/expo export/grep/code-trace, matching `apps/web` convention).
**Scope verified**: PR1 (committed `b436c7f`) + PR2 (uncommitted working-tree docs, `tasks.md`
checkbox flips). `git diff main` = the full change. All findings below are independently
re-derived — the apply/tasks reports were NOT trusted as source of truth.

---

## Completeness

| Metric | Value |
|---|---|
| Tasks total | 22 |
| Tasks complete `[x]` | 22 |
| Tasks incomplete `[ ]` | 0 |

All 22 tasks (19 PR1 + 3 PR2) independently confirmed complete via `grep -c` on `tasks.md`.

---

## Gate Execution (real commands, real exit codes)

| Gate | Command | Result |
|---|---|---|
| Install | `pnpm install` | Exit 0. Single react copy confirmed: `node --require.resolve` from both `apps/web` and `apps/mobile` context resolves to the same root `node_modules/react/index.js` (hoisted linker). |
| Core build | `pnpm --filter core exec tsc -b` | **Exit 0**. `git diff main -- packages/core` → **EMPTY** (0 lines), before and after the build. |
| Web build | `pnpm --filter web build` | **Exit 0**. 1465 modules, pre-existing chunk-size warning only (unrelated). |
| Web lint | `pnpm --filter web lint` | **Exit 0**, zero output. |
| Web diff | `git diff main -- apps/web` | **EMPTY** (0 lines), confirmed after build+lint ran. |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | **Exit 0**, zero output. |
| expo-doctor | `npx expo-doctor` | **19/19 checks passed. No issues detected.** |
| expo export | `rm -rf dist && npx expo export --clear` | **Exit 0.** iOS: 1283 modules bundled. Android: 1291 modules bundled. No unresolved imports. 24 static assets exported cleanly. `dist/` removed post-verification (build artifact, not part of the change). |

All gates GREEN. No fabrication — every number above came from a real command run in this session.

---

## Adversarial Checks (grep/read — PASS/FAIL)

1. **Core untouched + web byte-unchanged** — **PASS**. `git diff main -- packages/core apps/web` is empty (both individually and combined).

2. **PHI-teardown at all 3 sites (R1)** — **PASS**.
   - `apps/mobile/src/lib/teardown.ts`: `clearAllLocalData()` calls `clearCache()` (MMKV) + `queryClient.clear()` + `Image.clearMemoryCache()` + `await Image.clearDiskCache()` (try/catch-wrapped, best-effort). Imports only `./mmkv` + `./queryClient` + `expo-image`.
   - Grep confirms `clearAllLocalData(` is called at **exactly 3 sites**: `MoreScreen.tsx:53` (`await clearAllLocalData()` in `finally`), `AuthBootstrap.tsx:48` (`void clearAllLocalData()` in the cold-start `.catch()` — **the previously-missing gap, now fixed**: `{ logout(); void clearAllLocalData() }`), `api/client.ts:30` (`void clearAllLocalData()` in `onRefreshFail`).
   - No circular import: `mmkv.ts` and `queryClient.ts` import neither `teardown.ts` nor `api/client.ts` (confirmed by grep — zero hits).

3. **Screenshot prevention (R2)** — **PASS**. `usePreventScreenCapture()` is called in `AppProviders`'s function body (line 31), unconditionally, before the `ready`-gated early return — mounted once at the app root, not gated by auth state or screen.

4. **a11y (R3)** — **PASS**. All 8 named files read directly and confirmed:
   - `RHFTextInput.tsx`: `accessibilityLabel={label}` + `accessibilityHint={rest.placeholder}`.
   - `RHFSelect.tsx`: `accessibilityRole="button"` + `accessibilityLabel={opt.label}` + `accessibilityState` + `hitSlop={{top:8,bottom:8}}`.
   - `RHFPickerField.tsx`: trigger + option rows both get role/label; label falls back to `t('common.select')`.
   - `RHFDateField.tsx`: role/label/hint on the trigger, `display` falls back to `t('common.selectDate')`.
   - `AttachmentsSection.tsx`: role/label on take-photo/choose-library/delete `Pressable`s (all via `t(...)`); delete button gets `hitSlop={{top:10,bottom:10,left:10,right:10}}` (undersized `paddingVertical:6` button widened to ~46-48px effective touch height).
   - `MoreScreen.tsx`: role/label on all 6 nav rows + logout row, all via `t(...)`; rows already `paddingVertical:14` (~47px), no hitSlop needed (matches design).
   - `DevicesScreen.tsx`: role/label on revoke + revoke-all buttons; `hitSlop={{top:8,bottom:8,left:8,right:8}}` on the undersized revoke button only (revoke-all is borderline-44px already, no hitSlop, matches design exactly).
   - `NotificationsScreen.tsx`: role on row `Pressable`; role/label/hitSlop on mark-all.
   - Zero hardcoded a11y-only strings found — every label/hint resolves from an existing prop, `options[].label`, or `t()` call already in the component.

5. **i18n (R4)** — **PASS**. `grep -rn "'Seleccionar" apps/mobile/src --include="*.tsx" --include="*.ts"` returns **zero** hits (confirmed empty). `es.json` has `common.select: "Seleccionar"` and `common.selectDate: "Seleccionar fecha"` under the existing `common` namespace.

6. **Version/assets/config (R5)** — **PASS**.
   - `app.config.ts` `version: '1.0.0'` confirmed.
   - `assets/icon.png` and `assets/adaptive-icon.png`: valid PNG, 1024×1024 (confirmed via `file` + `sips -g pixelWidth -g pixelHeight`). `assets/splash.png`: valid PNG, 1284×2778.
   - `icon`/`android.adaptiveIcon` wired as top-level fields; `expo-splash-screen` plugin present in the `plugins` array (`grep -n "^\s*splash:"` on `app.config.ts` → **empty**, confirming NO legacy top-level `splash` key).
   - `runtimeVersion: { policy: 'appVersion' }` set.
   - `expo-screen-capture@~55.0.15` and `expo-splash-screen@~55.0.22` both SDK-pinned via `expo install` syntax in `package.json`.
   - The `expo export` gate passing green (iOS 1283 / Android 1291 modules, zero errors) is the ultimate PNG-validity + splash-plugin-schema proof — no missing/corrupt-asset failure occurred.

7. **Docs (R6)** — **PASS**. Both `apps/mobile/docs/phi-at-rest-audit.md` (118 lines) and `apps/mobile/docs/eas-release-runbook.md` (133 lines) exist. Spot-checked 3 factual claims directly against shipped code:
   - **3 teardown sites** claim — verified accurate (see check #2 above; audit names all 3 files correctly, including explaining the `AuthBootstrap` gap).
   - **MMKV encryption key source** claim ("generated once via `expo-crypto`'s `Crypto.randomUUID()`, persisted in SecureStore under `hc_cache_key`, never a static literal") — verified accurate by reading `mmkv.ts` directly: matches line-for-line.
   - **"No PHI in logs" — exactly 2 `console.*` hits, neither PHI** claim — verified accurate via `grep -rEn "console\.(log|warn|error|info)"` across `apps/mobile/src`: exactly 2 hits, one a `console.warn` in `config/env.ts` (missing env var, not PHI) and one a code **comment** (not an actual call) in `PushBootstrap.tsx`. Matches the audit's claim precisely, including the "one is a comment, not a call" nuance.
   - `eas.json`'s claimed-empty `submit.production` block — verified: `"submit": { "production": {} }`, exactly as the runbook states.
   - No overclaiming found — the audit does NOT claim any Human/EAS smoke passed; it explicitly labels screenshot-blocking as "code-verified; on-device confirmation is a pending Human/EAS smoke."
   - Runbook enumerates the Human/ops remainder across 8 phases, including this change's own 4 smokes (Phase 5) and the accumulated #5–#10 device smokes (Phase 6), matching spec's Release runbook section 1:1.

8. **Scope discipline** — **PASS**. All PR1 code changes are under `apps/mobile/`; `git diff --numstat` confirms zero touch to `packages/core`/`apps/web`. `grep -rn "minSdkVersion\|deploymentTarget\|compileSdkVersion\|targetSdkVersion"` on `app.config.ts`/`package.json` returns empty — no OS floor bump (iOS 15.1 / Android minSdk 24 default preserved). No new PHI values introduced into any `console.*` call (see check #7).

**Line-count cross-check** (independently recomputed via `git diff --numstat`):
- PR1 (committed `b436c7f`): 161 insertions + 26 deletions = **187 total** changed lines across `apps/mobile/src` + `package.json` + `app.config.ts` (binary PNGs excluded) — matches the apply report's claim exactly, within the ~150-280 forecast.
- PR2 (uncommitted): 251 lines across the 2 new docs (118+133, via `wc -l`) + 6 lines in `tasks.md` (3 insertions/3 deletions, checkbox flips only, via `git diff --stat`) = 257 total — well under the 400-line budget.

---

## Coherence (Design Match)

| Decision | Followed? | Notes |
|---|---|---|
| D1 — shared `teardown.ts`, cache-only, called alongside `logout()` | ✅ Yes | Code matches the design's snippet near-verbatim at all 3 call sites. |
| D2 — `usePreventScreenCapture()` at `AppProviders` root | ✅ Yes | Called in component body, unconditional, before the auth-gated render branch. |
| D3 — a11y recipe reusing existing strings | ✅ Yes | Every file's hitSlop/role/label matches the design's per-component table exactly (including which buttons get hitSlop and which don't). |
| D4 — i18n via RHF wrappers' own `useTranslation()` | ✅ Yes | `?? t(...)` computed in function body, not a default-param (correctly avoids the hook-in-default-param bug). |
| D5 — version 1.0.0, committed real PNGs, `expo-splash-screen` plugin, `runtimeVersion:{policy:'appVersion'}` | ✅ Yes | All wired exactly as designed; PNG dimensions match the D5 spec (1024×1024 icon/adaptive-icon, 1284×2778 splash). |
| D6 — 2 separate docs under `apps/mobile/docs/` | ✅ Yes | Both docs exist, correctly separated, content matches D6's outline. |
| D7 — PR1 [code] → PR2 [docs], core/web untouched | ✅ Yes | Confirmed via git history + diff. |

No deviations found. No rejected alternatives were accidentally implemented.

---

## Requirements & Scenarios (12 total: 8 headless, 4 Human/EAS-smoke)

| Req | Scenario | Status |
|---|---|---|
| R1 | teardown-clears-both-caches-all-3-sites | ✅ **PROVEN** (code trace — adversarial check #2) |
| R2 | screen-capture-mounted-at-root | ✅ **PROVEN** (code trace — adversarial check #3) |
| R3 | a11y-props-present-in-scoped-files | ✅ **PROVEN** (grep/read — adversarial check #4) |
| R4 | i18n-stragglers-zero | ✅ **PROVEN** (grep — adversarial check #5) |
| R5 | version-and-assets-configured | ✅ **PROVEN** (config-read + PNG validity + expo export green — check #6) |
| R6 | docs-exist-and-enumerate-remainder | ✅ **PROVEN** (code trace + spot-check accuracy — check #7) |
| R7 | core-and-web-unbroken | ✅ **PROVEN** (build green, zero diff) |
| R5+R7 | mobile-toolchain-green | ✅ **PROVEN** (tsc + expo-doctor + expo export all exit 0) |
| R2 | screenshots-blocked-on-device | ⏳ **PENDING — Human/EAS smoke** (not headlessly provable; enumerated in runbook Phase 5) |
| R3 | screen-reader-reads-labels | ⏳ **PENDING — Human/EAS smoke** (enumerated in runbook Phase 5) |
| R3 | large-font-scaling-holds | ⏳ **PENDING — Human/EAS smoke** (enumerated in runbook Phase 5) |
| R5 | real-eas-build-succeeds | ⏳ **PENDING — Human/EAS smoke** (requires real EAS credentials, out of scope; enumerated in runbook Phase 4/5) |

8/8 headless scenarios PROVEN. 4/4 Human/EAS-smoke scenarios correctly reported as PENDING — none fabricated or claimed as passing, matching the spec's explicit framing that these are non-headless.

R8 (non-functional constraints — no OS floor bump, Spanish-first i18n, no new PHI logging) verified via adversarial check #8: PASS.

---

## Issues Found

**CRITICAL** (must fix before archive):
None.

**WARNING** (should fix):
- The 4 Human/EAS-smoke scenarios (screenshots-blocked-on-device, screen-reader-reads-labels, large-font-scaling-holds, real-eas-build-succeeds) remain unverified at runtime — by design (no EAS credentials, no physical device in this environment). This is expected and enumerated in `eas-release-runbook.md`, not a code defect, but it means "#11 done" is code-readiness only, not a confirmed-working release. The accumulated #5–#10 Human/EAS device smokes are also still pending (enumerated in runbook Phase 6) — this was already true before change #11 and is not newly introduced here.

**SUGGESTION** (nice to have):
- `phi-at-rest-audit.md` already documents this, but worth surfacing: `Image.clearDiskCache()` failures are silently swallowed (best-effort, by design) — a failed disk-cache clear leaves no operational signal (e.g., no telemetry/log). Acceptable per design D1's explicit rationale, but a future change could consider surfacing a non-blocking diagnostic signal if this proves observable in practice.
- The a11y sweep is intentionally scoped to 8/36 files (ratified out-of-scope for the remaining 28 per the proposal) — already transparently disclosed in both the spec and the audit doc, not a gap in this change, but a reminder that a full a11y pass across the rest of the app remains future work.

---

## Verdict

# PASS

**CRITICAL: 0 | WARNING: 1 | SUGGESTION: 2**

All independently re-run gates are green (install, core build, web build+lint, mobile typecheck,
expo-doctor 19/19, expo export iOS 1283/Android 1291 modules). `packages/core` and `apps/web` are
confirmed byte-unchanged against `main`. All 8 adversarial checks PASS, including the
highest-value fix (the `AuthBootstrap` PHI-teardown gap, now closed at exactly 3 call sites via
the shared `clearAllLocalData()` helper with no circular imports). All 22/22 tasks are complete
and match the code state. The 2 new docs are accurate to the shipped code (spot-checked, no
overclaiming). The only WARNING is the expected, by-design Human/EAS-smoke gap (4 runtime
scenarios + the accumulated #5–#10 device smokes) — non-blocking for code-readiness, explicitly
enumerated in the release runbook, and consistent with this change's own framing that "#11 done"
means code-readiness, not a store release.

**This is the FINAL change (#11) of the 11-change HouseCenter Mobile plan.** A clean PASS here
means the entire plan's code is now complete and ready for `sdd-archive`. The remaining Human/ops
work (real EAS credentials, real device QA, backend deployment, store submission) is fully
enumerated in `apps/mobile/docs/eas-release-runbook.md` and is out of this repo's automatable
surface by design — not a blocker to closing the SDD plan.
