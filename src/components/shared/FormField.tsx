import type { ReactNode } from 'react'
import { Input } from '@/components/base/input/input'
import { TextArea } from '@/components/base/textarea/textarea'

interface BaseProps {
  label: string
  error?: string
  hint?: ReactNode
  name?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  autoComplete?: string
  defaultValue?: string
  value?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>
}

type Props = BaseProps & { as?: 'input' | 'textarea' }

export function FormField({ label, error, hint, as, onChange, onBlur, value, defaultValue, ...rest }: Props) {
  const isInvalid = !!error
  const sharedProps = {
    label,
    hint: error ?? hint,
    isInvalid,
    ...rest,
  }

  if (as === 'textarea') {
    return (
      <TextArea
        {...sharedProps}
        onChange={(v: string) => onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLTextAreaElement>)}
        defaultValue={defaultValue}
        value={value}
      />
    )
  }

  return (
    <Input
      {...sharedProps}
      onChange={(v: string) => onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)}
      defaultValue={defaultValue}
      value={value}
    />
  )
}
