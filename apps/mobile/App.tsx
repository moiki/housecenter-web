import { StyleSheet, Text, View } from 'react-native'

// PR1 placeholder root. Providers (QueryClient/persister/i18n/connectivity) land in
// PR2 (`AppProviders`), navigation shell lands in PR3 (`RootNavigator`).
// Default export is the one exception to the named-export convention — Expo's entry requires it.
export default function App() {
  return (
    <View style={styles.container}>
      <Text>HouseCenter Mobile</Text>
    </View>
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
