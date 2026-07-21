"use client"

import * as React from "react"

import { setScenario as applyScenario } from "./attendance"
import type { ScenarioKey } from "./mock-data"

interface ScenarioContextValue {
  scenario: ScenarioKey
  /** Bumped on every scenario switch — include it in fetch effect deps. */
  version: number
  selectScenario: (key: ScenarioKey) => void
}

const DEFAULT_SCENARIO: ScenarioKey = "fresh_morning"

const ScenarioContext = React.createContext<ScenarioContextValue | null>(null)

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenario] = React.useState<ScenarioKey>(DEFAULT_SCENARIO)
  const [version, setVersion] = React.useState(0)

  const selectScenario = React.useCallback((key: ScenarioKey) => {
    applyScenario(key)
    setScenario(key)
    setVersion((v) => v + 1)
  }, [])

  const value = React.useMemo(
    () => ({ scenario, version, selectScenario }),
    [scenario, version, selectScenario],
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
