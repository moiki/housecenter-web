import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Device from 'expo-device'
import { useTranslation } from 'react-i18next'
import { authApi } from 'core/api/modules/auth.api'
import { isApiError } from 'core/types/common.types'
import type { DevicePlatform } from 'core/types/auth.types'
import { useAuthStore } from '../../store/auth.store'
import { getDeviceId } from '../../lib/deviceId'

// MUST be sent explicitly — the backend enum is non-nullable and only `IsInEnum()`-
// validated, so omitting it silently binds `Android (=0)` with no 400, mislabeling iOS
// in the device-session list (design.md D7).
const platform: DevicePlatform = Platform.OS === 'ios' ? 'iOS' : 'Android'

export function LoginScreen() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const tokens = await authApi.login({
        email,
        password,
        deviceId: getDeviceId(),
        platform,
        deviceName: Device.modelName ?? undefined,
      })
      // Store tokens BEFORE calling /auth/me — the request interceptor reads the
      // access token from the store on every request (ordering is load-bearing).
      useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await authApi.me()
      useAuthStore.getState().setAuth(user, tokens.accessToken, tokens.refreshToken)
      // No navigation call needed: RootNavigator's v7 conditional screens re-render on
      // `user != null` and switch to Tabs automatically (design.md D6).
    } catch (err) {
      setError(
        isApiError(err) && err.status === 401 ? t('auth.invalidCredentials') : t('common.error'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.title')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        placeholderTextColor="#9ca3af"
        autoComplete="current-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('auth.submit')}</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
