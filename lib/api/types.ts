/**
 * Draft API contract for TroveSuite Attendance, v1 (time capture only).
 *
 * This file is the source of truth for response/request shapes. The mock
 * client in `attendance.ts` returns exactly these types so the real client
 * can be swapped in without touching component code.
 */

export type UserRole = "employee" | "manager" | "admin"

/** GET /api/me — platform-provided session context. */
export interface SessionContext {
  user_id: string
  display_name: string
  business_name: string
  app_id: string
  location_id: string
  role: UserRole
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

/**
 * An append-only correction referencing a punch. A punch is never edited in
 * place — a correction is a separate record layered on top of it.
 *
 * `references_punch_id` is null for a missing-punch adjustment (the actor
 * added a punch that never existed rather than correcting one that did).
 * `adjusted_direction` / `adjusted_timestamp` describe the corrected or
 * added value; see the note on invented fields at the bottom of this file.
 */
export interface Adjustment {
  id: string
  references_punch_id: string | null
  adjusted_direction: PunchDirection
  adjusted_timestamp: string
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


/*
 * Fields invented beyond the spec (flag for backend review):
 * - Adjustment.adjusted_direction / adjusted_timestamp: the spec listed
 *   id, references_punch_id, reason, adjusted_by, created_at but nothing
 *   carrying the corrected value itself. Without it the UI has no way to
 *   render what the adjustment actually changed, so these two fields were
 *   added.
 * - Adjustment.adjusted_by is typed as a display-name string here. If the
 *   backend wants a user_id instead, the UI will need a lookup.
 */
