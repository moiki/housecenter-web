import { MMKV } from 'react-native-mmkv'

// Encrypted store for the offline READ cache (may contain PHI at rest).
// TODO(#5): source `encryptionKey` from expo-secure-store instead of this static dev key.
export const cacheStorage = new MMKV({
  id: 'housecenter-cache',
  encryptionKey: 'dev-cache-key',
})
