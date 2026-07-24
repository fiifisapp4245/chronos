/**
 * Mock HR Admin client: adjustments, the all-records search, and device
 * management. Same latency-simulated pattern as attendance.ts — swap the
 * internals for real HTTP calls and the admin screens keep working.
 */
import { SESSION_IDENTITY } from "./mock-data"
import { appendCreatedAdjustment, PERSONS, resolvePersonDays } from "./org-data"
import type {
  Adjustment,
  CreateAdjustmentPayload,
  Device,
  DeviceEnrolment,
  EnrolmentProgress,
  EnrolmentState,
  PersonDayRow,
  RecordsFilters,
  RecordsResult,
  RecordsSummary,
  RegisterDevicePayload,
  Timesheet,
} from "./types"

const LATENCY_MS = 400

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let createdAdjustmentCounter = 0
function nextAdjustmentId(): string {
  createdAdjustmentCounter += 1
  return `adj_created_${createdAdjustmentCounter}`
}

/** POST /v1/admin/persons/:person_id/adjustments?date= */
export async function createAdjustment(
  personId: string,
  date: string,
  payload: CreateAdjustmentPayload,
): Promise<Adjustment> {
  await sleep(LATENCY_MS)

  const adjustment: Adjustment = {
    id: nextAdjustmentId(),
    type: payload.type,
    references_punch_id: payload.references_punch_id,
    supersedes_adjustment_id: payload.supersedes_adjustment_id,
    entries: payload.entries,
    reason: payload.reason,
    adjusted_by: `${SESSION_IDENTITY.display_name} (HR Admin)`,
    created_at: new Date().toISOString(),
  }

  appendCreatedAdjustment(personId, date, adjustment)
  return adjustment
}

/** GET /v1/admin/persons/:person_id/timesheet?from=&to= */
export async function getPersonTimesheet(personId: string, from: string, to: string): Promise<Timesheet> {
  await sleep(LATENCY_MS)
  const days = resolvePersonDays(personId, from, to)
  const total_minutes = days.reduce((sum, day) => sum + day.total_minutes, 0)
  return { from, to, days, total_minutes }
}

