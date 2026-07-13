import { ActivityIndicator, StyleSheet, View } from 'react-native'

// Trivial RN loading indicator, shared so feature screens don't reimplement a spinner wrapper.
// No copy: kept agnostic of context (full-screen loads vs inline list loads). RN-only — must
// stay under apps/mobile, never packages/core (R7).
export function LoadingState() {
  return (
    <View style={styles.container} testID="loading-state">
      <ActivityIndicator size="large" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
