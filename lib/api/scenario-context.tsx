"use client"

import * as React from "react"

import { setPersona as applyPersona, setScenario as applyScenario } from "./attendance"
import type { ScenarioKey } from "./mock-data"
import { DEFAULT_PERSONA, type PersonaKey } from "./personas"

/**
 * Two independent demo axes, one shared context: `scenario` drives the
 * logged-in user's own attendance data (Clock/Timesheet), `persona` drives
 * session/access (nav gating). Both bump the same `version` counter so any
 * page's fetch effect only needs one dependency to refetch on either change.
 */
interface ScenarioContextValue {
  scenario: ScenarioKey
  persona: PersonaKey
  version: number
  selectScenario: (key: ScenarioKey) => void
  selectPersona: (key: PersonaKey) => void
}

const DEFAULT_SCENARIO: ScenarioKey = "fresh_morning"

const ScenarioContext = React.createContext<ScenarioContextValue | null>(null)

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenario] = React.useState<ScenarioKey>(DEFAULT_SCENARIO)
  const [persona, setPersona] = React.useState<PersonaKey>(DEFAULT_PERSONA)
  const [version, setVersion] = React.useState(0)

  const selectScenario = React.useCallback((key: ScenarioKey) => {
    applyScenario(key)
    setScenario(key)
    setVersion((v) => v + 1)
  }, [])

  const selectPersona = React.useCallback((key: PersonaKey) => {
    applyPersona(key)
    setPersona(key)
    setVersion((v) => v + 1)
  }, [])

  const value = React.useMemo(
    () => ({ scenario, persona, version, selectScenario, selectPersona }),
    [scenario, persona, version, selectScenario, selectPersona],
  )

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>
}

export function useScenario(): ScenarioContextValue {
  const ctx = React.useContext(ScenarioContext)
  if (!ctx) {
    throw new Error("useScenario must be used within a ScenarioProvider")
  }
  return ctx
}
