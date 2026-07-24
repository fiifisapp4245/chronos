import { Monitor, Smartphone } from "lucide-react"

import { formatClockTime, formatDuration } from "@/lib/format"
import type { TeamMemberToday } from "@/lib/api/types"

interface TeamRosterProps {
  members: TeamMemberToday[]
  isToday: boolean
  onSelectMember: (member: TeamMemberToday) => void
}

interface StatusLine {
  text: string
  live: boolean
}

function memberStatusLine(member: TeamMemberToday, isToday: boolean): StatusLine {
  if (isToday) {
    if (member.is_clocked_in && member.first_in) {
      return { text: `Clocked in since ${formatClockTime(member.first_in)}`, live: true }
    }
    if (member.status === "present") {
      return { text: `Clocked out — ${formatDuration(member.total_minutes)} today`, live: false }
    }
    if (member.status === "non_working_day") {
      return { text: "Non-working day", live: false }
    }
    return { text: "No record today", live: false }
  }

  if (member.status === "present" && member.first_in && member.last_out) {
    return {
      text: `${formatClockTime(member.first_in)} – ${formatClockTime(member.last_out)} · ${formatDuration(member.total_minutes)}`,
      live: false,
    }
  }
  if (member.status === "non_working_day") {
    return { text: "Non-working day", live: false }
  }
  return { text: "No record", live: false }
}

/** No-record persons first — the follow-up cue, not an accusation. */
function statusRank(member: TeamMemberToday): number {
  if (member.status === "no_record") return 0
  if (member.status === "present") return 1
  return 2
}

export function TeamRoster({ members, isToday, onSelectMember }: TeamRosterProps) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No one is in this scope.</p>
  }

  const ordered = [...members].sort((a, b) => {
    const rankDiff = statusRank(a) - statusRank(b)
    return rankDiff !== 0 ? rankDiff : a.person_name.localeCompare(b.person_name)
  })

  return (
    <ul className="flex flex-col gap-2">
      {ordered.map((member) => {
        const { text, live } = memberStatusLine(member, isToday)

        return (
          <li key={member.person_id}>
            <button
              type="button"
              onClick={() => onSelectMember(member)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl bg-card p-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.person_name}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {live && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                  {text}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {member.first_in && !isToday && <span>{formatClockTime(member.first_in)}</span>}
                {member.capture_source === "web" && (
                  <Monitor className="size-3.5" aria-label="Captured on web" />
                )}
                {member.capture_source === "device" && (
                  <Smartphone className="size-3.5" aria-label="Captured on device" />
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
