// Side-effect wiring MUST be imported first, before App — mirrors apps/web/src/main.tsx:1.
// Runs setAuthStore() -> setApiClient() -> initDeviceId() (see src/bootstrap.ts).
import './src/bootstrap'

import { registerRootComponent } from 'expo'

import App from './App'

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and sets up the environment appropriately whether you load the app in
// the Expo Go client or in a native build.
registerRootComponent(App)
