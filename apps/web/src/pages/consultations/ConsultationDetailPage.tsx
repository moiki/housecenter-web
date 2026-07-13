import { useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import SendOutlined from '@mui/icons-material/SendOutlined'
import {
  useConsultationDetail,
  usePostMessage,
  useUpdateConsultationStatus,
} from '@/hooks/consultations/useConsultations'
import { useAuthStore } from '@/store/auth.store'
import { RichTextView } from '@/components/shared/RichTextView'
import { RHFRichText } from '@/components/shared/form'
import type { ConsultationStatus } from 'core/types/consultation.types'

// ── Schema ────────────────────────────────────────────────────────────────────
const messageSchema = z.object({
  body: z.string().min(1, 'Message cannot be empty'),
})
type MessageForm = z.infer<typeof messageSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────
type ChipColor = 'default' | 'info' | 'warning' | 'success'
const STATUS_COLOR: Record<ConsultationStatus, ChipColor> = {
  Open: 'info',
  UnderReview: 'warning',
  Resolved: 'success',
}

const STATUS_ITEMS = [
  { id: 'Open', label: 'Open' },
  { id: 'UnderReview', label: 'Under Review' },
  { id: 'Resolved', label: 'Resolved' },
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
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

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { body: '' },
  })

  const onSend = async (form: MessageForm) => {
    await postMessage.mutateAsync({ body: form.body, attachmentUrl: null })
    reset()
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!data) {
    return (
      <Typography sx={{ textAlign: 'center', py: 8, color: 'text.secondary', fontSize: 14 }}>
        Consultation not found.
      </Typography>
    )
  }

  const { consultation, messages } = data
  const status = consultation.status as ConsultationStatus

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton onClick={() => navigate('/consultations')} aria-label="Back">
          <ArrowBackOutlined />
        </IconButton>
        <Typography variant="h6" noWrap sx={{ flex: 1, fontWeight: 600 }}>
          {consultation.title}
        </Typography>
        <Chip
          label={status === 'UnderReview' ? 'Under Review' : status}
          color={STATUS_COLOR[status] ?? 'default'}
          size="small"
        />
        <TextField
          select
          size="small"
          value={status}
          onChange={(e) => updateStatus.mutate({ status: e.target.value as ConsultationStatus })}
          sx={{ width: 160 }}
        >
          {STATUS_ITEMS.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Thread */}
      <Paper variant="outlined" sx={{ flex: 1, borderRadius: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 'calc(100vh - 20rem)' }}>
          {messages.length === 0 ? (
            <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', py: 4 }}>
              No messages yet.
            </Typography>
          ) : (
            messages.map((msg) => {
              const isMe = msg.authorId === user?.id
              return (
                <Box key={msg.id} sx={{ display: 'flex', gap: 1.5, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main', alignSelf: 'flex-end' }}>
                    {initials(msg.authorName)}
                  </Avatar>
                  <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 0.5 }}>
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: 3,
                        bgcolor: isMe ? 'primary.main' : 'action.hover',
                        color: isMe ? 'primary.contrastText' : 'text.primary',
                        ...(isMe ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }),
                      }}
                    >
                      <RichTextView
                        content={msg.body}
                        sx={{ '& .fr-view': { color: isMe ? 'primary.contrastText' : 'text.primary', fontSize: 14 } }}
                      />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', px: 0.5 }}>
                      {!isMe && (
                        <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary', mr: 0.5 }}>
                          {msg.authorName} ·
                        </Box>
                      )}
                      {formatTime(msg.createdDate)}
                    </Typography>
                  </Box>
                </Box>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Reply box */}
        {status !== 'Resolved' ? (
          <Box
            component="form"
            onSubmit={handleSubmit(onSend)}
            sx={{ borderTop: 1, borderColor: 'divider', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <RHFRichText control={control} name="body" placeholder="Write a message…" />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" startIcon={<SendOutlined />} loading={isSubmitting}>
                Send
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ borderTop: 1, borderColor: 'divider', px: 2.5, py: 1.5 }}>
            <Typography sx={{ fontSize: 12, textAlign: 'center', color: 'text.disabled' }}>
              This consultation is resolved. Change status to reply.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
