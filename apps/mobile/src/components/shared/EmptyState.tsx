import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

interface EmptyStateProps {
  messageKey?: string
}

// Trivial RN empty-state. Accepts an i18n key so feature screens can supply their own copy
// ("no hay pacientes", "no hay citas hoy", ...) later without this shared component hard-coding
// domain text now. Defaults to the generic common.empty key. RN-only — must stay under
// apps/mobile, never packages/core (R7).
export function EmptyState({ messageKey = 'common.empty' }: EmptyStateProps) {
  const { t } = useTranslation()
  return (
    <View style={styles.container} testID="empty-state">
      <Text>{t(messageKey)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
})
