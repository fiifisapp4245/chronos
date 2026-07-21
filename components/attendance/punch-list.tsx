import { LogIn, LogOut, Monitor, Smartphone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatClockTime } from "@/lib/format"
import type { Punch } from "@/lib/api/types"

interface PunchListProps {
  punches: Punch[]
  emptyLabel?: string
}

export function PunchList({ punches, emptyLabel = "No punches recorded yet today." }: PunchListProps) {
  if (punches.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border">
      {punches.map((punch) => (
        <li key={punch.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div className="flex items-center gap-2.5">
            {punch.direction === "in" ? (
              <LogIn className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <LogOut className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">
              {punch.direction === "in" ? "Clock in" : "Clock out"}
            </span>
            <span className="text-sm text-muted-foreground">{formatClockTime(punch.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2">
            {punch.auto_closed && (
              <Badge variant="secondary" className="text-muted-foreground">
                Auto-closed at day end
              </Badge>
            )}
            {punch.capture_source === "web" ? (
              <Monitor className="size-3.5 text-muted-foreground" aria-label="Captured on web" />
            ) : (
              <Smartphone className="size-3.5 text-muted-foreground" aria-label="Captured on device" />
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
