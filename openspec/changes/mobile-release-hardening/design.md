# SDD Design — Mobile Release Hardening

## Change name
`mobile-release-hardening`

## Status
`design` (2026-07-13)

Technical HOW for proposal `mobile-release-hardening` (change #11, FINAL). Two ordered PRs, both
scoped to `apps/mobile` only. **PR1 [code]**: a shared cache-teardown helper wired into 3 sites
(closing the `AuthBootstrap` PHI gap + the `expo-image` cache gap), app-wide screenshot
prevention, a bounded a11y sweep (4 shared RHF primitives + 4 screens), 2 i18n fixes, and
version/assets/config wiring. **PR2 [docs]**: PHI-at-rest audit + EAS release runbook. Core stays
untouched; `apps/web` byte-unchanged.

---

## Target structure

```
apps/mobile/
  src/lib/
    teardown.ts                      ← NEW: clearAllLocalData() — cache-only, shared by 3 sites
    mmkv.ts                          ← unchanged (clearCache() already exists)
    queryClient.ts                   ← unchanged
  src/api/client.ts                  ← MODIFY: onRefreshFail wired to clearAllLocalData()
  src/components/AuthBootstrap.tsx   ← MODIFY: cold-start catch wired to clearAllLocalData() (the gap)
  src/screens/more/MoreScreen.tsx    ← MODIFY: logout finally wired to clearAllLocalData(); +a11y on 6 rows
  src/providers/AppProviders.tsx     ← MODIFY: +usePreventScreenCapture() at root
  src/components/shared/form/
    RHFTextInput.tsx                 ← MODIFY: +accessibilityLabel/Hint from existing props
    RHFSelect.tsx                    ← MODIFY: +accessibilityRole/Label/State +hitSlop
    RHFPickerField.tsx               ← MODIFY: +a11y +i18n'd `common.select` default
    RHFDateField.tsx                 ← MODIFY: +a11y +i18n'd `common.selectDate` default
  src/components/attachments/
    AttachmentsSection.tsx           ← MODIFY: +a11y on 3 Pressables +hitSlop on delete button
  src/screens/more/DevicesScreen.tsx ← MODIFY: +a11y +hitSlop on revoke button
  src/screens/more/NotificationsScreen.tsx ← MODIFY: +a11y role/label consistency
  src/i18n/locales/es.json           ← MODIFY: +common.select, +common.selectDate
  app.config.ts                     ← MODIFY: version 1.0.0, icon/adaptiveIcon fields,
                                        +expo-splash-screen plugin, +runtimeVersion policy
  package.json                      ← MODIFY: +expo-screen-capture, +expo-splash-screen
  assets/
    icon.png                        ← NEW: placeholder, committed (real binary, not a stub)
    adaptive-icon.png                ← NEW: placeholder, committed
    splash.png                       ← NEW: placeholder, committed
  docs/
    phi-at-rest-audit.md             ← NEW (PR2)
    eas-release-runbook.md           ← NEW (PR2)

packages/core                        ← NO change (all teardown call sites are mobile-only)
apps/web/*                            ← NO change — build/lint regression gate only
```

---

## Architecture decisions

### D1 — Shared teardown helper `apps/mobile/src/lib/teardown.ts`, cache-only, called alongside (not instead of) `logout()`
**Choice**: New `clearAllLocalData(): Promise<void>` in `apps/mobile/src/lib/teardown.ts`, owning
exactly the 3 cache surfaces that sit outside SecureStore/token state: the encrypted MMKV
query-cache blob (`clearCache()`), the in-memory `QueryClient` (`queryClient.clear()`), and
`expo-image`'s disk+memory cache of viewed patient/consultation photos (`Image.clearMemoryCache()`
+ `Image.clearDiskCache()`) — the real gap from exploration, since it lives entirely outside MMKV.
```ts
// apps/mobile/src/lib/teardown.ts
import { Image } from 'expo-image'
import { clearCache } from './mmkv'
import { queryClient } from './queryClient'

// Cache-only PHI teardown shared by all 3 forced/manual logout paths. Deliberately does NOT
// touch tokens/auth state — core's `logout()` (Zustand + SecureStore) already owns that; this
// helper is always called ALONGSIDE logout()/tokenStore.clear(), never as a replacement.
export async function clearAllLocalData(): Promise<void> {
  clearCache()
  queryClient.clear()
  try {
    Image.clearMemoryCache()
    await Image.clearDiskCache()
  } catch {
    // best-effort — a failed disk-cache clear must never block/crash a logout teardown
    // (mirrors the existing "best-effort, swallow" idiom in MoreScreen's push-unsubscribe)
  }
}
```
No circular import: `teardown.ts` imports `./mmkv` and `./queryClient` only; neither of those (nor
anything they import) imports `teardown.ts` or `api/client.ts` back — confirmed by inspection of
both files' import graphs. `api/client.ts` and `AuthBootstrap.tsx`/`MoreScreen.tsx` import
`teardown.ts` one-directionally.

