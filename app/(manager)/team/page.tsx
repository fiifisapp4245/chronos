"use client"

import { Users } from "lucide-react"

import { AccessGate } from "@/components/shell/access-gate"
import { useSessionContext } from "@/lib/api/use-session"

function TeamContent() {
  const { session } = useSessionContext()
  if (!session) return null

  const scopes: string[] = []
  if (session.direct_report_count > 0) scopes.push("My reports")
  if (session.hod_department) scopes.push(`${session.hod_department} department`)
  if (session.dotted_report_count > 0) scopes.push("Dotted reports")

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <Users className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">Team attendance — coming in a later pass</p>
      <p className="text-sm text-muted-foreground">
        Access is already gated correctly: this persona would see {scopes.length === 1 ? "one tab" : `${scopes.length} tabs`} —{" "}
        {scopes.join(", ")}.
      </p>
    </div>
  )
}

export default function TeamPage() {
  return (
    <AccessGate
      allow={(session) =>
        session.direct_report_count > 0 || session.hod_department !== null || session.dotted_report_count > 0
      }
      message="Team is only available to line managers, heads of department, or dotted-line viewers."
    >
      <TeamContent />
    </AccessGate>
  )
}
