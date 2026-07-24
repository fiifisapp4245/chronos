"use client"

import * as React from "react"
import {
  addMonths,
  addWeeks,
  endOfWeek,
  endOfMonth,
  isSameMonth,
  isSameWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns"

import { Skeleton } from "@/components/ui/skeleton"
import { DayDetailSheet } from "@/components/attendance/day-detail-sheet"
import { DayList } from "@/components/attendance/day-list"
import { MetricCard, ToggleMetricCard } from "@/components/attendance/metric-card"
import { PeriodFilter, type PeriodKind } from "@/components/attendance/period-filter"
import { WeekStrip } from "@/components/attendance/week-strip"
import { getMyTimesheet } from "@/lib/api/attendance"
import { getPersonTimesheet } from "@/lib/api/admin"
import { useScenario } from "@/lib/api/scenario-context"
import { formatPeriodLabel, toDateKey } from "@/lib/format"
import type { DayStatus, Timesheet } from "@/lib/api/types"

const WEEK_STARTS_ON = 1 as const

export interface TimesheetViewProps {
  /** Omit to view your own timesheet (Clock/Timesheet screen). Provide to
   *  view someone else's, read-only, from Records or Team. */
  personId?: string
  /** Shown in the header and the day-detail panel when viewing someone else. */
  personName?: string
  /** Presence enables the day-detail panel's "Add adjustment" action — only
   *  HR Admin contexts pass this. Team's drill-down never does (view-only). */
  onRequestAdjustment?: (day: DayStatus) => void
}

export function TimesheetView({ personId, personName, onRequestAdjustment }: TimesheetViewProps) {
  const { version } = useScenario()
  const todayKey = toDateKey(new Date())

  const fetchTimesheet = React.useCallback(
    (from: string, to: string): Promise<Timesheet> =>
      personId ? getPersonTimesheet(personId, from, to) : getMyTimesheet(from, to),
    [personId],
  )

  const [periodKind, setPeriodKind] = React.useState<PeriodKind>("month")
  const [monthCursor, setMonthCursor] = React.useState<Date | null>(null)
  const [weekCursor, setWeekCursor] = React.useState<Date | null>(null)
  const [customFrom, setCustomFrom] = React.useState("")
  const [customTo, setCustomTo] = React.useState("")

  const [periodDays, setPeriodDays] = React.useState<DayStatus[]>([])
  const [periodTotalMinutes, setPeriodTotalMinutes] = React.useState(0)
  const [periodLoading, setPeriodLoading] = React.useState(true)

  const [weekStripDays, setWeekStripDays] = React.useState<DayStatus[]>([])
  const [stripLoading, setStripLoading] = React.useState(true)

  const [selectedDay, setSelectedDay] = React.useState<DayStatus | null>(null)
  const [onlyAdjusted, setOnlyAdjusted] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")

  // Client-only init for anything date-dependent, so server and first client
  // render agree (and so a scenario switch never has to fight a stale cursor).
  React.useEffect(() => {
    const now = new Date()
    setMonthCursor(startOfMonth(now))
    setWeekCursor(startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }))
    setCustomTo(toDateKey(now))
    setCustomFrom(toDateKey(subDays(now, 13)))
  }, [])

  // This-week strip: always the real current week, independent of the filter.
  React.useEffect(() => {
    let cancelled = false
    setStripLoading(true)
    const now = new Date()
    const from = toDateKey(startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }))
    const to = toDateKey(endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }))

    fetchTimesheet(from, to).then((data) => {
      if (!cancelled) {
        setWeekStripDays(data.days)
        setStripLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [version, fetchTimesheet])

  const range = React.useMemo(() => {
    if (periodKind === "month" && monthCursor) {
      return { from: toDateKey(startOfMonth(monthCursor)), to: toDateKey(endOfMonth(monthCursor)) }
    }
    if (periodKind === "week" && weekCursor) {
      return {
        from: toDateKey(weekCursor),
        to: toDateKey(endOfWeek(weekCursor, { weekStartsOn: WEEK_STARTS_ON })),
      }
    }
    if (periodKind === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo }
    }
    return null
  }, [periodKind, monthCursor, weekCursor, customFrom, customTo])

  React.useEffect(() => {
    if (!range) return
    let cancelled = false
    setPeriodLoading(true)

    // Never request or display days that haven't happened yet.
    const clampedTo = range.to > todayKey ? todayKey : range.to
    const clampedFrom = range.from > clampedTo ? clampedTo : range.from

    fetchTimesheet(clampedFrom, clampedTo).then((data) => {
      if (!cancelled) {
        setPeriodDays(data.days)
        setPeriodTotalMinutes(data.total_minutes)
        setPeriodLoading(false)
        setOnlyAdjusted(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [range, todayKey, version, fetchTimesheet])

  const metrics = React.useMemo(() => {
    const daysPresent = periodDays.filter((d) => d.status === "present").length
    const daysNoRecord = periodDays.filter((d) => d.status === "no_record").length
    const adjustmentDays = periodDays.filter((d) => d.adjustments.length > 0).length
    const autoClosedDays = periodDays.filter((d) => d.punches.some((p) => p.auto_closed)).length
    return { daysPresent, daysNoRecord, adjustmentDays, autoClosedDays }
  }, [periodDays])

  const periodLabel = range ? formatPeriodLabel(range.from, range.to) : ""

  React.useEffect(() => {
    if (periodLoading || !periodLabel) return
    setAnnouncement(
      `Showing ${periodLabel}: ${metrics.daysPresent} days present, ${metrics.daysNoRecord} with no record.`,
    )
  }, [periodLoading, periodLabel, metrics.daysPresent, metrics.daysNoRecord])

  function handleKindChange(kind: PeriodKind) {
    setPeriodKind(kind)
    const now = new Date()
    if (kind === "month") setMonthCursor(startOfMonth(now))
    if (kind === "week") setWeekCursor(startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }))
  }

  function handlePrev() {
    if (periodKind === "month") setMonthCursor((cursor) => (cursor ? subMonths(cursor, 1) : cursor))
    if (periodKind === "week") setWeekCursor((cursor) => (cursor ? subWeeks(cursor, 1) : cursor))
  }

  function handleNext() {
    if (periodKind === "month") setMonthCursor((cursor) => (cursor ? addMonths(cursor, 1) : cursor))
    if (periodKind === "week") setWeekCursor((cursor) => (cursor ? addWeeks(cursor, 1) : cursor))
  }

  const canGoNext =
    periodKind === "month"
      ? monthCursor
        ? !isSameMonth(monthCursor, new Date())
        : false
      : periodKind === "week"
        ? weekCursor
          ? !isSameWeek(weekCursor, new Date(), { weekStartsOn: WEEK_STARTS_ON })
          : false
        : false

  const canGoPrev = periodKind !== "custom"

  const visibleDays = onlyAdjusted ? periodDays.filter((d) => d.adjustments.length > 0) : periodDays

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{personName ? `${personName} — Timesheet` : "Timesheet"}</h1>
        <p className="text-sm text-muted-foreground">{periodLabel || " "}</p>
      </div>

      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      <section aria-label="This week at a glance">
        {stripLoading ? (
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-14 shrink-0 rounded-lg" />
            ))}
          </div>
        ) : (
          <WeekStrip days={weekStripDays} />
        )}
      </section>

      <PeriodFilter
        kind={periodKind}
        onKindChange={handleKindChange}
        onPrev={handlePrev}
        onNext={handleNext}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        maxDate={todayKey}
      />

      {periodLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Days present"
            value={metrics.daysPresent}
            tooltip="Days with at least one punch recorded."
          />
          <MetricCard
            label="No record"
            value={metrics.daysNoRecord}
            tooltip="Working days with zero punches recorded."
          />
          <ToggleMetricCard
            label="Adjustments"
            value={metrics.adjustmentDays}
            tooltip="Days with a correction or an added punch. Select to filter the list below to just these days."
            pressed={onlyAdjusted}
            onPressedChange={setOnlyAdjusted}
          />
          <MetricCard
            label="Auto-closed days"
            value={metrics.autoClosedDays}
            tooltip="Days where the system inserted a clock-out at day end because none was recorded — you may have forgotten to clock out."
          />
        </div>
      )}

      {periodLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DayList
          days={visibleDays}
          totalMinutes={periodTotalMinutes}
          periodLabel={periodLabel}
          onSelectDay={setSelectedDay}
        />
      )}

      <DayDetailSheet
        day={selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        personName={personName}
        adjustAction={
          onRequestAdjustment && selectedDay
            ? {
                onRequest: () => onRequestAdjustment(selectedDay),
                disabled: selectedDay.date > todayKey,
                disabledReason: "Future dates cannot be adjusted.",
              }
            : undefined
        }
      />
    </div>
  )
}
