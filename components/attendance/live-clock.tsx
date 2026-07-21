"use client"

import * as React from "react"

import { formatClockTimeWithSeconds } from "@/lib/format"

/** A live-ticking clock display. Purely informational — never the source
 *  of a punch timestamp, which always comes from the API response. */
export function LiveClock() {
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null

  return <span className="tabular-nums">{formatClockTimeWithSeconds(now.toISOString())}</span>
}
