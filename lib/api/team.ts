/**
 * Mock client for the Team screen (line manager / HoD / dotted-line). Same
 * latency-simulated pattern as attendance.ts / admin.ts.
 */
import { getActivePersona } from "./attendance"
import { getPersonaOverrides } from "./personas"
import { DIRECT_REPORT_IDS, DOTTED_REPORT_IDS, PERSONS, findPerson, resolvePersonDay } from "./org-data"
import { parseDateKey, toDateKey } from "@/lib/format"
import type { TeamDay, TeamMemberToday, TeamScope } from "./types"

const LATENCY_MS = 400

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** The active persona's hod_department, if any — "department" scope reads
 *  this rather than taking it as a parameter, same pattern as the rest of
 *  the mock client reading "current session" state internally. */
function activeHodDepartment(): string | null {
  return getPersonaOverrides(getActivePersona()).hod_department
}

function scopePersonIds(scope: TeamScope): string[] {
  if (scope === "direct") return DIRECT_REPORT_IDS
  if (scope === "dotted") return DOTTED_REPORT_IDS
  const department = activeHodDepartment()
  if (!department) return []
  return PERSONS.filter((p) => p.department === department).map((p) => p.id)
}

function scopeLabel(scope: TeamScope): string {
  if (scope === "direct") return "My reports"
  if (scope === "dotted") return "Dotted reports"
  const department = activeHodDepartment()
  return department ? `${department} department` : "Department"
}

/** GET /v1/manager/team?scope=&date= */
export async function getTeam(scope: TeamScope, date: string): Promise<TeamDay> {
  await sleep(LATENCY_MS)

  const todayKey = toDateKey(new Date())
  const isToday = date === todayKey
  const dateObj = parseDateKey(date)
  const personIds = scopePersonIds(scope)

  const members: TeamMemberToday[] = personIds.map((personId) => {
    const person = findPerson(personId)
    const day = resolvePersonDay(personId, dateObj)
    const lastPunch = day.punches[day.punches.length - 1]
    const isClockedIn = isToday && lastPunch?.direction === "in"

    return {
      person_id: personId,
      person_name: person?.name ?? personId,
      status: day.status,
      first_in: day.first_in,
      last_out: day.last_out,
      total_minutes: day.total_minutes,
      is_clocked_in: isClockedIn,
      capture_source: lastPunch?.capture_source ?? null,
    }
  })

  return {
    scope,
    scope_label: scopeLabel(scope),
    date,
    is_today: isToday,
    members,
  }
}
