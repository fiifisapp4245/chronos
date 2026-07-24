"use client"

import * as React from "react"

import { getSessionContext } from "./attendance"
import { useScenario } from "./scenario-context"
import type { SessionContext } from "./types"

/** Fetches session context, refetching whenever the persona (or scenario)
 *  changes so nav gating and access guards react live to the dev switcher. */
export function useSessionContext(): { session: SessionContext | null; loading: boolean } {
  const { version } = useScenario()
  const [session, setSession] = React.useState<SessionContext | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSessionContext().then((data) => {
      if (!cancelled) {
        setSession(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [version])

  return { session, loading }
}
