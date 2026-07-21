import { formatWeekdayShort, toDateKey } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DayStatus } from "@/lib/api/types"

interface WeekStripProps {
  days: DayStatus[]
}

const STATUS_LABEL: Record<DayStatus["status"], string> = {
  present: "Present",
  no_record: "No record",
  non_working_day: "Non-working day",
}

/** Text-bearing glyph for each status — never color-only. */
const STATUS_GLYPH: Record<DayStatus["status"], string> = {
  present: "✓",
  no_record: "–",
  non_working_day: "",
}

/** Compact this-week-at-a-glance strip. Always the real current week,
 *  independent of the period filter — a text/aria-labelled replacement
 *  for the calendar grid's at-a-glance function. */
export function WeekStrip({ days }: WeekStripProps) {
  const todayKey = toDateKey(new Date())

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex w-max gap-2 pb-1" role="group" aria-label="This week at a glance">
        {days.map((day) => {
          const isToday = day.date === todayKey
          const isClockedIn = isToday && day.punches[day.punches.length - 1]?.direction === "in"
          const label = isClockedIn
            ? `Today, ${STATUS_LABEL[day.status]}, currently clocked in`
            : isToday
              ? `Today, ${STATUS_LABEL[day.status]}`
              : STATUS_LABEL[day.status]

          return (
            <div
              key={day.date}
              className={cn(
                "relative flex min-w-14 shrink-0 flex-col items-center gap-1 rounded-lg border border-transparent px-2 py-2",
                isToday && "border-primary",
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {formatWeekdayShort(day.date)}
              </span>
              <span
                className="flex h-5 w-5 items-center justify-center text-sm font-medium"
                aria-hidden="true"
              >
                {STATUS_GLYPH[day.status]}
              </span>
              {isClockedIn && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
              <span className="sr-only">
                {formatWeekdayShort(day.date)}: {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
