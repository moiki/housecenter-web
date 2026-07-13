import { useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

export interface RHFPickerOption {
  value: string
  label: string
}

interface UsePickerOptionsResult {
  data?: RHFPickerOption[]
  isLoading?: boolean
}

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  placeholder?: string
  // Small per-feature hook (e.g. `useClinicOptions`, `useWorkRouteOptions` — wired in PR4) that
  // adapts a core paged query into `{ value, label }[]`. Keeps this wrapper domain-agnostic (D4).
  useOptions: () => UsePickerOptionsResult
}

// Controller-wrapped RN `Modal` + `FlatList` picker (D4) — for large option lists (clinics/work
// routes) where a pill row (`RHFSelect`) would overflow. No new native picker dep: a full-screen
// modal sheet with a scrollable list covers both large-list cases named in the design. RN-only —
// must stay under apps/mobile, never packages/core (R7).
export function RHFPickerField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  useOptions,
}: Props<T>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data: options = [], isLoading } = useOptions()
  // Hooks can't be called inside a default-param expression (`t` must resolve after
  // `useTranslation()` runs), so the i18n'd fallback is computed here instead (design.md D4, R4).
  const resolvedPlaceholder = placeholder ?? t('common.select')

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = options.find((o) => o.value === field.value)
        return (
          <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Pressable
              style={styles.trigger}
              onPress={() => setOpen(true)}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={label ?? resolvedPlaceholder}
            >
              <Text style={selected ? styles.triggerText : styles.triggerPlaceholder}>
                {selected?.label ?? resolvedPlaceholder}
              </Text>
            </Pressable>
            {fieldState.error && <Text style={styles.error}>{fieldState.error.message}</Text>}

            <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
              <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                <View style={styles.sheet}>
                  <FlatList
                    data={options}
                    keyExtractor={(o) => o.value}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.option}
                        onPress={() => {
                          field.onChange(item.value)
                          setOpen(false)
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                      >
                        <Text style={styles.optionText}>{item.label}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              </Pressable>
            </Modal>
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  trigger: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerText: { fontSize: 16, color: '#111827' },
  triggerPlaceholder: { fontSize: 16, color: '#9ca3af' },
  error: { color: '#dc2626', fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    maxHeight: '60%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 8,
  },
  option: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionText: { fontSize: 16 },
})
