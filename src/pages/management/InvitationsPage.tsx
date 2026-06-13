import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateInvitation, useResendInvitation, useDeleteInvitation } from '@/hooks/invitations/useInvitations'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { Button } from '@/components/base/buttons/button'
import { Table, TableCard } from '@/components/application/table/table'
import type { InvitationResponse } from '@/types/invitation.types'

const ROLES = [
  { id: 'owner-role-id',         label: 'Owner' },
  { id: 'administrator-role-id', label: 'Administrator' },
  { id: 'doctor-role-id',        label: 'Doctor' },
  { id: 'member-role-id',        label: 'Member' },
  { id: 'sponsor-role-id',       label: 'Sponsor' },
]

const STATUS_STYLES: Record<string, string> = {
  Pending:  'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Accepted: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Expired:  'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  roleId: z.string().min(1, 'Select a role'),
})
type FormData = z.infer<typeof schema>

function InviteForm({ onSubmit }: { onSubmit: (data: FormData) => Promise<void> }) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', roleId: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="Email"
            type="email"
            placeholder="colleague@example.com"
            isInvalid={!!errors.email}
            hint={errors.email?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="roleId"
        render={({ field }) => (
          <Select
            label="Role"
            placeholder="Select role"
            isInvalid={!!errors.roleId}
            hint={errors.roleId?.message}
            selectedKey={field.value || null}
            onSelectionChange={key => field.onChange(key)}
            items={ROLES}
          >
            {item => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        )}
      />

      <Button type="submit" isDisabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending…' : 'Send invitation'}
      </Button>
    </form>
  )
}

export function InvitationsPage() {
  const createInvitation = useCreateInvitation()
  const resendInvitation = useResendInvitation()
  const deleteInvitation = useDeleteInvitation()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDelete, setToDelete] = useState<InvitationResponse | null>(null)
  const [sent, setSent] = useState<InvitationResponse[]>([])

  const handleCreate = async (data: FormData) => {
    const inv = await createInvitation.mutateAsync(data)
    setSent(prev => [inv, ...prev])
    setSlideOpen(false)
  }

  const handleResend = async (id: string) => {
    await resendInvitation.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    await deleteInvitation.mutateAsync(toDelete.id)
    setSent(prev => prev.filter(i => i.id !== toDelete.id))
    setToDelete(null)
  }

  return (
    <div>
      <PageHeader
        title="Invitations"
        description="Invite new members to join HouseCenter."
        action={
          <Button onPress={() => setSlideOpen(true)}>
            <Icon name="mail" className="w-4 h-4" />
            Invite user
          </Button>
        }
      />

      {sent.length === 0 ? (
        <TableCard.Root>
          <div className="flex flex-col items-center gap-2 py-16 text-gray-500">
            <Icon name="mail" className="w-10 h-10 opacity-40" />
            <p className="text-sm">No invitations sent yet in this session.</p>
          </div>
        </TableCard.Root>
      ) : (
        <TableCard.Root>
          <TableCard.Header
            title="Invitations"
            badge={String(sent.length)}
          />
          <Table selectionMode="none" aria-label="Invitations">
            <Table.Header>
              <Table.Head label="Email" isRowHeader />
              <Table.Head label="Status" />
              <Table.Head label="Sent" />
              <Table.Head label="" />
            </Table.Header>
            <Table.Body>
              {sent.map((inv) => (
                <Table.Row key={inv.id}>
                  <Table.Cell>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{inv.email}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] ?? ''}`}>
                      {inv.status}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-gray-400">
                      {new Date(inv.createdDate).toLocaleDateString()}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === 'Pending' && (
                        <Button
                          color="secondary"
                          size="sm"
                          onPress={() => handleResend(inv.id)}
                          aria-label="Resend"
                        >
                          <Icon name="mail" className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        color="secondary-destructive"
                        size="sm"
                        onPress={() => setToDelete(inv)}
                        aria-label="Delete"
                      >
                        <Icon name="x" className="w-4 h-4" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </TableCard.Root>
      )}

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Invite user">
        <InviteForm onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete invitation"
        description={`The invitation to "${toDelete?.email}" will be permanently deleted.`}
        confirmLabel="Delete"
        loading={deleteInvitation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
