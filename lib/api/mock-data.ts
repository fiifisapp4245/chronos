import { addDays, getISODay, startOfDay, startOfMonth, subDays, subMinutes } from "date-fns"

import { toDateKey } from "@/lib/format"
import type {
  Adjustment,
  DayStatus,
  DayStatusValue,
  Punch,
  PunchDirection,
  SessionContext,
} from "./types"

/** Internal only — no endpoint exposes this; it just drives non_working_day
 *  derivation and the sparse-month scenario below. */
interface WorkingWeekConfig {
  working_weekdays: number[]
}

export type ScenarioKey =
  | "fresh_morning"
  | "midday_clocked_in"
  | "day_complete"
  | "off_network"
  | "lunch_double_pair"
  | "month_adjustments"
  | "forgot_clock_out"
  | "sparse_month"

export interface ScenarioDescriptor {
  key: ScenarioKey
  label: string
  description: string
}

export const SCENARIOS: ScenarioDescriptor[] = [
  {
    key: "fresh_morning",
    label: "Fresh morning",
    description: "Not clocked in yet today.",
  },
  {
    key: "midday_clocked_in",
    label: "Mid-day clocked in",
    description: "Clocked in this morning, still on the clock.",
  },
  {
    key: "day_complete",
    label: "Day complete",
    description: "Clocked in and out for the day.",
  },
  {
    key: "off_network",
    label: "Off network",
    description: "Clock-in is rejected — off the company network.",
  },
  {
    key: "lunch_double_pair",
    label: "Lunch-break double pair",
    description: "Out and back in for lunch — four punches today.",
  },
  {
    key: "month_adjustments",
    label: "Month with adjustments",
    description: "This month includes corrected and missing-punch adjustments.",
  },
  {
    key: "forgot_clock_out",
    label: "Forgot to clock out (auto-closed)",
    description: "Yesterday's clock-out was inserted automatically at day end.",
  },
  {
    key: "sparse_month",
    label: "Sparse month (mostly no record)",
    description: "Barely clocked in this month — mostly no record.",
  },
]

export const SESSION_CONTEXT: SessionContext = {
  user_id: "usr_2001",
  display_name: "Jordan Blake",
  business_name: "Solari Logistics",
  app_id: "trovesuite-attendance-web",
  location_id: "loc_accra_hq",
  role: "employee",
}

/** Mon–Fri by default (ISO weekday numbers). */
const WORKING_WEEK: WorkingWeekConfig = {
  working_weekdays: [1, 2, 3, 4, 5],
}

function isWorkingWeekday(date: Date): boolean {
  return WORKING_WEEK.working_weekdays.includes(getISODay(date))
}

const MANAGER_NAME = "Amara Osei (Manager)"

function punchId(dateKey: string, index: number): string {
  return `punch_${dateKey}_${index}`
}

function adjustmentId(dateKey: string, index: number): string {
  return `adj_${dateKey}_${index}`
}

export function makePunch(
  dateKey: string,
  index: number,
  direction: PunchDirection,
  timestamp: Date,
  autoClosed = false,
): Punch {
  return {
    id: punchId(dateKey, index),
    direction,
    timestamp: timestamp.toISOString(),
    capture_source: "web",
    auto_closed: autoClosed,
  }
}

interface TimeEntry {
  direction: PunchDirection
  timestamp: string
}

