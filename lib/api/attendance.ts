/**
 * Mock implementation of the TroveSuite Attendance client. Function
 * signatures and return shapes mirror the real endpoints noted above each
 * one — swap the internals here for real HTTP calls and every screen keeps
 * working unchanged.
 */
import { toDateKey } from "@/lib/format"
import {
  buildDay,
  getScenarioSeed,
  makePunch,
  resolveDay,
  type ScenarioKey,
  type ScenarioSeed,
} from "./mock-data"
import type { DayStatus, PunchResult, SessionContext, Timesheet } from "./types"

const LATENCY_MS = 400

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let activeScenario: ScenarioKey = "fresh_morning"
let seed: ScenarioSeed = getScenarioSeed(activeScenario, new Date())
let todayKey = toDateKey(new Date())

/** Dev-only: swap the active mock scenario. Not part of the real API surface. */
export function setScenario(key: ScenarioKey): void {
  activeScenario = key
  seed = getScenarioSeed(key, new Date())
  todayKey = toDateKey(new Date())
}

export function getActiveScenario(): ScenarioKey {
  return activeScenario
}

/** GET /api/me */
export async function getSessionContext(): Promise<SessionContext> {
  await sleep(LATENCY_MS)
  return seed.session
}

/** GET /v1/user/status?date= */
export async function getMyStatus(date: string): Promise<DayStatus> {
  await sleep(LATENCY_MS)
  const target = new Date(`${date}T00:00:00`)
  return resolveDay(seed, todayKey, target)
}

/** GET /v1/user/timesheet?from=&to= */
export async function getMyTimesheet(from: string, to: string): Promise<Timesheet> {
  await sleep(LATENCY_MS)
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  const days: DayStatus[] = []

  for (
    let cursor = start;
    cursor.getTime() <= end.getTime();
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    days.push(resolveDay(seed, todayKey, cursor))
  }

  const total_minutes = days.reduce((sum, day) => sum + day.total_minutes, 0)

  return { from, to, days, total_minutes }
}

/** POST /v1/user/punches */
export async function createPunch(): Promise<PunchResult> {
  await sleep(LATENCY_MS)

  if (seed.alwaysRejectPunch) {
    return {
      success: false,
      error: {
        code: "OFF_NETWORK",
        message: "You must be connected to your company's network to clock in.",
      },
    }
  }

  const lastPunch = seed.today.punches[seed.today.punches.length - 1]
  const direction = !lastPunch || lastPunch.direction === "out" ? "in" : "out"
  const nextIndex = seed.today.punches.length + 1
  const punch = makePunch(todayKey, nextIndex, direction, new Date())

  seed.today = buildDay(
    new Date(`${todayKey}T00:00:00`),
    [...seed.today.punches, punch],
    seed.today.adjustments,
  )

  return { success: true, punch }
}
