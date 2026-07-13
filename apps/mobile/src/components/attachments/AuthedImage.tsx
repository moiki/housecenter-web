import { Image, type ImageStyle } from 'expo-image'
import { useAuthStore } from '../../store/auth.store'
import { env } from '../../config/env'

// Bearer-gated thumbnail. The attachments download endpoint requires auth, so a bare
// <Image uri> would 401 — expo-image's `source.headers` is the only reliable way to attach
// a header per-request (Image.loadAsync/prefetch header support is unreliable, D3). Reading
// the token via a Zustand selector keeps the header reactive across 401-refresh rotation.
export function AuthedImage({ downloadUrl, style }: { downloadUrl: string; style?: ImageStyle }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return (
    <Image
      style={style}
      contentFit="cover"
      source={{
        uri: env.API_BASE_URL + downloadUrl,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      }}
    />
  )
}