function effectiveEntries(punches: Punch[], adjustments: Adjustment[]): TimeEntry[] {
  const overriddenIds = new Set(
    adjustments.filter((a) => a.references_punch_id).map((a) => a.references_punch_id),
  )
  const entries: TimeEntry[] = punches
    .filter((p) => !overriddenIds.has(p.id))
    .map((p) => ({ direction: p.direction, timestamp: p.timestamp }))

  for (const adjustment of adjustments) {
    entries.push({ direction: adjustment.adjusted_direction, timestamp: adjustment.adjusted_timestamp })
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

function sumPairedMinutes(entries: TimeEntry[]): number {
  let total = 0
  let openInMs: number | null = null

  for (const entry of entries) {
    const ms = new Date(entry.timestamp).getTime()
    if (entry.direction === "in") {
      openInMs = ms
    } else if (entry.direction === "out" && openInMs !== null) {
      total += Math.round((ms - openInMs) / 60_000)
      openInMs = null
    }
  }

  return total
}

function deriveStatus(nonWorkingDay: boolean, punchCount: number): DayStatusValue {
  if (punchCount > 0) return "present"
  return nonWorkingDay ? "non_working_day" : "no_record"
}

export function buildDay(date: Date, punches: Punch[], adjustments: Adjustment[] = []): DayStatus {
  const dateKey = toDateKey(date)
  const sortedPunches = [...punches].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const entries = effectiveEntries(sortedPunches, adjustments)

  const ins = entries.filter((e) => e.direction === "in")
  const outs = entries.filter((e) => e.direction === "out")

  return {
    date: dateKey,
    status: deriveStatus(!isWorkingWeekday(date), sortedPunches.length),
    first_in: ins[0]?.timestamp ?? null,
    last_out: outs.length > 0 ? outs[outs.length - 1].timestamp : null,
    total_minutes: sumPairedMinutes(entries),
    punches: sortedPunches,
    adjustments,
  }
}

/** Deterministic filler for any date a scenario doesn't specifically narrate. */
export function generateDefaultDay(date: Date): DayStatus {
  const dateKey = toDateKey(date)

  if (!isWorkingWeekday(date)) {
    return buildDay(date, [])
  }

  const dayStart = startOfDay(date)
  const wobble = (date.getDate() * 7) % 20
  const inTime = new Date(dayStart.getTime() + (8 * 60 + wobble) * 60_000)
  const outTime = new Date(dayStart.getTime() + (17 * 60 + wobble) * 60_000)

  return buildDay(date, [
    makePunch(dateKey, 1, "in", inTime),
    makePunch(dateKey, 2, "out", outTime),
  ])
}

/** A day with an in-punch auto-closed by the system at day end. */
function buildAutoClosedDay(date: Date): DayStatus {
  const dateKey = toDateKey(date)
  const dayStart = startOfDay(date)
  const inTime = new Date(dayStart.getTime() + 8 * 60 * 60_000 + 6 * 60_000)
  const autoCloseTime = new Date(dayStart.getTime() + 23 * 60 * 60_000 + 59 * 60_000)

  return buildDay(date, [
    makePunch(dateKey, 1, "in", inTime),
    makePunch(dateKey, 2, "out", autoCloseTime, true),
  ])
}

/** A day whose clock-in punch was corrected by a manager after the fact. */
function buildCorrectedPunchDay(date: Date): DayStatus {
  const dateKey = toDateKey(date)
  const dayStart = startOfDay(date)
  const recordedIn = new Date(dayStart.getTime() + 9 * 60 * 60_000 + 15 * 60_000)
  const correctedIn = new Date(dayStart.getTime() + 9 * 60 * 60_000)
  const outTime = new Date(dayStart.getTime() + 17 * 60 * 60_000)

  const inPunch = makePunch(dateKey, 1, "in", recordedIn)
  const outPunch = makePunch(dateKey, 2, "out", outTime)

  const adjustment: Adjustment = {
    id: adjustmentId(dateKey, 1),
    references_punch_id: inPunch.id,
    adjusted_direction: "in",
    adjusted_timestamp: correctedIn.toISOString(),
    reason: "Badge reader was offline at entry; corrected to scheduled arrival time.",
    adjusted_by: MANAGER_NAME,
    created_at: new Date(dayStart.getTime() + 24 * 60 * 60_000 + 10 * 60 * 60_000).toISOString(),
  }

  return buildDay(date, [inPunch, outPunch], [adjustment])
}

/** A day where the clock-out was never punched, so a manager added it. */
function buildMissingPunchAdjustmentDay(date: Date): DayStatus {
  const dateKey = toDateKey(date)
  const dayStart = startOfDay(date)
  const inTime = new Date(dayStart.getTime() + 8 * 60 * 60_000 + 2 * 60_000)
  const addedOut = new Date(dayStart.getTime() + 17 * 60 * 60_000)

  const inPunch = makePunch(dateKey, 1, "in", inTime)

  const adjustment: Adjustment = {
    id: adjustmentId(dateKey, 1),
    references_punch_id: null,
    adjusted_direction: "out",
    adjusted_timestamp: addedOut.toISOString(),
    reason: "Employee forgot to clock out; added based on manager confirmation.",
    adjusted_by: MANAGER_NAME,
    created_at: new Date(dayStart.getTime() + 24 * 60 * 60_000 + 9 * 60 * 60_000).toISOString(),
  }

  return buildDay(date, [inPunch], [adjustment])
}

function buildNoRecordDay(date: Date): DayStatus {
  return buildDay(date, [])
}

/**
 * Steps back `n` WORKING days (not calendar days) from `from`. A fixed
 * calendar-day offset drifts onto weekends depending on what day "today"
 * happens to be, which can silently swap a scenario's narrative day (e.g.
 * a "no_record" example) for a non_working_day that masks it. Stepping by
 * working days keeps these examples stable regardless of today's weekday.
 */
function nthPriorWorkingDay(from: Date, n: number): Date {
  let cursor = from
  let remaining = n
  while (remaining > 0) {
    cursor = subDays(cursor, 1)
    if (isWorkingWeekday(cursor)) remaining -= 1
  }
  return cursor
}

/** Mostly no_record from the start of the month through today, with an
 *  occasional present day so the narrative isn't a flat wall of blanks. */
function buildSparseMonthOverrides(today: Date): Map<string, DayStatus> {
  const overrides = new Map<string, DayStatus>()
  let cursor = startOfMonth(today)
  let workingDayIndex = 0

  while (cursor.getTime() <= today.getTime()) {
    if (isWorkingWeekday(cursor)) {
      const day = workingDayIndex % 6 === 0 ? generateDefaultDay(cursor) : buildNoRecordDay(cursor)
      overrides.set(toDateKey(cursor), day)
      workingDayIndex += 1
    }
    cursor = addDays(cursor, 1)
  }

  return overrides
}

/** Baseline narrative days layered under every scenario so the Status and
 *  Timesheet screens always have an adjustment example and an auto-closed
 *  example nearby, regardless of which scenario is selected. */
function baselineOverrides(today: Date): Map<string, DayStatus> {
  const overrides = new Map<string, DayStatus>()
  const autoClosedDate = nthPriorWorkingDay(today, 2)
  const correctedDate = nthPriorWorkingDay(today, 4)
  overrides.set(toDateKey(autoClosedDate), buildAutoClosedDay(autoClosedDate))
  overrides.set(toDateKey(correctedDate), buildCorrectedPunchDay(correctedDate))
  return overrides
}

export interface ScenarioSeed {
  session: SessionContext
  today: DayStatus
  overrides: Map<string, DayStatus>
  alwaysRejectPunch: boolean
}

/**
 * Steps back `minutes` from `end`, but never earlier than `dayStart` — so a
 * demo run in the early morning can't produce a punch dated the previous
 * calendar day while the record is labeled "today".
 */
function minutesBefore(end: Date, minutes: number, dayStart: Date): Date {
  const availableMinutes = Math.max(0, Math.round((end.getTime() - dayStart.getTime()) / 60_000))
  const clampedMinutes = Math.min(minutes, availableMinutes)
  return new Date(end.getTime() - clampedMinutes * 60_000)
}

function buildTodayForScenario(key: ScenarioKey, today: Date): DayStatus {
  const dateKey = toDateKey(today)
  const dayStart = startOfDay(today)
  const now = new Date()
  // Anchor "now" inside today's calendar day so scenarios stay coherent even
  // when the demo runs near midnight in either direction.
  const clampedNow = now.getTime() < dayStart.getTime() ? dayStart : now

  switch (key) {
    case "fresh_morning":
    case "off_network":
    case "sparse_month":
      return buildDay(today, [])

    case "midday_clocked_in": {
      const inTime = minutesBefore(clampedNow, 3 * 60, dayStart)
      return buildDay(today, [makePunch(dateKey, 1, "in", inTime)])
    }

    case "day_complete": {
      const outTime = subMinutes(clampedNow, 30)
      const inTime = minutesBefore(outTime, 9 * 60 + 10, dayStart)
      return buildDay(today, [
        makePunch(dateKey, 1, "in", inTime),
        makePunch(dateKey, 2, "out", outTime),
      ])
    }

    case "lunch_double_pair": {
      const out2 = subMinutes(clampedNow, 15)
      const desiredMorning = 4 * 60
      const desiredLunch = 45
      const desiredAfternoon = 4 * 60
      const desiredTotal = desiredMorning + desiredLunch + desiredAfternoon
      const availableTotal = Math.max(
        0,
        Math.round((out2.getTime() - dayStart.getTime()) / 60_000),
      )
      const scale = availableTotal < desiredTotal ? availableTotal / desiredTotal : 1

      const in2 = new Date(out2.getTime() - desiredAfternoon * scale * 60_000)
      const out1 = new Date(in2.getTime() - desiredLunch * scale * 60_000)
      const in1 = new Date(out1.getTime() - desiredMorning * scale * 60_000)

      return buildDay(today, [
        makePunch(dateKey, 1, "in", in1),
        makePunch(dateKey, 2, "out", out1),
        makePunch(dateKey, 3, "in", in2),
        makePunch(dateKey, 4, "out", out2),
      ])
    }

    case "month_adjustments":
    case "forgot_clock_out":
      return generateDefaultDay(today)
  }
}

export function getScenarioSeed(key: ScenarioKey, today: Date): ScenarioSeed {
  const overrides = baselineOverrides(today)

  if (key === "month_adjustments") {
    const missingPunchDate = nthPriorWorkingDay(today, 6)
    const noRecordDate = nthPriorWorkingDay(today, 9)
    overrides.set(toDateKey(missingPunchDate), buildMissingPunchAdjustmentDay(missingPunchDate))
    overrides.set(toDateKey(noRecordDate), buildNoRecordDay(noRecordDate))
  }

  if (key === "sparse_month") {
    // Baseline's auto-closed/adjustment days win where they overlap, so
    // those examples stay visible even in an otherwise sparse month.
    for (const [dateKey, day] of buildSparseMonthOverrides(today)) {
      if (!overrides.has(dateKey)) overrides.set(dateKey, day)
    }
  }

  return {
    session: SESSION_CONTEXT,
    today: buildTodayForScenario(key, today),
    overrides,
    alwaysRejectPunch: key === "off_network",
  }
}

export function resolveDay(seed: ScenarioSeed, todayKey: string, date: Date): DayStatus {
  const dateKey = toDateKey(date)
  if (dateKey === todayKey) return seed.today
  const override = seed.overrides.get(dateKey)
  if (override) return override
  return generateDefaultDay(date)
}
