import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LoadingState } from './LoadingState'
import { EmptyState } from './EmptyState'

interface QueryBoundaryProps<T> {
  isLoading: boolean
  isError: boolean
  data: T | undefined
  isEmpty?: (data: T) => boolean
  children: (data: T) => ReactNode
}

// Generic loading/error/empty wrapper around any query-shaped state — works directly with
// TanStack Query's `useQuery` result fields ({ data, isLoading, isError }), so each feature
// screen doesn't re-derive the same three branches. RN-only — must stay under apps/mobile, never
// packages/core (R7).
export function QueryBoundary<T>({ isLoading, isError, data, isEmpty, children }: QueryBoundaryProps<T>) {
  const { t } = useTranslation()

  if (isLoading) return <LoadingState />

  if (isError) {
    return (
      <View style={styles.container} testID="query-boundary-error">
        <Text>{t('common.error')}</Text>
      </View>
    )
  }

  if (data === undefined || (isEmpty ? isEmpty(data) : false)) return <EmptyState />

  return <>{children(data)}</>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
