import { useQuery } from '@tanstack/react-query'
import { rolesApi } from 'core/api/modules/roles.api'

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
}

export function useRoles() {
  return useQuery({ queryKey: roleKeys.list(), queryFn: rolesApi.list })
}
