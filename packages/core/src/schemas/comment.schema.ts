import { z } from 'zod'

export const commentSchema = z.object({
  body: z.string().min(1, 'Comment is required'),
  type: z.enum(['Route', 'Medical', 'Simple']),
})

export type CommentFormData = z.infer<typeof commentSchema>