/** GET /v1/admin/records?... */
export async function searchRecords(filters: RecordsFilters): Promise<RecordsResult> {
  await sleep(LATENCY_MS)

  const targetPersons = filters.person_id ? PERSONS.filter((p) => p.id === filters.person_id) : PERSONS

  const allRows: PersonDayRow[] = []
  for (const person of targetPersons) {
    const days = resolvePersonDays(person.id, filters.from, filters.to)
    for (const day of days) {
      if (filters.status && day.status !== filters.status) continue
      if (filters.has_adjustment && day.adjustments.length === 0) continue
      if (filters.auto_closed_only && !day.punches.some((p) => p.auto_closed)) continue
      if (filters.capture_source && !day.punches.some((p) => p.capture_source === filters.capture_source)) {
        continue
      }
      allRows.push({
        person_id: person.id,
        person_name: person.name,
        department: person.department,
        day,
      })
    }
  }

  allRows.sort(
    (a, b) => b.day.date.localeCompare(a.day.date) || a.person_name.localeCompare(b.person_name),
  )

  const summary: RecordsSummary = {
    persons_shown: new Set(allRows.map((r) => r.person_id)).size,
    days_present: allRows.filter((r) => r.day.status === "present").length,
    days_no_record: allRows.filter((r) => r.day.status === "no_record").length,
    adjustments: allRows.filter((r) => r.day.adjustments.length > 0).length,
  }

  const total_rows = allRows.length
  const start = (filters.page - 1) * filters.page_size
  const rows = allRows.slice(start, start + filters.page_size)

  return { rows, summary, total_rows }
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

interface MockDevice {
  id: string
  name: string
  vendor: string
  model: string
  serial: string
  location_id: string
  status: Device["status"]
  /** Minutes-ago, recomputed to an ISO timestamp on every read so it never
   *  looks stale relative to whenever the demo happens to be viewed. */
  lastSyncMinutesAgo: number | null
  queued_events_count: number
}

let devices: MockDevice[] = [
  {
    id: "device_1",
    name: "Accra HQ — Main Entrance",
    vendor: "ZKTeco",
    model: "SpeedFace V5L",
    serial: "ZK-9401-AC",
    location_id: "loc_accra_hq",
    status: "online",
    lastSyncMinutesAgo: 4,
    queued_events_count: 0,
  },
  {
    id: "device_2",
    name: "Kumasi Branch — Reception",
    vendor: "Suprema",
    model: "BioStation 2",
    serial: "SP-2201-KU",
    location_id: "loc_kumasi",
    status: "offline",
    lastSyncMinutesAgo: 6 * 60,
    queued_events_count: 25,
  },
  {
    id: "device_3",
    name: "Takoradi Site — Entrance",
    vendor: "ZKTeco",
    model: "SpeedFace V5L",
    serial: "ZK-9402-TK",
    location_id: "loc_accra_hq",
    status: "never_connected",
    lastSyncMinutesAgo: null,
    queued_events_count: 0,
  },
]

let deviceCounter = devices.length

function toDevice(mock: MockDevice): Device {
  return {
    id: mock.id,
    name: mock.name,
    vendor: mock.vendor,
    model: mock.model,
    serial: mock.serial,
    location_id: mock.location_id,
    status: mock.status,
    last_sync_at:
      mock.lastSyncMinutesAgo === null
        ? null
        : new Date(Date.now() - mock.lastSyncMinutesAgo * 60_000).toISOString(),
    queued_events_count: mock.queued_events_count,
  }
}

/** GET /v1/admin/devices */
export async function listDevices(): Promise<Device[]> {
  await sleep(LATENCY_MS)
  return devices.map(toDevice)
}

/** POST /v1/admin/devices */
export async function registerDevice(payload: RegisterDevicePayload): Promise<Device> {
  await sleep(LATENCY_MS)
  deviceCounter += 1
  const mock: MockDevice = {
    id: `device_${deviceCounter}`,
    ...payload,
    status: "never_connected",
    lastSyncMinutesAgo: null,
    queued_events_count: 0,
  }
  devices = [...devices, mock]
  return toDevice(mock)
}

/** GET /v1/admin/devices/:device_id/enrolments */
export async function getDeviceEnrolments(deviceId: string): Promise<DeviceEnrolment[]> {
  await sleep(LATENCY_MS)
  const device = devices.find((d) => d.id === deviceId)

  return PERSONS.map((person, index) => {
    let state: EnrolmentState
    if (!device || device.status === "never_connected") {
      state = "not_enrolled"
    } else if (device.status === "offline") {
      state = index % 4 === 0 ? "pending_sync" : index % 13 === 0 ? "not_enrolled" : "enrolled"
    } else {
      state = index % 11 === 0 ? "pending_sync" : "enrolled"
    }
    return { person_id: person.id, person_name: person.name, state }
  })
}

/** GET /v1/admin/devices/enrolment-progress
 *
 * Deliberately scaled to the tenant-wide 1,000-employee rollout this
 * dashboard exists for, independent of the ~60-person searchable directory
 * used by Records — enumerating 1,000 individual mock persons just for one
 * summary card isn't worth the weight, so this is authored directly.
 */
export async function getEnrolmentProgress(): Promise<EnrolmentProgress> {
  await sleep(LATENCY_MS)
  return {
    total_persons: 1000,
    enrolled_count: 640,
    pending_sync_count: 25,
    by_department: [
      { department: "Engineering", total: 200, enrolled: 150 },
      { department: "Sales", total: 180, enrolled: 120 },
      { department: "Support", total: 220, enrolled: 140 },
      { department: "Finance", total: 150, enrolled: 100 },
      { department: "Operations", total: 160, enrolled: 90 },
      { department: "People", total: 90, enrolled: 40 },
    ],
  }
}
