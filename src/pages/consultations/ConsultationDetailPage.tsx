import { useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useConsultationDetail,
  usePostMessage,
  useUpdateConsultationStatus,
} from '@/hooks/consultations/useConsultations'
import { useAuthStore } from '@/store/auth.store'
import { Icon } from '@/components/shared/Icon'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { Button } from '@/components/base/buttons/button'
import type { ConsultationStatus } from '@/types/consultation.types'

// ── Schema ────────────────────────────────────────────────────────────────────
const messageSchema = z.object({
  body: z.string().min(1, 'Message cannot be empty'),
})
type MessageForm = z.infer<typeof messageSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<ConsultationStatus, string> = {
  Open:        'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  UnderReview: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Resolved:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const STATUS_ITEMS = [
  { id: 'Open', label: 'Open' },
  { id: 'UnderReview', label: 'Under Review' },
  { id: 'Resolved', label: 'Resolved' },
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useConsultationDetail(id!)
  const postMessage = usePostMessage(id!)
  const updateStatus = useUpdateConsultationStatus(id!)

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { body: '' },
  })

  const onSend = async (form: MessageForm) => {
    await postMessage.mutateAsync({ body: form.body, attachmentUrl: null })
    reset()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Consultation not found.
      </div>
    )
  }

  const { consultation, messages } = data
  const status = consultation.status as ConsultationStatus

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/consultations')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back"
        >
          <Icon name="chevron" className="w-4 h-4 -rotate-90" />
        </button>
        <h1 className="text-xl font-semibold text-[var(--hc-text-primary)] flex-1 truncate">
          {consultation.title}
        </h1>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[status]}`}>
          {status === 'UnderReview' ? 'Under Review' : status}
        </span>
        <Select
          items={STATUS_ITEMS}
          selectedKey={status}
          onSelectionChange={(k) => updateStatus.mutate({ status: k as ConsultationStatus })}
          className="w-40"
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      </div>

      {/* Thread */}
      <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[calc(100vh-20rem)]">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No messages yet.</p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.authorId === user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 self-end">
                    <span className="text-white text-xs font-semibold">
                      {msg.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-[var(--hc-text-primary)] rounded-bl-sm'
                    }`}>
                      {msg.body}
                    </div>
                    <span className="text-xs text-[var(--hc-text-tertiary)] px-1">
                      {!isMe && <span className="font-medium text-gray-600 dark:text-gray-400 mr-1">{msg.authorName} ·</span>}
                      {formatTime(msg.createdDate)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply box */}
        {status !== 'Resolved' && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-4">
            <form onSubmit={handleSubmit(onSend)} className="flex gap-3 items-end">
              <div className="flex-1">
                <Controller control={control} name="body" render={({ field }) => (
                  <Input
                    placeholder="Write a message…"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )} />
              </div>
              <Button type="submit" isLoading={isSubmitting} className="flex-shrink-0 mb-0.5">
                <Icon name="send" className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

        {status === 'Resolved' && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3">
            <p className="text-xs text-center text-[var(--hc-text-tertiary)]">
              This consultation is resolved. Change status to reply.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