**Call sites (before → after)**:
```ts
// components/AuthBootstrap.tsx — THE GAP (highest-value fix)
// before: .catch(() => logout())
// after:
.catch(() => {
  logout()
  void clearAllLocalData()
})
```
```ts
// api/client.ts — onRefreshFail (core's type is `() => void`; fire-and-forget is already
// the existing pattern here, so an unawaited async call is a drop-in replacement)
// before:
onRefreshFail: () => {
  clearCache()
  queryClient.clear()
},
// after: (drop the now-unused clearCache/queryClient imports, import teardown instead)
onRefreshFail: () => {
  void clearAllLocalData()
},
```
```tsx
// screens/more/MoreScreen.tsx — onLogout's finally (already async, safe to await)
// before: } finally { clearCache(); setLoggingOut(false) }
// after:
} finally {
  await clearAllLocalData()
  setLoggingOut(false)
}
```
**Alternatives considered**: inline `Image.clearMemoryCache()`/`clearDiskCache()` at each of the 3
sites directly (rejected — reintroduces exactly the drift the proposal calls out: 2 of 3 sites
already disagree today because `clearCache()` was added ad hoc per-site; a shared helper is a
single edit point going forward); folding token-clearing into `teardown.ts` too, so call sites
invoke one function for everything (rejected — `logout()` is a **core**, platform-agnostic Zustand
action already exercised by web; duplicating/wrapping it in a mobile-only file blurs the
core/mobile boundary for no benefit, and the 3 sites already call `logout()`/`tokenStore.clear()`
independently for unrelated reasons — e.g. `AuthBootstrap`'s catch always calls `logout()`
regardless of cache state).
**Rationale**: one function, one file, three call sites reduced to a single line each — the
exact "stop drifting" goal from the proposal, and cache-only scope keeps `apps/mobile`'s only new
lib file trivially reviewable (~12 lines) and outside the core/mobile auth boundary.

### D2 — `usePreventScreenCapture()` mounted once, app-wide, at `AppProviders` root
**Choice**: Add `expo-screen-capture` (`~55.0.14`, `expo install`-pinned to match sibling
`~55.x` deps) and call the hook inside `AppProviders`'s function body (it is a hook — must run in
component scope, not module scope):
```tsx
// providers/AppProviders.tsx
import { usePreventScreenCapture } from 'expo-screen-capture'

export function AppProviders({ children }: { children: ReactNode }) {
  usePreventScreenCapture() // app-wide, for the app's entire lifetime — no unmount/re-enable path
  useEffect(() => { /* existing initConnectivity() */ }, [])
  ...
```
No config plugin, no new native permission: Android `FLAG_SECURE` is automatic on mount, iOS uses
a secure overlay — adding the dependency is the entire wiring.
**Alternatives considered**: per-screen enable (e.g. only patient-photo screens) (rejected — every
screen in this app surfaces some PHI-adjacent data — patient list, consultations, attachments —
app-wide is simpler and removes the risk of a forgotten screen); mounting inside `AuthBootstrap`
so it's post-auth-only (rejected — blocking screenshots of the login screen too is harmless
defense-in-depth, and `AuthBootstrap` unmounts/remounts its children on auth-state transitions,
which would repeatedly toggle the native flag for no benefit).
**Rationale**: ratified proposal decision #2 — app-wide is the simplest correct shape; a hook
call at the provider root that never unmounts during the app's life is the idiomatic
`expo-screen-capture` usage.

