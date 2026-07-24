/**
 * Draft API contract for TroveSuite Attendance, v1 (time capture only).
 *
 * This file is the source of truth for response/request shapes. The mock
 * client in `attendance.ts` / `admin.ts` returns exactly these types so the
 * real client can be swapped in without touching component code.
 */

/**
 * GET /api/me — platform-provided session context.
 *
 * Access is entirely derived from these fields — there is no stored "role"
 * enum. A person can be several things at once (e.g. an HR admin who also
 * manages people); nav simply shows the union of what applies.
 */
export interface SessionContext {
  user_id: string
  display_name: string
  business_name: string
  app_id: string
  location_id: string
  is_hr_admin: boolean
  /** > 0 ⇒ this person is a line manager. Derived, never a stored role. */
  direct_report_count: number
  /** Non-null ⇒ head of this department. */
  hod_department: string | null
  /** > 0 ⇒ this person has dotted-line (view-only) visibility into others. */
  dotted_report_count: number
}

export type PunchDirection = "in" | "out"
export type CaptureSource = "web" | "device"

/** An immutable, append-only punch record. Never mutated once created. */
export interface Punch {
  id: string
  direction: PunchDirection
  /** ISO 8601, always server-issued. Never derived from the device clock. */
  timestamp: string
  capture_source: CaptureSource
  /** True when the system inserted a closing punch at day end (missing clock-out). */
  auto_closed: boolean
}

export type PunchErrorCode = "OFF_NETWORK"

export interface PunchError {
  code: PunchErrorCode
  message: string
}

/** POST /v1/user/punches */
export type PunchResult =
  | { success: true; punch: Punch }
  | { success: false; error: PunchError }

/** One punch-equivalent time an adjustment adds or corrects. */
export interface AdjustmentEntry {
  direction: PunchDirection
  timestamp: string
}

export type AdjustmentType = "add_pair" | "add_single" | "supersede"

/**
 * An append-only correction. A punch is never edited in place, and neither
 * is an adjustment — correcting a wrong adjustment means appending another
 * one that supersedes it.
 *
 * - "add_pair": adds a missing in+out pair (2 entries).
 * - "add_single": adds one missing punch, e.g. a forgotten clock-out (1 entry).
 * - "supersede": corrects one existing punch's time (1 entry); the original
 *   punch stays in the record, marked superseded, never removed.
 *
 * `references_punch_id` is set only for "supersede". `supersedes_adjustment_id`
 * is set when this adjustment corrects an earlier adjustment rather than a
 * punch (the earlier adjustment turned out to be wrong).
 */
export interface Adjustment {
  id: string
  type: AdjustmentType
  references_punch_id: string | null
  supersedes_adjustment_id: string | null
  entries: AdjustmentEntry[]
  reason: string
  adjusted_by: string
  created_at: string
}

export type DayStatusValue = "present" | "no_record" | "non_working_day"

/** GET /v1/user/status?date= */
export interface DayStatus {
  date: string
  status: DayStatusValue
  first_in: string | null
  last_out: string | null
  total_minutes: number
  punches: Punch[]
  adjustments: Adjustment[]
}

/** GET /v1/user/timesheet?from=&to= */
export interface Timesheet {
  from: string
  to: string
  days: DayStatus[]
  total_minutes: number
}

// ---------------------------------------------------------------------------
// HR Admin — records, adjustments, devices
// ---------------------------------------------------------------------------

export interface PersonSummary {
  person_id: string
  person_name: string
  department: string
}

/** POST /v1/admin/persons/:person_id/adjustments?date= */
export interface CreateAdjustmentPayload {
  type: AdjustmentType
  entries: AdjustmentEntry[]
  references_punch_id: string | null
  supersedes_adjustment_id: string | null
  reason: string
}

export interface RecordsFilters {
  person_id: string | null
  from: string
  to: string
  status: DayStatusValue | null
  capture_source: CaptureSource | null
  has_adjustment: boolean
  auto_closed_only: boolean
  page: number
  page_size: number
}

export interface PersonDayRow extends PersonSummary {
  day: DayStatus
}

export interface RecordsSummary {
  persons_shown: number
  days_present: number
  days_no_record: number
  adjustments: number
}

/** GET /v1/admin/records?... */
export interface RecordsResult {
  rows: PersonDayRow[]
  summary: RecordsSummary
  total_rows: number
}

export type DeviceStatus = "online" | "offline" | "never_connected"

export interface Device {
  id: string
  name: string
  vendor: string
  model: string
  serial: string
  location_id: string
  status: DeviceStatus
  last_sync_at: string | null
  queued_events_count: number
}

export interface RegisterDevicePayload {
  name: string
  vendor: string
  model: string
  serial: string
  location_id: string
}

export type EnrolmentState = "enrolled" | "pending_sync" | "not_enrolled"

export interface DeviceEnrolment {
  person_id: string
  person_name: string
  state: EnrolmentState
}

export interface DepartmentEnrolmentBreakdown {
  department: string
  total: number
  enrolled: number
}

/** GET /v1/admin/devices/enrolment-progress */
export interface EnrolmentProgress {
  total_persons: number
  enrolled_count: number
  pending_sync_count: number
  by_department: DepartmentEnrolmentBreakdown[]
}

// ---------------------------------------------------------------------------
// Team (line manager / HoD / dotted-line) — Pass 3
// ---------------------------------------------------------------------------

export type TeamScope = "direct" | "department" | "dotted"

export interface TeamMemberToday {
  person_id: string
  person_name: string
  /** Live "right now" read for today; the derived DayStatus for any past day. */
  status: DayStatusValue
  first_in: string | null
  last_out: string | null
  total_minutes: number
  is_clocked_in: boolean
  capture_source: CaptureSource | null
}

/** GET /v1/manager/team?scope=&date= */
export interface TeamDay {
  scope: TeamScope
  scope_label: string
  date: string
  is_today: boolean
  members: TeamMemberToday[]
}

/*
 * Fields invented beyond the spec (flag for backend review):
 * - Adjustment.entries replaces a single adjusted_direction/adjusted_timestamp
 *   pair from the previous pass, so one adjustment record can carry either
 *   one time (add_single/supersede) or two (add_pair) — the acceptance
 *   criteria describe "add a missing punch pair" as a single action, and a
 *   single-entry-only shape couldn't represent that as one record.
 * - Adjustment.adjusted_by stays a display-name string. If the backend wants
 *   a user_id instead, the UI will need a lookup.
 * - PersonSummary/PersonDayRow/RecordsSummary/RecordsResult, Device*,
 *   Enrolment*, and Team* shapes are new in this pass — the prompt named the
 *   client functions but not their exact payloads, so these are drafted here
 *   for backend review alongside the functions in admin.ts.
 */
