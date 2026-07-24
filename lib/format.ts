import { format, isSameMonth, isSameYear, parseISO } from "date-fns"

/** "Xh Ym" from a minute count stored internally. */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

/** "8:04 AM" from a server ISO timestamp. */
export function formatClockTime(iso: string): string {
  return format(parseISO(iso), "h:mm a")
}

/** "8:04:12 AM" from a server ISO timestamp, for the live server clock. */
export function formatClockTimeWithSeconds(iso: string): string {
  return format(parseISO(iso), "h:mm:ss a")
}

/** "Tuesday, July 14" from a yyyy-MM-dd day key. */
export function formatDayLabel(dateKey: string): string {
  return format(parseISO(dateKey), "EEEE, MMMM d")
}

/** "Jul 14" from a yyyy-MM-dd day key. */
export function formatShortDate(dateKey: string): string {
  return format(parseISO(dateKey), "MMM d")
}

/** "Mon" from a yyyy-MM-dd day key. */
export function formatWeekdayShort(dateKey: string): string {
  return format(parseISO(dateKey), "EEE")
}

/** yyyy-MM-dd key used throughout the API contract for day-level lookups. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/** Inverse of toDateKey — a local-midnight Date from a yyyy-MM-dd key. */
export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`)
}

/** "1–31 July 2026", "14–20 Jul 2026", or "12 Jun – 15 Jul 2026" depending
 *  on whether the range stays within one month/year. */
export function formatPeriodLabel(from: string, to: string): string {
  const fromDate = parseDateKey(from)
  const toDate = parseDateKey(to)

  if (isSameMonth(fromDate, toDate) && isSameYear(fromDate, toDate)) {
    return `${format(fromDate, "d")}–${format(toDate, "d MMMM yyyy")}`
  }
  if (isSameYear(fromDate, toDate)) {
    return `${format(fromDate, "d MMM")} – ${format(toDate, "d MMM yyyy")}`
  }
  return `${format(fromDate, "d MMM yyyy")} – ${format(toDate, "d MMM yyyy")}`
}

/** "Accra Hq" from a "loc_accra_hq"-style location id. */
export function formatLocationLabel(locationId: string): string {
  const parts = locationId.split(/[_-]/).filter((part) => part.toLowerCase() !== "loc")
  if (parts.length === 0) return locationId
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
}