### D3 — a11y sweep recipe: reuse existing `t()`/prop strings, never invent new hardcoded a11y-only copy
**Choice**: A single consistent recipe across the 4 RHF primitives + 4 screens, reusing strings
already flowing through the component (never a new hardcoded English/Spanish literal):

| Component | Control | Fix |
|---|---|---|
| `RHFTextInput` | `TextInput` | `accessibilityLabel={label}`; `accessibilityHint={rest.placeholder}` (reuses the caller-supplied, already-i18n'd `placeholder` — zero new strings) |
| `RHFSelect` | pill `Pressable` | `accessibilityRole="button"` + `accessibilityLabel={opt.label}` + `accessibilityState={{selected: active}}`; `hitSlop={{top:8,bottom:8}}` (vertical-only — horizontal would risk overlapping the 8px pill `gap`) |
| `RHFPickerField` | trigger `Pressable` + modal option rows | trigger: `accessibilityRole="button"` + `accessibilityLabel={label ?? resolvedPlaceholder}`; option rows: `accessibilityRole="button"` + `accessibilityLabel={item.label}` |
| `RHFDateField` | trigger `Pressable` | `accessibilityRole="button"` + `accessibilityLabel={label}` + `accessibilityHint={display}` (reuses the already-computed formatted-date string) |
| `AttachmentsSection` | take-photo / choose-library / **delete** buttons | `accessibilityRole="button"` + `accessibilityLabel={t(...)}` (reuses the exact key already passed to the sibling `<Text>`); delete button (named in proposal — `paddingVertical:6`/`fontSize:12`, ~26px effective height) additionally gets `hitSlop={{top:10,bottom:10,left:10,right:10}}` |
| `MoreScreen` | 6 rows (RutaDelDia/WorkRoutes/Reports/Devices/Notifications/Logout) | `accessibilityRole="button"` + `accessibilityLabel={t(...)}`; rows already ≥44px (`paddingVertical:14`), no `hitSlop` needed |
| `DevicesScreen` | revoke button (`paddingVertical:8`, ~33px) / revoke-all button (`paddingVertical:12`, ~44px borderline) | both: `accessibilityRole="button"` + `accessibilityLabel={t(...)}`; revoke-button only: `hitSlop={{top:8,bottom:8,left:8,right:8}}` |
| `NotificationsScreen` | row `Pressable` / mark-all `Pressable` | row: add `accessibilityRole="button"` (label logic already exists, kept as-is: `undefined` when read is correct — nothing actionable to announce); mark-all: `accessibilityRole="button"` + `accessibilityLabel={t('notifications.markAllRead')}` + `hitSlop={{top:6,bottom:6}}` (borderline `paddingVertical:10`) |

**Alternatives considered**: adding new a11y-specific i18n keys per control (rejected — every
control here already has an i18n'd or prop-supplied string flowing through it; inventing parallel
`a11y.*` keys would duplicate copy and risk the two drifting); sweeping all ~36 `.tsx` files
(rejected — ratified out of scope in the proposal, bounded to these 8 files to keep the PR
reviewable).
**Rationale**: the recipe is mechanical and copy-paste-safe across files — always resolve the
label from a value the component already has (a `label`/`placeholder` prop, an `options[].label`,
or a `t()` call already present in a sibling `<Text>`), never author new copy.

### D4 — i18n stragglers route through `t()`; RHF wrappers call `useTranslation()` internally
**Choice**: Both shared wrappers already sit under `I18nextProvider` (mounted at the `AppProviders`
root, wrapping the entire tree) — exactly like every screen that already calls `useTranslation()`
directly (`MoreScreen`, `DevicesScreen`, `NotificationsScreen`, `AttachmentsSection`). No prop
threading needed:
```tsx
// RHFPickerField.tsx
export function RHFPickerField<T extends FieldValues>({ control, name, label, placeholder, useOptions }: Props<T>) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('common.select')
  // ...{selected?.label ?? resolvedPlaceholder}
```
```tsx
// RHFDateField.tsx
const { t } = useTranslation()
const display = field.value ? (...) : t('common.selectDate')
```
New `es.json` keys (added to the existing `common` namespace):
```json
"common": {
  "cancel": "Cancelar", "previous": "Anterior", "next": "Siguiente",
  "select": "Seleccionar",
  "selectDate": "Seleccionar fecha"
}
```
Default parameter values can't call a hook directly (`placeholder = t(...)` in the parameter list
would reference `t` before `useTranslation()` runs) — the fix is `placeholder ?? t(...)` computed
in the function body, after the hook call.
**Alternatives considered**: passing the translated string as a required prop from every call site
(rejected — `RHFPickerField`/`RHFDateField` are used across ~8 screens per the reports/workroutes
design; touching every call site to pass a placeholder is a much larger, unbounded diff for a
2-string fix); a new `formCommon.*` namespace (rejected — `common.*` already exists and these are
generic enough to belong there, no new namespace needed).
**Rationale**: exactly the 2 confirmed stragglers, minimal diff, no new i18n architecture.

