/**
 * Mock org roster — the "other people" the single logged-in test user can
 * see through HR Admin (records/adjustments/devices) or Team (manager/HoD/
 * dotted-line) screens. Independent of the attendance scenario and persona:
 * this directory and its day data don't change when you switch either.
 */
import { startOfDay } from "date-fns"

import { toDateKey } from "@/lib/format"
import { buildDay, isWorkingWeekday, makePunch, nthPriorWorkingDay } from "./mock-data"
import type { Adjustment, DayStatus } from "./types"

export interface Person {
  id: string
  name: string
  department: string
  location_id: string
}

const FIRST_NAMES = [
  "Ama", "Kwesi", "Efua", "Kojo", "Adjoa", "Kofi", "Akosua", "Yaw", "Abena", "Kwame",
  "Fatima", "Daniel", "Grace", "Samuel", "Linda", "Michael", "Comfort", "Peter", "Joyce", "Emmanuel",
  "Vivian", "Isaac", "Patricia", "Eric", "Gifty", "Prince", "Mabel", "Solomon", "Rita", "Nana",
]

const LAST_NAMES = [
  "Mensah", "Owusu", "Boateng", "Asante", "Appiah", "Darko", "Osei", "Agyei", "Sarpong", "Antwi",
  "Frimpong", "Adjei", "Amoah", "Yeboah", "Acheampong", "Bonsu", "Kusi", "Nkrumah", "Tetteh", "Quaye",
]

export const LOCATIONS = ["loc_accra_hq", "loc_kumasi"]

/** Engineering listed first so its members land at indexes 0-11 — the
 *  first 4 are "my direct reports", the whole department is the HoD scope. */
const DEPARTMENT_SIZES: Array<[string, number]> = [
  ["Engineering", 12],
  ["Sales", 10],
  ["Support", 10],
  ["Finance", 10],
  ["Operations", 10],
  ["People", 8],
]

export const DEPARTMENTS = DEPARTMENT_SIZES.map(([name]) => name)

export const PERSONS: Person[] = (() => {
  const persons: Person[] = []
  let index = 0
  for (const [department, size] of DEPARTMENT_SIZES) {
    for (let i = 0; i < size; i++) {
      const first = FIRST_NAMES[index % FIRST_NAMES.length]
      const last = LAST_NAMES[(index * 7) % LAST_NAMES.length]
      persons.push({
        id: `person_${index + 1}`,
        name: `${first} ${last}`,
        department,
        location_id: LOCATIONS[index % LOCATIONS.length],
      })
      index += 1
    }
  }
  return persons
})()

export const ENGINEERING_DEPARTMENT = "Engineering"

/** First 4 Engineering persons — the Line Manager persona's direct reports. */
export const DIRECT_REPORT_IDS = PERSONS.filter((p) => p.department === ENGINEERING_DEPARTMENT)
  .slice(0, 4)
  .map((p) => p.id)

/** 2 persons outside Engineering — dotted-line visibility, so the
 *  difference between scopes is visible in the demo. */
export const DOTTED_REPORT_IDS = PERSONS.filter((p) => p.department === "Sales")
  .slice(0, 2)
  .map((p) => p.id)

export function findPerson(personId: string): Person | undefined {
  return PERSONS.find((p) => p.id === personId)
}

function personIndexOf(personId: string): number {
  return PERSONS.findIndex((p) => p.id === personId)
}

const HR_ADMIN_NAME = "Amara Osei (HR Admin)"

/** In-memory store of adjustments created during this session, keyed by
 *  "personId:date". Org data is otherwise generated on the fly (pure
 *  function of person + date), so anything the demo actually creates needs
 *  somewhere to persist for the rest of the session. */
const createdAdjustments = new Map<string, Adjustment[]>()

function adjustmentStoreKey(personId: string, dateKey: string): string {
  return `${personId}:${dateKey}`
}

export function getCreatedAdjustments(personId: string, dateKey: string): Adjustment[] {
  return createdAdjustments.get(adjustmentStoreKey(personId, dateKey)) ?? []
}

export function appendCreatedAdjustment(personId: string, dateKey: string, adjustment: Adjustment): void {
  const key = adjustmentStoreKey(personId, dateKey)
  const existing = createdAdjustments.get(key) ?? []
  createdAdjustments.set(key, [...existing, adjustment])
}

/**
 * Deterministic per-person day generator. A handful of persons (by index,
 * so it's stable across calls) get an auto-closed day, a superseded punch,
 * or an added missing punch a few working days back, and a fifth of the
 * roster runs "sparse" (mostly no_record) this month — enough variety that
 * Records filters (has-adjustment, auto-closed, status) return something.
 */
