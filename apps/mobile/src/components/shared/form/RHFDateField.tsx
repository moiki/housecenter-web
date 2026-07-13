import { useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  mode: 'date' | 'datetime'
}

// Controller-wrapped `@react-native-community/datetimepicker` (D5). Form state stores the value
// as an ISO string (empty until picked); every change converts via `toISOString()`, mirroring
// web's submit-time `new Date(v).toISOString()` (`SessionsTab.handleCreate`) — no divergence at
// the field boundary. Android has no combined datetime dialog, so `mode="datetime"` chains a
// date dialog then a time dialog via the imperative `DateTimePickerAndroid.open` API; iOS renders
// `mode` (which supports 'datetime' natively) inline once toggled open. RN-only — must stay under
// apps/mobile, never packages/core (R7).
export function RHFDateField<T extends FieldValues>({ control, name, label, mode }: Props<T>) {
  const [iosPickerOpen, setIosPickerOpen] = useState(false)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const current = field.value ? new Date(field.value) : new Date()
        const display = field.value
          ? mode === 'date'
            ? current.toLocaleDateString()
            : current.toLocaleString()
          : 'Seleccionar fecha'

        function onIosChange(event: DateTimePickerEvent, selected?: Date) {
          setIosPickerOpen(false)
          if (event.type === 'set' && selected) field.onChange(selected.toISOString())
        }

        function openAndroidTime(base: Date) {
          DateTimePickerAndroid.open({
            value: base,
            mode: 'time',
            onChange: (event, selected) => {
              if (event.type === 'set' && selected) field.onChange(selected.toISOString())
            },
          })
        }

        function open() {
          if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
              value: current,
              mode: 'date',
              onChange: (event, selected) => {
                if (event.type !== 'set' || !selected) return
                if (mode === 'datetime') openAndroidTime(selected)
                else field.onChange(selected.toISOString())
              },
            })
          } else {
            setIosPickerOpen(true)
          }
        }

        return (
          <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Pressable style={styles.trigger} onPress={open}>
              <Text style={field.value ? styles.triggerText : styles.triggerPlaceholder}>{display}</Text>
            </Pressable>
            {Platform.OS === 'ios' && iosPickerOpen && (
              <DateTimePicker value={current} mode={mode} display="spinner" onChange={onIosChange} />
            )}
            {fieldState.error && <Text style={styles.error}>{fieldState.error.message}</Text>}
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
})