### D5 — Version 1.0.0, committed placeholder assets (not conditional), `expo-splash-screen` plugin, `runtimeVersion: {policy:'appVersion'}`
**Choice**:
- `app.config.ts`: `version: '0.0.0'` → `'1.0.0'` (marketing/App-Store version only — `package.json`'s
  separate `"version": "0.0.0"` is npm workspace metadata, untouched, out of proposal scope).
- New `apps/mobile/assets/` with 3 **real, valid, committed** placeholder PNGs — never a stub or
  conditional path. Unlike `googleServicesFile` (conditional because it's an ops-provided
  *secret*), icon/splash/adaptive-icon carry no secrets — there's no reason to keep them optional,
  so the simplest-and-safest shape is: always exist, always wired, later swapped byte-for-byte by
  real branded artwork (a design deliverable, not this change) without ever touching
  `app.config.ts` again. Generated at apply time via a dependency-free script (stdlib `zlib`/
  `struct`, no ImageMagick/sharp/Node-canvas needed) emitting solid-color, correctly-sized PNGs
  (`icon.png`/`adaptive-icon.png`: 1024×1024 `#2563eb`; `splash.png`: 1284×2778 `#ffffff`) —
  **valid, decodable files**, not empty placeholders, so `expo-doctor`/`expo export`/`expo prebuild`
  never hit the missing-or-corrupt-asset class of failure already documented for
  `googleServicesFile`.
- `icon`/`android.adaptiveIcon` remain **top-level `ExpoConfig` fields** (unaffected by the SDK-50+
  splash migration); `splash` does **not** — SDK 50+ deprecated the legacy top-level `splash` key
  in favor of the `expo-splash-screen` config plugin, so this design uses the plugin (new dep,
  `expo install`-pinned), matching this file's own existing convention of wiring every
  native-asset-touching package through the `plugins` array (`expo-image-picker`,
  `expo-notifications`, the datetimepicker):
```ts
icon: './assets/icon.png',
android: {
  package: 'net.housecenter.mobile',
  adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#2563eb' },
  ...(googleServicesFile ? { googleServicesFile } : {}),
},
plugins: [
  'expo-localization',
  '@react-native-community/datetimepicker',
  ['expo-image-picker', { /* unchanged */ }],
  ['expo-notifications', { color: '#2563eb' }],
  ['expo-splash-screen', { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#2563eb' }],
],
runtimeVersion: { policy: 'appVersion' },
```
- `runtimeVersion: { policy: 'appVersion' }` (not `sdkVersion`): ties directly to the `version`
  field this very change makes meaningful (`1.0.0`); inert today (no `expo-updates` installed, so
  nothing reads it yet) but forward-compatible if OTA is ever adopted, and it's the standard
  "getting ready for production" default rather than a migration deferred to later.
