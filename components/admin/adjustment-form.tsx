"use client"

import * as React from "react"
import { CheckCircle2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PunchList } from "@/components/attendance/punch-list"
import { createAdjustment, getPersonTimesheet } from "@/lib/api/admin"
import { buildDay, supersededPunchIds } from "@/lib/api/mock-data"
import { formatClockTime, formatDayLabel, formatDuration, parseDateKey, toDateKey } from "@/lib/format"
import type { Adjustment, AdjustmentType, CreateAdjustmentPayload, DayStatus, PunchDirection } from "@/lib/api/types"

const REASON_MIN_LENGTH = 10

interface AdjustmentFormProps {
  personId: string
  personName: string
  date: string
  onCreated?: (adjustment: Adjustment) => void
}

function combineDateAndTime(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00`).toISOString()
}

const TYPE_OPTIONS: Array<{ value: AdjustmentType; label: string; description: string }> = [
  {
    value: "add_pair",
    label: "Add a missing punch pair",
    description: "Both a clock-in and a clock-out were never recorded.",
  },
  {
    value: "add_single",
    label: "Add a missing single punch",
    description: "e.g. a forgotten clock-out.",
  },
  {
    value: "supersede",
    label: "Supersede an incorrect punch",
    description: "The punch exists but its time is wrong.",
  },
]

export function AdjustmentForm({ personId, personName, date, onCreated }: AdjustmentFormProps) {
  const todayKey = toDateKey(new Date())
  const isFutureDate = date > todayKey

  const [day, setDay] = React.useState<DayStatus | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [type, setType] = React.useState<AdjustmentType>("add_single")
  const [reason, setReason] = React.useState("")
  const [inTime, setInTime] = React.useState("")
  const [outTime, setOutTime] = React.useState("")
  const [singleDirection, setSingleDirection] = React.useState<PunchDirection>("out")
  const [singleTime, setSingleTime] = React.useState("")
  const [supersedePunchId, setSupersedePunchId] = React.useState("")
  const [correctedTime, setCorrectedTime] = React.useState("")

  const [phase, setPhase] = React.useState<"edit" | "confirm">("edit")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState<Adjustment | null>(null)
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    getPersonTimesheet(personId, date, date).then((ts) => {
      if (!cancelled) {
        setDay(ts.days[0] ?? null)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [personId, date])

  const reasonValid = reason.trim().length >= REASON_MIN_LENGTH

  const payload: CreateAdjustmentPayload | null = React.useMemo(() => {
    if (!reasonValid) return null

    if (type === "add_pair") {
      if (!inTime || !outTime) return null
      return {
        type: "add_pair",
        entries: [
          { direction: "in", timestamp: combineDateAndTime(date, inTime) },
          { direction: "out", timestamp: combineDateAndTime(date, outTime) },
        ],
        references_punch_id: null,
        supersedes_adjustment_id: null,
        reason: reason.trim(),
      }
    }

    if (type === "add_single") {
      if (!singleTime) return null
      return {
        type: "add_single",
        entries: [{ direction: singleDirection, timestamp: combineDateAndTime(date, singleTime) }],
        references_punch_id: null,
        supersedes_adjustment_id: null,
        reason: reason.trim(),
      }
    }

    if (!supersedePunchId || !correctedTime || !day) return null
    const originalPunch = day.punches.find((p) => p.id === supersedePunchId)
    if (!originalPunch) return null
    return {
      type: "supersede",
      entries: [{ direction: originalPunch.direction, timestamp: combineDateAndTime(date, correctedTime) }],
      references_punch_id: supersedePunchId,
      supersedes_adjustment_id: null,
      reason: reason.trim(),
    }
  }, [type, reasonValid, reason, inTime, outTime, singleDirection, singleTime, supersedePunchId, correctedTime, date, day])

  const previewDay = React.useMemo(() => {
    if (!day || !payload) return null
    const previewAdjustment: Adjustment = {
      id: "__preview__",
      type: payload.type,
      references_punch_id: payload.references_punch_id,
      supersedes_adjustment_id: payload.supersedes_adjustment_id,
      entries: payload.entries,
      reason: payload.reason,
      adjusted_by: "you",
      created_at: new Date().toISOString(),
    }
    return buildDay(parseDateKey(date), day.punches, [...day.adjustments, previewAdjustment])
  }, [day, payload, date])

  async function handleConfirm() {
    if (!payload) return
    setSubmitting(true)
    const created = await createAdjustment(personId, date, payload)
    setSubmitting(false)
    setSubmitted(created)
    onCreated?.(created)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!day) {
    return <p className="text-sm text-muted-foreground">Could not load this day.</p>
  }

  if (isFutureDate) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Future dates cannot be adjusted</AlertTitle>
        <AlertDescription>
          {formatDayLabel(date)} has not happened yet. Choose a past or current day.
        </AlertDescription>
      </Alert>
    )
  }

  if (submitted) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>Adjustment saved</AlertTitle>
        <AlertDescription>
          {personName}&apos;s {formatDayLabel(date)} now shows the Adjusted badge everywhere it appears.
        </AlertDescription>
      </Alert>
    )
  }

  const availablePunches = day.punches.filter((p) => !supersededPunchIds(day.adjustments).has(p.id))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {personName} — {formatDayLabel(date)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">First in</p>
              <p className="font-medium">{day.first_in ? formatClockTime(day.first_in) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last out</p>
              <p className="font-medium">{day.last_out ? formatClockTime(day.last_out) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{formatDuration(day.total_minutes)}</p>
            </div>
          </div>
          <PunchList punches={day.punches} adjustments={day.adjustments} emptyLabel="No punches recorded." />
        </CardContent>
      </Card>

      {phase === "edit" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New adjustment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as AdjustmentType)}
              className="gap-3"
            >
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`type-${option.value}`}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value={option.value} id={`type-${option.value}`} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            {type === "add_pair" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="in-time">Clock in</Label>
                  <input
                    id="in-time"
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="out-time">Clock out</Label>
                  <input
                    id="out-time"
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
                  />
                </div>
              </div>
            )}

            {type === "add_single" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="single-direction">Punch type</Label>
                  <Select
                    value={singleDirection}
                    onValueChange={(value) => setSingleDirection(value as PunchDirection)}
                  >
                    <SelectTrigger id="single-direction" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Clock in</SelectItem>
                      <SelectItem value="out">Clock out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="single-time">Time</Label>
                  <input
                    id="single-time"
                    type="time"
                    value={singleTime}
                    onChange={(e) => setSingleTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
                  />
                </div>
              </div>
            )}

            {type === "supersede" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="supersede-punch">Punch to correct</Label>
                  <Select value={supersedePunchId} onValueChange={setSupersedePunchId}>
                    <SelectTrigger id="supersede-punch" className="w-full">
                      <SelectValue placeholder="Choose a punch" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePunches.map((punch) => (
                        <SelectItem key={punch.id} value={punch.id}>
                          {punch.direction === "in" ? "Clock in" : "Clock out"} —{" "}
                          {formatClockTime(punch.timestamp)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="corrected-time">Corrected time</Label>
                  <input
                    id="corrected-time"
                    type="time"
                    value={correctedTime}
                    onChange={(e) => setCorrectedTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="e.g. Confirmed with line manager — forgot to clock out"
                rows={3}
              />
              {touched && !reasonValid && (
                <p className="text-xs text-destructive">
                  A reason is required — at least {REASON_MIN_LENGTH} characters.
                </p>
              )}
            </div>

            <Button
              disabled={!payload}
              onClick={() => {
                setTouched(true)
                if (payload) setPhase("confirm")
              }}
            >
              Review adjustment
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "confirm" && previewDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirm adjustment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Day total changes from{" "}
              <span className="font-medium">{formatDuration(day.total_minutes)}</span> to{" "}
              <span className="font-medium">{formatDuration(previewDay.total_minutes)}</span>.
            </p>
            <p className="text-sm text-muted-foreground">{payload?.reason}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("edit")} disabled={submitting}>
                Back to edit
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? "Saving…" : "Confirm and save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
