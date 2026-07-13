import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

type Props<T extends FieldValues> = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> & {
  control: Control<T>
  name: FieldPath<T>
  label?: string
}

// Controller-wrapped RN `TextInput` (D4) — the RN counterpart of web's `RHFTextField`. Renders
// null/undefined as '' to stay controlled (Zod owns the ''->null transform at the API boundary,
// same convention as web); shows the Zod error message from `fieldState` under the input. RN-only
// — must stay under apps/mobile, never packages/core (R7).
export function RHFTextInput<T extends FieldValues>({ control, name, label, style, ...rest }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.container}>
          {label && <Text style={styles.label}>{label}</Text>}
          <TextInput
            style={[styles.input, style]}
            placeholderTextColor="#9ca3af"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            {...rest}
          />
          {fieldState.error && <Text style={styles.error}>{fieldState.error.message}</Text>}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: '#dc2626', fontSize: 12 },
})
