import { StyleSheet, Text, View } from 'react-native'
import { AppProviders } from './src/providers/AppProviders'

// PR2: root now renders through AppProviders (QueryClient/persister/i18n/connectivity).
// The child below is still a placeholder — the real navigator (`RootNavigator`) lands in PR3.
// Default export is the one exception to the named-export convention — Expo's entry requires it.
export default function App() {
  return (
    <AppProviders>
      <View style={styles.container}>
        <Text>HouseCenter Mobile</Text>
      </View>
    </AppProviders>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
})
