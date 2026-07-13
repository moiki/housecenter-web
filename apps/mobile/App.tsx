import { AppProviders } from './src/providers/AppProviders'
import { RootNavigator } from './src/navigation/RootNavigator'

// PR3: root now renders through AppProviders -> RootNavigator (native-stack -> bottom-tabs
// placeholder shell). Default export is the one exception to the named-export convention —
// Expo's entry requires it.
export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  )
}
