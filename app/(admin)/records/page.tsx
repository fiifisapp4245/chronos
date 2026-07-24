"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { startOfMonth } from "date-fns"
import { ChevronLeft, ChevronRight, Monitor, Smartphone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdjustmentForm } from "@/components/admin/adjustment-form"
import { PersonCombobox } from "@/components/admin/person-combobox"
import { DayDetailSheet } from "@/components/attendance/day-detail-sheet"
import { MetricCard } from "@/components/attendance/metric-card"
import { StatusChip } from "@/components/attendance/status-chip"
import { TimesheetView } from "@/components/attendance/timesheet-view"
import { AccessGate } from "@/components/shell/access-gate"
import { searchRecords } from "@/lib/api/admin"
import { findPerson } from "@/lib/api/org-data"
import { useScenario } from "@/lib/api/scenario-context"
import { formatClockTime, formatDuration, formatWeekdayShort, formatShortDate, toDateKey } from "@/lib/format"
import type { CaptureSource, DayStatusValue, PersonDayRow, RecordsResult } from "@/lib/api/types"

const PAGE_SIZE = 20

type StatusFilter = DayStatusValue | "all"
type SourceFilter = CaptureSource | "all"

function dateLabel(date: string): string {
  return `${formatWeekdayShort(date)} ${formatShortDate(date)}`
}

