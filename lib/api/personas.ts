import { DIRECT_REPORT_IDS, DOTTED_REPORT_IDS, ENGINEERING_DEPARTMENT, PERSONS } from "./org-data"
import type { SessionContext } from "./types"

export type PersonaKey =
  | "employee_only"
  | "line_manager"
  | "hod"
  | "lm_hod"
  | "dotted_only"
  | "hr_admin"
  | "hr_admin_lm"

type PersonaOverrides = Pick<
  SessionContext,
  "is_hr_admin" | "direct_report_count" | "hod_department" | "dotted_report_count"
>

export interface PersonaDescriptor {
  key: PersonaKey
  label: string
  description: string
  overrides: PersonaOverrides
}

const ENGINEERING_HEADCOUNT = PERSONS.filter((p) => p.department === ENGINEERING_DEPARTMENT).length

export const PERSONAS: PersonaDescriptor[] = [
  {
    key: "employee_only",
    label: "Employee only",
    description: "No reports, not an HR admin — the baseline view.",
    overrides: {
      is_hr_admin: false,
      direct_report_count: 0,
      hod_department: null,
      dotted_report_count: 0,
    },
  },
  {
    key: "line_manager",
    label: `Line Manager (${DIRECT_REPORT_IDS.length} reports)`,
    description: "Sees Team, scoped to direct reports only.",
    overrides: {
      is_hr_admin: false,
      direct_report_count: DIRECT_REPORT_IDS.length,
      hod_department: null,
      dotted_report_count: 0,
    },
  },
  {
    key: "hod",
    label: `HoD (${ENGINEERING_DEPARTMENT}, ${ENGINEERING_HEADCOUNT} people)`,
    description: "Sees Team, scoped to the whole department.",
    overrides: {
      is_hr_admin: false,
      direct_report_count: 0,
      hod_department: ENGINEERING_DEPARTMENT,
      dotted_report_count: 0,
    },
  },
  {
    key: "lm_hod",
    label: "LM + HoD combined",
    description: "Two Team tabs: My reports and the department.",
    overrides: {
      is_hr_admin: false,
      direct_report_count: DIRECT_REPORT_IDS.length,
      hod_department: ENGINEERING_DEPARTMENT,
      dotted_report_count: 0,
    },
  },
  {
    key: "dotted_only",
    label: `Dotted line only (${DOTTED_REPORT_IDS.length} dotted reports)`,
    description: "View-only visibility into a couple of people outside the org line.",
    overrides: {
      is_hr_admin: false,
      direct_report_count: 0,
      hod_department: null,
      dotted_report_count: DOTTED_REPORT_IDS.length,
    },
  },
  {
    key: "hr_admin",
    label: "HR Admin",
    description: "Sees the Admin section: Records, Adjustments, Devices.",
    overrides: {
      is_hr_admin: true,
      direct_report_count: 0,
      hod_department: null,
      dotted_report_count: 0,
    },
  },
  {
    key: "hr_admin_lm",
    label: "HR Admin + LM",
    description: "Admin and Team nav both appear together.",
    overrides: {
      is_hr_admin: true,
      direct_report_count: DIRECT_REPORT_IDS.length,
      hod_department: null,
      dotted_report_count: 0,
    },
  },
]

export const DEFAULT_PERSONA: PersonaKey = "employee_only"

export function getPersonaOverrides(key: PersonaKey): PersonaOverrides {
  const found = PERSONAS.find((p) => p.key === key)
  if (!found) throw new Error(`Unknown persona: ${key}`)
  return found.overrides
}
