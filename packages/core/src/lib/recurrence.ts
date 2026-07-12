import dayjs from 'dayjs'
import type { WorkRouteResponse, Weekday } from 'core/types/workroute.types'

// dayjs `.day()`: 0=Sun..6=Sat. Index this array — Sunday at 0 (off-by-one guard).
export const DAYJS_INDEX_TO_WEEKDAY: Weekday[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/**
 * Expands each route's weekly-by-weekday recurrence rule into concrete occurrence
 * dates within `[fromDate, toDate]` (inclusive, 'YYYY-MM-DD' strings).
 *
 * PURE function — no `Date.now()`/`new Date()`, no I/O. Always parses with
 * `dayjs(str)` (never `new Date(str)`, which can shift the day across timezones)
 * and compares at `'day'` granularity so DST/UTC drift never matters for date-only
 * recurrence rules.
 */
export function expandOccurrences(
  routes: WorkRouteResponse[],
  fromDate: string,
  toDate: string,
): Map<string, WorkRouteResponse[]> {
  const map = new Map<string, WorkRouteResponse[]>()
  const from = dayjs(fromDate)
  const to = dayjs(toDate)

  for (let d = from; !d.isAfter(to, 'day'); d = d.add(1, 'day')) {
    const iso = d.format('YYYY-MM-DD')
    const weekday = DAYJS_INDEX_TO_WEEKDAY[d.day()]

    for (const route of routes) {
      if (route.recurrenceDays.length === 0) continue
      if (!route.recurrenceDays.includes(weekday)) continue

      const start = dayjs(route.recurrenceStartDate)
      if (d.isBefore(start, 'day')) continue

      if (!route.isRecurrenceIndefinite && route.recurrenceEndDate) {
        const end = dayjs(route.recurrenceEndDate)
        if (d.isAfter(end, 'day')) continue
      }

      const existing = map.get(iso)
      if (existing) {
        existing.push(route)
      } else {
        map.set(iso, [route])
      }
    }
  }

  return map
}
