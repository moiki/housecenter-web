import { useEffect, useState } from 'react'
import { onlineManager } from '@tanstack/react-query'

// Small hook over `onlineManager.subscribe` (D7's `useOnline()` sketch in design.md) — every
// inline write-gated form (status-patch, create-detail, create-comment, ...) needs this same
// {isOnline, subscribe} pair; centralizing it avoids each form duplicating what `OfflineBanner`
// already does inline. Single source of truth stays `onlineManager` (bridged from NetInfo in
// `providers/connectivity.ts`). RN-only — must stay under apps/mobile, never packages/core (R7).
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline())
  useEffect(() => onlineManager.subscribe(() => setOnline(onlineManager.isOnline())), [])
  return online
}