function RecordsContent() {
  const router = useRouter()
  const { version } = useScenario()
  const todayKey = toDateKey(new Date())

  const [personFilter, setPersonFilter] = React.useState<string | null>(null)
  const [from, setFrom] = React.useState(() => toDateKey(startOfMonth(new Date())))
  const [to, setTo] = React.useState(() => todayKey)
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [captureSource, setCaptureSource] = React.useState<SourceFilter>("all")
  const [hasAdjustment, setHasAdjustment] = React.useState(false)
  const [autoClosedOnly, setAutoClosedOnly] = React.useState(false)
  const [page, setPage] = React.useState(1)

  const [result, setResult] = React.useState<RecordsResult | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [selectedRow, setSelectedRow] = React.useState<PersonDayRow | null>(null)
  const [drilldownPersonId, setDrilldownPersonId] = React.useState<string | null>(null)
  const [adjustPrompt, setAdjustPrompt] = React.useState<{ personId: string; personName: string; date: string } | null>(
    null,
  )

  React.useEffect(() => {
    setPage(1)
  }, [personFilter, from, to, status, captureSource, hasAdjustment, autoClosedOnly])

  React.useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    setLoading(true)

    searchRecords({
      person_id: personFilter,
      from,
      to,
      status: status === "all" ? null : status,
      capture_source: captureSource === "all" ? null : captureSource,
      has_adjustment: hasAdjustment,
      auto_closed_only: autoClosedOnly,
      page,
      page_size: PAGE_SIZE,
    }).then((data) => {
      if (!cancelled) {
        setResult(data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [personFilter, from, to, status, captureSource, hasAdjustment, autoClosedOnly, page, version])

  const totalPages = result ? Math.max(1, Math.ceil(result.total_rows / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Records</h1>
        <p className="text-sm text-muted-foreground">Browse and filter every person&apos;s attendance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Person</Label>
              <div className="flex gap-1.5">
                <PersonCombobox value={personFilter} onChange={setPersonFilter} placeholder="All persons" />
                {personFilter && (
                  <Button variant="outline" size="sm" onClick={() => setPersonFilter(null)}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="records-from">From</Label>
              <input
                id="records-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="records-to">To</Label>
              <input
                id="records-to"
                type="date"
                value={to}
                max={todayKey}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="no_record">No record</SelectItem>
                  <SelectItem value="non_working_day">Non-working day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Capture source</Label>
              <Select value={captureSource} onValueChange={(v) => setCaptureSource(v as SourceFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="device">Device</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={hasAdjustment} onCheckedChange={setHasAdjustment} />
                Has adjustment
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={autoClosedOnly} onCheckedChange={setAutoClosedOnly} />
                Auto-closed only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading || !result ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Persons shown"
            value={result.summary.persons_shown}
            tooltip="Distinct persons with at least one row in this filtered set."
          />
          <MetricCard
            label="Days present"
            value={result.summary.days_present}
            tooltip="Rows with at least one punch recorded."
          />
          <MetricCard
            label="No record"
            value={result.summary.days_no_record}
            tooltip="Working days with zero punches recorded."
          />
          <MetricCard
            label="Adjustments"
            value={result.summary.adjustments}
            tooltip="Rows containing at least one adjustment record."
          />
        </div>
      )}

      <Card>
        <CardContent>
          {loading || !result ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : result.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No records match these filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>
                    {result.total_rows} matching day{result.total_rows === 1 ? "" : "s"}, most recent first.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Person</TableHead>
                      <TableHead scope="col">Date</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">First in</TableHead>
                      <TableHead scope="col">Last out</TableHead>
                      <TableHead scope="col" className="text-right">
                        Total
                      </TableHead>
                      <TableHead scope="col">Source</TableHead>
                      <TableHead scope="col">Indicators</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row) => {
                      const hasAdj = row.day.adjustments.length > 0
                      const hasAutoClosed = row.day.punches.some((p) => p.auto_closed)
                      const sources = new Set(row.day.punches.map((p) => p.capture_source))
                      const isNonWorking = row.day.status === "non_working_day"

                      return (
                        <TableRow
                          key={`${row.person_id}_${row.day.date}`}
                          className="cursor-pointer"
                          onClick={() => setSelectedRow(row)}
                        >
                          <TableCell>
                            <button
                              type="button"
                              className="font-medium text-foreground hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDrilldownPersonId(row.person_id)
                              }}
                            >
                              {row.person_name}
                            </button>
                            <p className="text-xs text-muted-foreground">{row.department}</p>
                          </TableCell>
                          <TableCell>{dateLabel(row.day.date)}</TableCell>
                          <TableCell>
                            <StatusChip status={row.day.status} />
                          </TableCell>
                          <TableCell>
                            {!isNonWorking && row.day.first_in ? formatClockTime(row.day.first_in) : "—"}
                          </TableCell>
                          <TableCell>
                            {!isNonWorking && row.day.last_out ? formatClockTime(row.day.last_out) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {isNonWorking ? "—" : formatDuration(row.day.total_minutes)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              {sources.has("web") && (
                                <Monitor className="size-3.5 text-muted-foreground" aria-label="Web" />
                              )}
                              {sources.has("device") && (
                                <Smartphone className="size-3.5 text-muted-foreground" aria-label="Device" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {hasAdj && <Badge variant="secondary">Adjusted</Badge>}
                              {hasAutoClosed && <Badge variant="secondary">Auto-closed</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next page"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DayDetailSheet
        day={selectedRow?.day ?? null}
        onOpenChange={(open) => !open && setSelectedRow(null)}
        personName={selectedRow ? `${selectedRow.person_name} · ${selectedRow.department}` : undefined}
        adjustAction={
          selectedRow
            ? {
                onRequest: () =>
                  setAdjustPrompt({
                    personId: selectedRow.person_id,
                    personName: selectedRow.person_name,
                    date: selectedRow.day.date,
                  }),
                disabled: selectedRow.day.date > todayKey,
                disabledReason: "Future dates cannot be adjusted.",
              }
            : undefined
        }
      />

      <Dialog open={drilldownPersonId !== null} onOpenChange={(open) => !open && setDrilldownPersonId(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
          <DialogTitle className="sr-only">
            {drilldownPersonId ? findPerson(drilldownPersonId)?.name : ""} — Timesheet
          </DialogTitle>
          {drilldownPersonId && (
            <TimesheetView
              personId={drilldownPersonId}
              personName={findPerson(drilldownPersonId)?.name}
              onRequestAdjustment={(day) => {
                const person = findPerson(drilldownPersonId)
                if (person) {
                  setAdjustPrompt({ personId: person.id, personName: person.name, date: day.date })
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={adjustPrompt !== null} onOpenChange={(open) => !open && setAdjustPrompt(null)}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogTitle>New adjustment</DialogTitle>
          {adjustPrompt && (
            <div className="space-y-4">
              <AdjustmentForm
                personId={adjustPrompt.personId}
                personName={adjustPrompt.personName}
                date={adjustPrompt.date}
              />
              <Button
                variant="outline"
                onClick={() => router.push(`/adjustments?person=${adjustPrompt.personId}&date=${adjustPrompt.date}`)}
              >
                Open as full page
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RecordsPage() {
  return (
    <AccessGate allow={(session) => session.is_hr_admin} message="Records are only available to HR Admin.">
      <RecordsContent />
    </AccessGate>
  )
}
