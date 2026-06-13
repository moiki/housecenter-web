import { useState } from 'react'
import { useUsers, useDeactivateUser } from '@/hooks/users/useUsers'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icon } from '@/components/shared/Icon'
import { Button } from '@/components/base/buttons/button'
import { Table, TableCard } from '@/components/application/table/table'
import type { UserResponse } from '@/types/user.types'

const ROLE_COLORS: Record<string, string> = {
  Owner:         'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Administrator: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Doctor:        'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Member:        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Sponsor:       'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  )
}

export function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const deactivate = useDeactivateUser()
  const [toDeactivate, setToDeactivate] = useState<UserResponse | null>(null)

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivate.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="All registered accounts in the system."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : !users?.length ? (
        <TableCard.Root>
          <div className="flex flex-col items-center gap-2 py-16 text-gray-500">
            <Icon name="shield" className="w-10 h-10 opacity-40" />
            <p className="text-sm">No users found.</p>
          </div>
        </TableCard.Root>
      ) : (
        <TableCard.Root>
          <TableCard.Header
            title="Users"
            badge={String(users.length)}
          />
          <Table selectionMode="none" aria-label="Users">
            <Table.Header>
              <Table.Head label="User" isRowHeader />
              <Table.Head label="Roles" />
              <Table.Head label="Status" />
              <Table.Head label="" />
            </Table.Header>
            <Table.Body>
              {users.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(r => <RoleBadge key={r} role={r} />)}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      <span className={`size-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {user.isActive && (
                      <Button
                        color="secondary-destructive"
                        size="sm"
                        onPress={() => setToDeactivate(user)}
                        aria-label="Deactivate"
                      >
                        <Icon name="x" className="w-4 h-4" />
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </TableCard.Root>
      )}

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate user"
        description={`${toDeactivate?.firstName} ${toDeactivate?.lastName} will lose access to the system.`}
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  )
}