export function resolvePersonDay(personId: string, date: Date): DayStatus {
  const personIndex = personIndexOf(personId)
  const dateKey = toDateKey(date)
  const idPrefix = `${personId}_${dateKey}`
  const today = new Date()

  const hasAutoClosed = personIndex >= 0 && personIndex % 9 === 0
  const hasSupersede = personIndex >= 0 && personIndex % 7 === 0
  const hasAddSingle = personIndex >= 0 && personIndex % 11 === 3
  const isSparse = personIndex >= 0 && personIndex % 5 === 0

  const createdForDay = getCreatedAdjustments(personId, dateKey)

  if (hasAutoClosed && toDateKey(nthPriorWorkingDay(today, 2)) === dateKey) {
    const dayStart = startOfDay(date)
    const inTime = new Date(dayStart.getTime() + 8 * 60 * 60_000 + 10 * 60_000)
    const autoCloseTime = new Date(dayStart.getTime() + 23 * 60 * 60_000 + 59 * 60_000)
    return buildDay(
      date,
      [makePunch(idPrefix, 1, "in", inTime), makePunch(idPrefix, 2, "out", autoCloseTime, true)],
      createdForDay,
    )
  }

  if (hasSupersede && toDateKey(nthPriorWorkingDay(today, 4)) === dateKey) {
    const dayStart = startOfDay(date)
    const recordedIn = new Date(dayStart.getTime() + 9 * 60 * 60_000 + 20 * 60_000)
    const correctedIn = new Date(dayStart.getTime() + 9 * 60 * 60_000)
    const outTime = new Date(dayStart.getTime() + 17 * 60 * 60_000)
    const inPunch = makePunch(idPrefix, 1, "in", recordedIn)
    const outPunch = makePunch(idPrefix, 2, "out", outTime)
    const adjustment: Adjustment = {
      id: `adj_${idPrefix}_1`,
      type: "supersede",
      references_punch_id: inPunch.id,
      supersedes_adjustment_id: null,
      entries: [{ direction: "in", timestamp: correctedIn.toISOString() }],
      reason: "Corrected arrival time after a badge reader outage.",
      adjusted_by: HR_ADMIN_NAME,
      created_at: new Date(dayStart.getTime() + 24 * 60 * 60_000 + 10 * 60 * 60_000).toISOString(),
    }
    return buildDay(date, [inPunch, outPunch], [adjustment, ...createdForDay])
  }

  if (hasAddSingle && toDateKey(nthPriorWorkingDay(today, 3)) === dateKey) {
    const dayStart = startOfDay(date)
    const inTime = new Date(dayStart.getTime() + 8 * 60 * 60_000 + 5 * 60_000)
    const addedOut = new Date(dayStart.getTime() + 17 * 60 * 60_000)
    const inPunch = makePunch(idPrefix, 1, "in", inTime)
    const adjustment: Adjustment = {
      id: `adj_${idPrefix}_1`,
      type: "add_single",
      references_punch_id: null,
      supersedes_adjustment_id: null,
      entries: [{ direction: "out", timestamp: addedOut.toISOString() }],
      reason: "Forgot to clock out; confirmed with line manager.",
      adjusted_by: HR_ADMIN_NAME,
      created_at: new Date(dayStart.getTime() + 24 * 60 * 60_000 + 9 * 60 * 60_000).toISOString(),
    }
    return buildDay(date, [inPunch], [adjustment, ...createdForDay])
  }

  if (!isWorkingWeekday(date)) {
    return buildDay(date, [], createdForDay)
  }

  if (isSparse && date.getDate() % 4 !== 0) {
    return buildDay(date, [], createdForDay)
  }

  const dayStart = startOfDay(date)
  const wobble = (date.getDate() * 7 + personIndex * 13) % 40
  const inTime = new Date(dayStart.getTime() + (8 * 60 + wobble) * 60_000)
  const outTime = new Date(dayStart.getTime() + (17 * 60 + wobble) * 60_000)

  return buildDay(
    date,
    [makePunch(idPrefix, 1, "in", inTime), makePunch(idPrefix, 2, "out", outTime)],
    createdForDay,
  )
}

export function resolvePersonDays(personId: string, from: string, to: string): DayStatus[] {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  const days: DayStatus[] = []

  for (
    let cursor = start;
    cursor.getTime() <= end.getTime();
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    days.push(resolvePersonDay(personId, cursor))
  }

  return days
}
