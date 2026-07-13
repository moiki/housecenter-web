import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface RHFSelectOption {
  value: string
  label: string
}

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  options: RHFSelectOption[]
  label?: string
}

// Controller-wrapped Pressable-pill group (D4) — for small, fixed enum sets (attentionType,
// locationMode, status, commentType). Larger option lists (clinics/work routes) use
// `RHFPickerField` instead. RN-only — must stay under apps/mobile, never packages/core (R7).
export function RHFSelect<T extends FieldValues>({ control, name, options, label }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.container}>
          {label && <Text style={styles.label}>{label}</Text>}
          <View style={styles.row}>
            {options.map((opt) => {
              const active = field.value === opt.value
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => field.onChange(opt.value)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={active ? styles.pillTextActive : styles.pillText}>{opt.label}</Text>
                </Pressable>
              )
            })}
          </View>
          {fieldState.error && <Text style={styles.error}>{fieldState.error.message}</Text>}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 14, color: '#374151' },
  pillTextActive: { fontSize: 14, color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 12 },
})
