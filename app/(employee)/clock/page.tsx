"use client"

import * as React from "react"
import { differenceInMinutes } from "date-fns"
import { CheckCircle2, Loader2, WifiOff } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LiveClock } from "@/components/attendance/live-clock"
import { PunchList } from "@/components/attendance/punch-list"
import { createPunch, getMyStatus } from "@/lib/api/attendance"
import { useScenario } from "@/lib/api/scenario-context"
import { formatClockTime, formatDayLabel, formatDuration, toDateKey } from "@/lib/format"
import type { DayStatus } from "@/lib/api/types"

export default function ClockPage() {
  const { version } = useScenario()
  const [today, setToday] = React.useState<DayStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [offNetworkMessage, setOffNetworkMessage] = React.useState<string | null>(null)
  const [justClockedIn, setJustClockedIn] = React.useState(false)
  const [, setTick] = React.useState(0)

  const todayKey = toDateKey(new Date())

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setOffNetworkMessage(null)
    setJustClockedIn(false)

    getMyStatus(todayKey).then((data) => {
      if (!cancelled) {
        setToday(data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
    // todayKey is derived from "now" at render time and intentionally excluded —
    // only a scenario switch should trigger a refetch here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const lastPunch = today?.punches[today.punches.length - 1] ?? null
  const isClockedIn = lastPunch?.direction === "in"

  React.useEffect(() => {
    if (!isClockedIn) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isClockedIn])

  async function handlePunch() {
    setSubmitting(true)
    setOffNetworkMessage(null)

    const result = await createPunch()
    setSubmitting(false)

    if (!result.success) {
      setOffNetworkMessage(result.error.message)
      return
    }

    if (result.punch.direction === "in") {
      setJustClockedIn(true)
      setTimeout(() => setJustClockedIn(false), 1800)
    }

    const refreshed = await getMyStatus(todayKey)
    setToday(refreshed)
  }

  const elapsedMinutes =
    isClockedIn && today && lastPunch
      ? today.total_minutes + Math.max(0, differenceInMinutes(new Date(), new Date(lastPunch.timestamp)))
      : 0

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between gap-2">
            <span>{formatDayLabel(todayKey)}</span>
            <LiveClock />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {offNetworkMessage && (
            <Alert variant="destructive">
              <WifiOff />
              <AlertTitle>Clock-in rejected</AlertTitle>
              <AlertDescription>{offNetworkMessage}</AlertDescription>
            </Alert>
          )}

          {justClockedIn && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              <CheckCircle2 className="size-4" />
              Clocked in successfully.
            </div>
          )}

          {loading || !today ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : isClockedIn && lastPunch ? (
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                Clocked in at {formatClockTime(lastPunch.timestamp)}
              </p>
              <p className="text-3xl font-semibold tabular-nums">{formatDuration(elapsedMinutes)}</p>
              <p className="text-xs text-muted-foreground">Elapsed today</p>
            </div>
          ) : today.punches.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">First in</p>
                <p className="font-medium">
                  {today.first_in ? formatClockTime(today.first_in) : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last out</p>
                <p className="font-medium">
                  {today.last_out ? formatClockTime(today.last_out) : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">{formatDuration(today.total_minutes)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You have not clocked in yet today.</p>
          )}

          {!loading && today && (
            <Button
              size="lg"
              className="w-full"
              variant={isClockedIn ? "outline" : "default"}
              disabled={submitting}
              onClick={handlePunch}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  {isClockedIn ? "Clocking out" : "Clocking in"}
                </>
              ) : isClockedIn ? (
                "Clock Out"
              ) : (
                "Clock In"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s punches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !today ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <PunchList punches={today.punches} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
