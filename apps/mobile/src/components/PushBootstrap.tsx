import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useSubscribePush } from 'core/hooks/notifications/usePushSubscription'
import type { DevicePlatform } from 'core/types/auth.types'
import { useAuthStore } from '../store/auth.store'
import { getCachedPushToken, setCachedPushToken } from '../lib/pushToken'
import { dispatchNotificationTap, navigationRef } from '../navigation/navigationRef'
import type { PushNotificationData } from '../navigation/navigationRef'

const ANDROID_CHANNEL_ID = 'default'

// Platform mapping precedent — mirrors LoginScreen.tsx:14 exactly (design.md D2 step 5).
const platform: DevicePlatform = Platform.OS === 'ios' ? 'iOS' : 'Android'

// Module scope (design.md D2): runs exactly once, the first time this module is imported,
// regardless of auth state — controls foreground notification display only, needs no user
// context. `shouldShowBanner`/`shouldShowList` are the current (non-deprecated) fields.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// The raw `NotificationResponse.notification.request.content.data` payload is backend-controlled
// and untyped (`Record<string, unknown> | undefined`) — narrow it defensively into the
// `navigationRef.ts`-owned `PushNotificationData` shape rather than casting, since a malformed
// payload must fall through to a no-op (R8's "no PHI/body content is trusted client-side" spirit),
// never throw.
function toPushNotificationData(data: Record<string, unknown> | undefined): PushNotificationData {
  return {
    type: typeof data?.type === 'string' ? data.type : '',
    referenceType: typeof data?.referenceType === 'string' ? data.referenceType : null,
    referenceId: typeof data?.referenceId === 'string' ? data.referenceId : null,
  }
}

/**
 * Non-visual (design.md D2, `return null`): permission request + native-token registration/
 * rotation + live-tap/cold-start deep-link dispatch. Mounted as a sibling of `AuthBootstrap`
 * inside `AppProviders`'s `NavigationContainer`, AFTER it in JSX order (load-bearing — see
 * `AppProviders.tsx`'s comment: `AuthBootstrap`'s subtree, including the Tab/Stack navigators
 * that flip `navigationRef.isReady()` to `true`, commits its effects before this component's
 * own effects run). Self-gates on `useAuthStore((s) => s.user) != null` — its own, narrower
 * precondition than `AuthBootstrap`'s "device/auth hydrated" gate.
 */
export function PushBootstrap() {
  const user = useAuthStore((s) => s.user)
  const subscribePush = useSubscribePush()
  const coldStartHandledRef = useRef(false)

  // Shared cache-compare-then-subscribe (CRITICAL IMPL NOTE #3): every code path that can call
  // `subscribePush` — the mount registration effect AND the `addPushTokenListener` rotation
  // handler — MUST go through this one function. Do not duplicate the comparison inline; it
  // will drift and re-introduce the re-subscribe-loop trap this decision exists to avoid.
  async function registerTokenIfChanged(token: string) {
    const prev = await getCachedPushToken()
    if (token === prev) return // cache-hit: no network call
    await subscribePush.mutateAsync({ token, platform })
    await setCachedPushToken(token)
  }

  // Registration effect (design.md D2 steps 1-5): permission -> Android channel -> native token
  // -> cache-compare-then-subscribe. Re-runs when `user` flips null -> non-null (post-login only
  // — registering at cold-start splash before login is explicitly rejected by design.md D2:
  // unauthenticated devices have no user to attribute the subscription to).
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function register() {
      // Permission-denied is an expected, common outcome — NOT an error (CRITICAL IMPL NOTE #4).
      // Return silently: no Alert, no console.error. The Notificaciones list works identically
      // either way.
      let status = await Notifications.getPermissionsAsync()
      if (!status.granted) {
        status = await Notifications.requestPermissionsAsync()
      }
      if (!status.granted || cancelled) return

      if (Platform.OS === 'android') {
        // Documented no-op below API 26 (CRITICAL IMPL NOTE #6) — this app's minSdk is 24;
        // re-confirm on a real API-24/25 emulator during the Human/EAS smoke pass.
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      }
      if (cancelled) return

      // Native FCM/APNs token — NEVER `getExpoPushTokenAsync()` (design.md R3).
      const { data: token } = await Notifications.getDevicePushTokenAsync()
      if (cancelled) return
      await registerTokenIfChanged(token)
    }

    register()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Token-rotation listener (mount once, cleanup on unmount, design.md D2 step 6): runs the SAME
  // cache-compare-then-subscribe logic, so an OS-driven token rotation can't double-post either.
  useEffect(() => {
    const subscription = Notifications.addPushTokenListener((devicePushToken) => {
      registerTokenIfChanged(devicePushToken.data).catch(() => {
        // Best-effort: a failed re-registration on rotation is recoverable on the next
        // foreground/mount cycle; never crash the listener callback.
      })
    })
    return () => subscription.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live-tap listener (mount once, cleanup on unmount, design.md D4/D5): fires
  // `dispatchNotificationTap` on every tap while the app is foregrounded/backgrounded-but-running.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      dispatchNotificationTap(toPushNotificationData(response.notification.request.content.data))
    })
    return () => subscription.remove()
  }, [])

  // Cold-start one-shot (design.md D4, CRITICAL IMPL NOTE #1): `RootNavigator` renders `Login` OR
  // `Tabs` as its ONLY screen — the `Tabs` subtree (incl. `ConsultationDetail`) does not exist
  // pre-auth. Gated on BOTH `navigationRef.isReady()` and `user != null`, guarded by a ref so the
  // body runs at most once per app session. Residual risk (this ordering cannot be fully proven
  // by `tsc`/`expo export` alone) — flagged for Human/EAS smoke.
  useEffect(() => {
    if (coldStartHandledRef.current || !user || !navigationRef.isReady()) return
    coldStartHandledRef.current = true

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      dispatchNotificationTap(toPushNotificationData(response.notification.request.content.data))
    })
  }, [user])

  return null
}
