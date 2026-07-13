import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from './RootNavigator'

// Navigation ref (design.md D1): the app's first cross-tab imperative navigation target. Typed
// against `RootStackParamList` (not a standalone/duplicated param list — see D1's rejected
// alternative). Attached via `ref={navigationRef}` on `AppProviders`'s `NavigationContainer`
// (PR2a). Inert until PR2b's `PushBootstrap` calls `dispatchNotificationTap` from its tap
// listener / cold-start one-shot — zero runtime behavior change in this PR.
export const navigationRef = createNavigationContainerRef<RootStackParamList>()

// Mirrors apps/web's `NotificationBell.tsx` `REFERENCE_ROUTES` precedent (design.md D5), adapted
// from "return a URL string" to "perform an imperative navigate". Only `Consultation` has a
// reachable standalone detail route — `AttentionSession` carries only a `sessionId` (no
// standalone GET route) and is intentionally absent from this map; unknown types also fall
// through to a no-op (caller/UI may open the Notificaciones list itself).
export interface PushNotificationData {
  type: string
  referenceType: string | null
  referenceId: string | null
}

const REFERENCE_ROUTES: Record<string, (id: string) => void> = {
  Consultation: (id) =>
    navigationRef.navigate('Tabs', {
      screen: 'Consultas',
      params: { screen: 'ConsultationDetail', params: { consultationId: id } },
    }),
}

// Called by PR2b's `PushBootstrap` from both the live tap listener and the cold-start one-shot —
// one dispatch function, two call sites, no logic duplication. Guarded on `isReady()`: the
// container must have an active navigator before any `navigate` call is safe (see design.md D4's
// cold-start-before-ready race — `RootNavigator` renders `Login` OR `Tabs`, never both, so the
// `Tabs` subtree doesn't exist pre-auth). `AttentionSession`/unknown `referenceType` never throw.
export function dispatchNotificationTap(data: PushNotificationData): void {
  if (!navigationRef.isReady()) return
  const toRoute = data.referenceType ? REFERENCE_ROUTES[data.referenceType] : undefined
  if (toRoute && data.referenceId) toRoute(data.referenceId)
}
