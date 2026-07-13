import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useLogout } from 'core/hooks/auth/useLogout'
import { useAuthStore } from '../../store/auth.store'
import { getDeviceId } from '../../lib/deviceId'
import { clearCache } from '../../lib/mmkv'
import type { MoreStackParamList } from '../../navigation/TabNavigator'

// "Más" tab landing/menu screen (R11): a profile stub, a link into the device list
// (`DevicesScreen`), and the "Cerrar sesión" action. Kept as the entry point of the tab so
// logging out doesn't require first opening the device list.
export function MoreScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>()
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const [loggingOut, setLoggingOut] = useState(false)

  async function onLogout() {
    setLoggingOut(true)
    try {
      // Layer 1 (core, `onSettled` — runs even if the API call fails offline): revokes this
      // device's session server-side, clears the auth store, drops the in-memory query cache.
      await logout.mutateAsync(getDeviceId())
    } finally {
      // Layer 2 (mobile-only, design.md D8): wipe the persisted MMKV blob — core is
      // platform-agnostic and cannot reach it. `user` -> null (set by layer 1) flips
      // RootNavigator to Login declaratively; no navigation ref needed.
      clearCache()
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

      <Pressable style={styles.row} onPress={() => navigation.navigate('Devices')}>
        <Text style={styles.rowText}>{t('more.devices')}</Text>
      </Pressable>

      <Pressable
        style={[styles.row, loggingOut && styles.rowDisabled]}
        onPress={confirmLogout}
        disabled={loggingOut}
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
