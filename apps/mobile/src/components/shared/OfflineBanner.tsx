import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { onlineManager } from '@tanstack/react-query'

// Reflects the same onlineManager state that connectivity.ts bridges from NetInfo (R4) — this is
// a subscriber, not a second NetInfo listener, so there's a single source of truth for "are we
// online". RN-only — must stay under apps/mobile, never packages/core (R7).
export function OfflineBanner() {
  const { t } = useTranslation()
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline())

  useEffect(() => onlineManager.subscribe(() => setIsOnline(onlineManager.isOnline())), [])

  if (isOnline) return null

  return (
    <View style={styles.banner} testID="offline-banner">
      <Text style={styles.text}>{t('common.offline')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#b91c1c',
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
  },
})