**Alternatives considered**: conditional icon/splash wiring mirroring `googleServicesFile`
(rejected — that pattern exists specifically because Firebase credentials are secrets that can't
be committed; icon/splash carry no secrets, so unconditional committed placeholders are strictly
simpler and equally green); referencing Expo's own template default assets instead of generating
new ones (rejected — those ship in the `create-expo-app` template package, not guaranteed present
in `node_modules/expo`, and depending on locating them is fragile versus deterministically
generating our own); `runtimeVersion: {policy:'sdkVersion'}` (rejected for now — more meaningful
once an actual EAS Update/OTA channel strategy exists, not yet the case here).
**Rationale**: unblocks the release path exactly as scoped (config-readiness, not real artwork),
while avoiding the "config points at a file that doesn't exist" failure class explicitly flagged
as a trap.

### D6 — Docs: PHI-at-rest audit + EAS release runbook, both under `apps/mobile/docs/`
**Choice**: `apps/mobile/docs/phi-at-rest-audit.md` — sections: (1) what's encrypted/where (MMKV
query cache, SecureStore-backed encryption key, tokens/deviceId/pushToken all SecureStore-only);
(2) teardown coverage — the 3 sites, now uniformly wired through `clearAllLocalData()`, including
the `expo-image` disk/memory cache closed by this change; (3) the new `FLAG_SECURE`/iOS
screenshot-block addition; (4) residual risks (case-sensitive-only... n/a here, but: no OTA/patch
channel yet, teardown is best-effort on `Image.clearDiskCache()` failure, a11y sweep is scoped not
exhaustive). `apps/mobile/docs/eas-release-runbook.md` — the enumerated Human/ops checklist:
real branded icon/splash/adaptive-icon + store screenshots (design); Apple Developer account + ASC
API key + Google Play service account, populate `eas.json`'s empty `submit.production` (ops);
`eas build --profile production` (iOS + Android) on the dev-client; device QA on real iOS 15.1 /
Android 7 hardware; store listing metadata + submission; the deployed API dependency (incl.
`/collaborators/me` and `Push:CredentialsJson` FCM creds); the accumulated #5–#10 Human/EAS device
smokes, plus this change's own screenshot-block + a11y (VoiceOver/TalkBack) smokes.
**Alternatives considered**: one combined doc (rejected — audit is a security artifact with its own
audience/lifecycle; runbook is an ops checklist that changes independently as credentials land —
separate files avoid coupling their edit history); placing docs at repo root `docs/` (rejected — no
existing repo-root docs convention exists; these are mobile-specific, so they live under
`apps/mobile/`, consistent with the proposal's "scoped to apps/mobile only" framing).
**Rationale**: matches the proposal's PR2 scope exactly; both docs carry zero code risk.

### D7 — PR mapping: PR1 code (~18 files) then PR2 docs; `packages/core` and `apps/web` untouched
**Choice**: **PR1** = `teardown.ts` + 3 wire sites + `usePreventScreenCapture` + `package.json`
(+2 deps) + a11y (8 files) + i18n (2 files: `RHFPickerField`/`RHFDateField`, +`es.json`) +
version/assets/config (`app.config.ts` + 3 committed PNGs). **PR2** = the 2 docs. Every file in
both PRs lives under `apps/mobile/`; `packages/core` has zero call sites for any of this (all 3
teardown sites, the screen-capture hook, the RHF wrappers, and `app.config.ts` are mobile-only by
construction), so `apps/web`'s build/lint gate is an assertion, not a real regression risk.
**Alternatives considered**: further splitting PR1 into security+config vs. a11y+i18n (flagged in
the proposal as a fallback if line-count runs high — `sdd-tasks` re-forecasts against the 400-line
budget and decides; this design does not pre-split, since most of PR1's diff is either tiny
(2-line i18n fixes, 1-line hook mount) or binary (3 PNGs, which don't count meaningfully against a
text-diff review budget)).
**Rationale**: matches the proposal's ratified delivery plan; `sdd-tasks` owns the final
line-budget forecast per the Review Workload Guard.

---

## Data flow — PHI teardown (all 3 sites converge on one function)

```
MoreScreen.onLogout()          api/client.ts onRefreshFail       AuthBootstrap cold-start catch
  (manual logout, awaited)        (forced 401, fire-and-forget)     (silent-refresh fail, THE GAP)
        │                                │                                │
        ▼                                ▼                                ▼
   logout.mutateAsync()            tokenStore.clear()                 logout()  ← unchanged,
   (core, token/session)           (core, inside createApiClient,        core Zustand action
        │                          runs before onRefreshFail fires)         │
        │                                │                                │
        └──────────────┬─────────────────┴────────────────┬──────────────┘
                        ▼                                  ▼
              clearAllLocalData()  ◀── apps/mobile/src/lib/teardown.ts (NEW, shared)
                        │
        ┌───────────────┼───────────────────┐
        ▼               ▼                    ▼
  clearCache()   queryClient.clear()   Image.clearMemoryCache()
  (MMKV, existing)   (existing)        + Image.clearDiskCache()  ← the 2nd gap (expo-image),
                                          never cleared anywhere before this change
```

---

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/mobile/src/lib/teardown.ts` | Create | `clearAllLocalData()` — cache-only shared teardown |
| `apps/mobile/src/api/client.ts` | Modify | `onRefreshFail` wired to `clearAllLocalData()` |
| `apps/mobile/src/components/AuthBootstrap.tsx` | Modify | Cold-start catch wired to `clearAllLocalData()` — the primary gap fix |
| `apps/mobile/src/screens/more/MoreScreen.tsx` | Modify | Logout `finally` wired to `clearAllLocalData()`; +a11y on 6 rows |
| `apps/mobile/src/providers/AppProviders.tsx` | Modify | +`usePreventScreenCapture()` at root |
| `apps/mobile/package.json` | Modify | +`expo-screen-capture`, +`expo-splash-screen` |
| `apps/mobile/src/components/shared/form/RHFTextInput.tsx` | Modify | +a11y label/hint from existing props |
| `apps/mobile/src/components/shared/form/RHFSelect.tsx` | Modify | +a11y role/label/state +hitSlop |
| `apps/mobile/src/components/shared/form/RHFPickerField.tsx` | Modify | +a11y +i18n'd default placeholder |
| `apps/mobile/src/components/shared/form/RHFDateField.tsx` | Modify | +a11y +i18n'd default display |
| `apps/mobile/src/components/attachments/AttachmentsSection.tsx` | Modify | +a11y on 3 Pressables +hitSlop on delete |
| `apps/mobile/src/screens/more/DevicesScreen.tsx` | Modify | +a11y +hitSlop on revoke button |
| `apps/mobile/src/screens/more/NotificationsScreen.tsx` | Modify | +a11y role/label consistency |
| `apps/mobile/src/i18n/locales/es.json` | Modify | +`common.select`, +`common.selectDate` |
| `apps/mobile/app.config.ts` | Modify | version 1.0.0, icon/adaptiveIcon, +splash plugin, +runtimeVersion |
| `apps/mobile/assets/icon.png` | Create | Placeholder, real valid PNG (1024×1024) |
| `apps/mobile/assets/adaptive-icon.png` | Create | Placeholder, real valid PNG (1024×1024) |
| `apps/mobile/assets/splash.png` | Create | Placeholder, real valid PNG (1284×2778) |
| `apps/mobile/docs/phi-at-rest-audit.md` | Create (PR2) | PHI-at-rest verdict + teardown coverage |
| `apps/mobile/docs/eas-release-runbook.md` | Create (PR2) | Human/ops release checklist |
| `packages/core` | None | No call site touches core |
| `apps/web/*` | None | Build/lint regression gate only |

---

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Typecheck | `teardown.ts` compiles; all 3 call sites; a11y prop additions; i18n key resolution | `pnpm --filter mobile exec tsc --noEmit` |
| Config sanity | icon/splash/adaptiveIcon files exist & decode; `plugins`/`runtimeVersion` schema valid | `expo-doctor`; `expo export` (hard-fails on a missing/invalid asset path — the exact trap this design avoids) |
| Web regression | Zero core touch → `apps/web` byte-unchanged | `pnpm --filter web build && pnpm --filter web lint` (assertion, not expected to catch anything) |
| Human/EAS smoke | Screenshot block (Android `FLAG_SECURE` + iOS overlay); a11y via VoiceOver/TalkBack; PHI-teardown observable via storage inspection | dev-client build, physical device or emulator — enumerated in the runbook, not executed here |

No unit/integration layer — `apps/mobile` has no test runner (verify via build + lint/typecheck,
same convention as `apps/web`).

---

## CRITICAL IMPL NOTES (for apply)

1. **`AuthBootstrap`'s missing `clearCache()` is the highest-value line in this change** — today
   its cold-start silent-refresh-failure `.catch(() => logout())` never touches the cache. Fix:
   `.catch(() => { logout(); void clearAllLocalData() })`.
2. **`expo-image` cache-clear must land at all 3 sites via the shared helper**, never inlined
   separately — `Image.clearMemoryCache()` (sync) + `await Image.clearDiskCache()` (async,
   try/catch-wrapped, best-effort).
3. **No circular imports**: `teardown.ts` imports only `./mmkv` + `./queryClient` + `expo-image`;
   confirmed neither of those (nor anything they import) imports `teardown.ts` or `api/client.ts`
   back.
4. **`usePreventScreenCapture()` is a hook** — must be called inside `AppProviders`'s function
   body (component scope), never at module scope.
5. **a11y labels must be i18n'd** — every `accessibilityLabel`/`Hint` added must resolve from an
   existing `t()` call, prop (`label`/`placeholder`), or computed value already in the component —
   never a new hardcoded English/Spanish literal.
6. **The placeholder-asset-must-exist trap**: `icon`/`splash`/`adaptiveIcon` pointing at a
   non-existent or corrupt file breaks `expo export`/`expo prebuild` (same class as the
   `googleServicesFile` trap already documented in `app.config.ts`). Generate real, valid,
   correctly-sized PNGs at apply time (stdlib `zlib`/`struct` script, no new tooling dependency) —
   never leave an empty/stub file.
7. **`splash` is a config-plugin field in SDK 50+**, not a top-level `ExpoConfig` key — use the
   `expo-splash-screen` plugin entry, matching this file's own `plugins`-array convention for every
   other native-asset-touching package. `icon`/`android.adaptiveIcon` remain top-level fields,
   unaffected by that migration.
8. **Add both new deps via `expo install`** (`expo-screen-capture`, `expo-splash-screen`) rather
   than hand-writing a `~55.x.x` version — every existing SDK-bound dep in this `package.json` is
   precision-pinned that way, and guessing a patch number risks an SDK-55-incompatible resolution.
9. **`packages/core` stays untouched** — every call site (teardown, screen-capture, RHF wrappers,
   `app.config.ts`) is mobile-only; `apps/web` build/lint is an assertion-only gate.
10. **Version bump is `app.config.ts`'s `version` only** (`'0.0.0'` → `'1.0.0'`) — `package.json`'s
    separate `"version": "0.0.0"` is npm workspace metadata, not the App Store version, and is out
    of scope; do not touch it.

---

## Migration / Rollout

No data migration. Every sub-item reverts independently: PHI-teardown reverts to today's
already-shipped 2-of-3 coverage (never below current behavior); screen-capture drops the
dependency + the one hook call; a11y/i18n are prop-only/string-only; version/assets/config revert
`app.config.ts` + delete `assets/`. PR2 (docs) carries zero code risk. No API contract change, no
`packages/core` change — `apps/web` unaffected by definition. Actual PR1 file count (~18, counting
3 binary placeholder assets + `package.json`) runs slightly above the proposal's ~12–14 estimate;
`sdd-tasks` re-forecasts the line-budget, but most of the added file count is binary or
single/double-line diffs, not reviewable text volume.

## Open Questions

- [ ] None blocking. `runtimeVersion: {policy:'appVersion'}` vs. `sdkVersion` is a low-stakes,
      reversible choice (inert without `expo-updates`) — flagged in D5, not a blocker.
