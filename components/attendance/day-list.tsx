import { ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusChip } from "@/components/attendance/status-chip"
import { cn } from "@/lib/utils"
import { formatClockTime, formatDuration, formatShortDate, formatWeekdayShort } from "@/lib/format"
import type { DayStatus } from "@/lib/api/types"

interface DayListProps {
  days: DayStatus[]
  totalMinutes: number
  periodLabel: string
  onSelectDay: (day: DayStatus) => void
}

function dateLabel(date: string): string {
  return `${formatWeekdayShort(date)} ${formatShortDate(date)}`
}

function timeCell(day: DayStatus, value: string | null): string {
  if (day.status !== "present" || !value) return "—"
  return formatClockTime(value)
}

function totalCell(day: DayStatus): string {
  return day.status === "present" ? formatDuration(day.total_minutes) : "—"
}

export function DayList({ days, totalMinutes, periodLabel, onSelectDay }: DayListProps) {
  // Most recent first, per spec — footer totals are unaffected by row order.
  const ordered = [...days].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      {/* Desktop / tablet: accessible table */}
      <div className="hidden sm:block">
        <Table>
          <TableCaption>Attendance for {periodLabel}, most recent day first.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Date</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">First in</TableHead>
              <TableHead scope="col">Last out</TableHead>
              <TableHead scope="col" className="text-right">
                Total
              </TableHead>
              <TableHead scope="col">Indicators</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.map((day) => {
              const hasAdjustment = day.adjustments.length > 0
              const hasAutoClosed = day.punches.some((p) => p.auto_closed)
              const isNonWorking = day.status === "non_working_day"

              return (
                <TableRow
                  key={day.date}
                  className={cn("cursor-pointer", isNonWorking && "text-muted-foreground/60")}
                  onClick={() => onSelectDay(day)}
                >
                  <th
                    scope="row"
                    className="p-3 text-left align-middle font-medium whitespace-nowrap text-foreground"
                  >
                    {dateLabel(day.date)}
                  </th>
                  <TableCell>
                    <StatusChip status={day.status} />
                  </TableCell>
                  <TableCell>{timeCell(day, day.first_in)}</TableCell>
                  <TableCell>{timeCell(day, day.last_out)}</TableCell>
                  <TableCell className="text-right tabular-nums">{totalCell(day)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {hasAdjustment && <Badge variant="secondary">Adjusted</Badge>}
                      {hasAutoClosed && <Badge variant="secondary">Auto-closed</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectDay(day)
                      }}
                      aria-label={`View details for ${dateLabel(day.date)}`}
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Period total</TableCell>
              <TableCell className="text-right tabular-nums">{formatDuration(totalMinutes)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Mobile: stacked, text-complete cards */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {ordered.map((day) => {
          const hasAdjustment = day.adjustments.length > 0
          const hasAutoClosed = day.punches.some((p) => p.auto_closed)
          const isNonWorking = day.status === "non_working_day"

          return (
            <li key={day.date}>
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  "w-full space-y-2 rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/10",
                  isNonWorking && "text-muted-foreground/60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{dateLabel(day.date)}</span>
                  <StatusChip status={day.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">First in</p>
                    <p>{timeCell(day, day.first_in)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last out</p>
                    <p>{timeCell(day, day.last_out)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="tabular-nums">{totalCell(day)}</p>
                  </div>
                </div>
                {(hasAdjustment || hasAutoClosed) && (
                  <div className="flex flex-wrap gap-1.5">
                    {hasAdjustment && <Badge variant="secondary">Adjusted</Badge>}
                    {hasAutoClosed && <Badge variant="secondary">Auto-closed</Badge>}
                  </div>
                )}
              </button>
            </li>
          )
        })}
        <li className="flex items-center justify-between rounded-2xl bg-muted/50 p-4 text-sm font-medium">
          <span>Period total</span>
          <span className="tabular-nums">{formatDuration(totalMinutes)}</span>
        </li>
      </ul>
    </>
  )
}
