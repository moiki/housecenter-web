import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useLogout } from 'core/hooks/auth/useLogout'
import { useUnsubscribePush } from 'core/hooks/notifications/usePushSubscription'
import { useAuthStore } from '../../store/auth.store'
import { getDeviceId } from '../../lib/deviceId'
import { clearAllLocalData } from '../../lib/teardown'
import { clearCachedPushToken, getCachedPushToken } from '../../lib/pushToken'
import type { MoreStackParamList } from '../../navigation/TabNavigator'

// "Más" tab landing/menu screen (R11): a profile stub, a link into "Ruta del día"
// (`RutaDelDiaScreen`, R6/R8, mobile-reports-workroutes PR1b), a link into "Rutas de trabajo"
// (`WorkRoutesListScreen`, R4/R8, PR1a), a link into "Reportes" (`ReportsScreen`, R7/R8, PR2), a
// link into the device list (`DevicesScreen`), a link into the Notificaciones list
// (`NotificationsScreen`, R7, PR1), and the "Cerrar sesión" action. Kept as the entry point of the
// tab so logging out doesn't require first opening the device list.
export function MoreScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>()
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const unsubscribePush = useUnsubscribePush()
  const [loggingOut, setLoggingOut] = useState(false)

  async function onLogout() {
    setLoggingOut(true)
    try {
      // Push unsubscribe MUST fire and be awaited BEFORE logout.mutateAsync() (design.md D3,
      // CRITICAL IMPL NOTE #2): useLogout's `onSettled` clears `accessToken` the instant the
      // mutation settles, so this is the last point the token is guaranteed authenticated.
      // Best-effort — swallow errors, never block logout on a flaky push-cleanup call (backend
      // dead-token pruning is the accepted safety net).
      const token = await getCachedPushToken()
      if (token) {
        try {
          await unsubscribePush.mutateAsync(token)
        } catch {
          // best-effort, swallow
        }
        await clearCachedPushToken()
      }
      // Layer 1 (core, `onSettled` — runs even if the API call fails offline): revokes this
      // device's session server-side, clears the auth store, drops the in-memory query cache.
      await logout.mutateAsync(getDeviceId())
    } finally {
      // Layer 2 (mobile-only, design.md D1/D8): wipe the persisted caches (MMKV + query cache +
      // expo-image) via the shared `clearAllLocalData()` helper — core is platform-agnostic and
      // cannot reach any of these. `user` -> null (set by layer 1) flips RootNavigator to Login
      // declaratively; no navigation ref needed.
      await clearAllLocalData()
      setLoggingOut(false)
    }
  }

  function confirmLogout() {
    Alert.alert(t('more.logoutConfirmTitle'), t('more.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('more.logout'), style: 'destructive', onPress: onLogout },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <Text style={styles.name}>
          {user ? `${user.firstName} ${user.lastName}` : ''}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('RutaDelDia')}
        accessibilityRole="button"
        accessibilityLabel={t('more.rutaDelDia')}
      >
        <Text style={styles.rowText}>{t('more.rutaDelDia')}</Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('WorkRoutes')}
        accessibilityRole="button"
        accessibilityLabel={t('more.workRoutes')}
      >
        <Text style={styles.rowText}>{t('more.workRoutes')}</Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('Reports')}
        accessibilityRole="button"
        accessibilityLabel={t('more.reports')}
      >
        <Text style={styles.rowText}>{t('more.reports')}</Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('Devices')}
        accessibilityRole="button"
        accessibilityLabel={t('more.devices')}
      >
        <Text style={styles.rowText}>{t('more.devices')}</Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('Notifications')}
        accessibilityRole="button"
        accessibilityLabel={t('more.notifications')}
      >
        <Text style={styles.rowText}>{t('more.notifications')}</Text>
      </Pressable>

      <Pressable
        style={[styles.row, loggingOut && styles.rowDisabled]}
        onPress={confirmLogout}
        disabled={loggingOut}
        accessibilityRole="button"
        accessibilityLabel={t('more.logout')}
      >
        <Text style={[styles.rowText, styles.logoutText]}>{t('more.logout')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  profile: {
    marginBottom: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  row: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowText: {
    fontSize: 16,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
  },
})
