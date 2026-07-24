"use client"

import * as React from "react"
import { addDays, subDays } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimesheetView } from "@/components/attendance/timesheet-view"
import { TeamRoster } from "@/components/team/team-roster"
import { AccessGate } from "@/components/shell/access-gate"
import { getTeam } from "@/lib/api/team"
import { useScenario } from "@/lib/api/scenario-context"
import { useSessionContext } from "@/lib/api/use-session"
import { formatDayLabel, toDateKey } from "@/lib/format"
import type { SessionContext, TeamDay, TeamMemberToday, TeamScope } from "@/lib/api/types"

interface ScopeOption {
  key: TeamScope
  label: string
}

function availableScopes(session: SessionContext): ScopeOption[] {
  const scopes: ScopeOption[] = []
  if (session.direct_report_count > 0) scopes.push({ key: "direct", label: "My reports" })
  if (session.hod_department) {
    scopes.push({ key: "department", label: `${session.hod_department} department` })
  }
  if (session.dotted_report_count > 0) scopes.push({ key: "dotted", label: "Dotted reports" })
  return scopes
}

function TeamContent({ session }: { session: SessionContext }) {
  const { version } = useScenario()
  const scopes = React.useMemo(() => availableScopes(session), [session])

  const [activeScope, setActiveScope] = React.useState<TeamScope>(() => scopes[0]?.key ?? "direct")
  const [dateCursor, setDateCursor] = React.useState<Date | null>(null)
  const [teamDay, setTeamDay] = React.useState<TeamDay | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedMember, setSelectedMember] = React.useState<TeamMemberToday | null>(null)

  // Client-only init so server and first client render agree.
  React.useEffect(() => {
    setDateCursor(new Date())
  }, [])

  // If the persona switch changes which scopes exist, land on the first one.
  React.useEffect(() => {
    if (scopes.length > 0 && !scopes.some((s) => s.key === activeScope)) {
      setActiveScope(scopes[0].key)
    }
  }, [scopes, activeScope])

  React.useEffect(() => {
    if (!dateCursor) return
    let cancelled = false
    setLoading(true)
    const dateKey = toDateKey(dateCursor)

    getTeam(activeScope, dateKey).then((data) => {
      if (!cancelled) {
        setTeamDay(data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeScope, dateCursor, version])

  const todayKey = toDateKey(new Date())
  const dateKey = dateCursor ? toDateKey(dateCursor) : todayKey
  const isToday = dateKey === todayKey

  const summary = React.useMemo(() => {
    if (!teamDay) return null
    const total = teamDay.members.length
    if (total === 0) return "No one in this scope."
    if (isToday) {
      const clockedIn = teamDay.members.filter((m) => m.is_clocked_in).length
      return `${clockedIn} of ${total} clocked in today`
    }
    const present = teamDay.members.filter((m) => m.status === "present").length
    return `${present} of ${total} present on ${formatDayLabel(dateKey)}`
  }, [teamDay, isToday, dateKey])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">{teamDay?.scope_label ?? " "}</p>
      </div>

      {scopes.length > 1 && (
        <Tabs value={activeScope} onValueChange={(value) => setActiveScope(value as TeamScope)}>
          <TabsList>
            {scopes.map((scope) => (
              <TabsTrigger key={scope.key} value={scope.key}>
                {scope.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">{formatDayLabel(dateKey)}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous day"
              disabled={!dateCursor}
              onClick={() => setDateCursor((cursor) => (cursor ? subDays(cursor, 1) : cursor))}
            >
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" disabled={!dateCursor || isToday} onClick={() => setDateCursor(new Date())}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next day"
              disabled={!dateCursor || isToday}
              onClick={() => setDateCursor((cursor) => (cursor ? addDays(cursor, 1) : cursor))}
            >
              <ChevronRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading || !teamDay ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm font-medium" aria-live="polite">
                {summary}
              </p>
              <TeamRoster members={teamDay.members} isToday={isToday} onSelectMember={setSelectedMember} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedMember !== null} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
          <DialogTitle className="sr-only">{selectedMember?.person_name} — Timesheet</DialogTitle>
          {selectedMember && (
            // No onRequestAdjustment — Team is view-only in V1, for every scope.
            <TimesheetView personId={selectedMember.person_id} personName={selectedMember.person_name} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TeamPageInner() {
  const { session, loading } = useSessionContext()

  if (loading || !session) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return <TeamContent session={session} />
}

export default function TeamPage() {
  return (
    <AccessGate
      allow={(session) =>
        session.direct_report_count > 0 || session.hod_department !== null || session.dotted_report_count > 0
      }
      message="Team is only available to line managers, heads of department, or dotted-line viewers."
    >
      <TeamPageInner />
    </AccessGate>
  )
}
