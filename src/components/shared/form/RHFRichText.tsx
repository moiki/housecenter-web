import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { RichTextEditor } from '@/components/shared/RichTextEditor'

type Props<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  placeholder?: string
  config?: object
  helperText?: string
}

// RHF-wired rich-text editor. Mirrors RHFTextField: stores the HTML string in the form
// value; the Zod schema owns any '' -> null transform at the API boundary.
export function RHFRichText<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  config,
  helperText,
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <RichTextEditor
          label={label}
          placeholder={placeholder}
          config={config}
          value={field.value ?? ''}
          onChange={field.onChange}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
        />
      )}
    />
  )
}
