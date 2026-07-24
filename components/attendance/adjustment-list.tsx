import { Badge } from "@/components/ui/badge"
import { formatClockTime, formatDayLabel, toDateKey } from "@/lib/format"
import type { Adjustment, Punch } from "@/lib/api/types"

interface AdjustmentListProps {
  adjustments: Adjustment[]
  punches: Punch[]
}

function directionLabel(direction: "in" | "out"): string {
  return direction === "in" ? "Clock in" : "Clock out"
}

export function AdjustmentList({ adjustments, punches }: AdjustmentListProps) {
  if (adjustments.length === 0) return null

  const ordered = [...adjustments].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const supersededByLaterId = new Map<string, Adjustment>()
  for (const adjustment of ordered) {
    if (adjustment.supersedes_adjustment_id) {
      supersededByLaterId.set(adjustment.supersedes_adjustment_id, adjustment)
    }
  }

  return (
    <div className="space-y-3">
      {ordered.map((adjustment) => {
        const originalPunch = adjustment.references_punch_id
          ? punches.find((p) => p.id === adjustment.references_punch_id)
          : null
        const correctedByAdjustment = supersededByLaterId.get(adjustment.id) ?? null
        const createdDayKey = toDateKey(new Date(adjustment.created_at))

        const badgeLabel =
          adjustment.type === "supersede" ? "Adjusted" : adjustment.type === "add_pair" ? "Added pair" : "Added"

        return (
          <div key={adjustment.id} className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{badgeLabel}</Badge>
              {correctedByAdjustment && (
                <Badge variant="secondary" className="text-muted-foreground">
                  Superseded by adjustment
                </Badge>
              )}
            </div>

            {originalPunch && (
              <p className="text-sm text-muted-foreground">
                Original punch: {formatClockTime(originalPunch.timestamp)} (unchanged, kept for the record)
              </p>
            )}

            <div className="space-y-1">
              {adjustment.entries.map((entry, index) => (
                <p key={index} className="text-sm">
                  {originalPunch ? "Corrected to" : "Recorded"} {directionLabel(entry.direction)}{" "}
                  {formatClockTime(entry.timestamp)}
                </p>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">{adjustment.reason}</p>
            <p className="text-xs text-muted-foreground">
              {adjustment.adjusted_by} — {formatDayLabel(createdDayKey)}
            </p>

            {correctedByAdjustment && (
              <p className="text-xs text-muted-foreground">
                Corrected below on {formatDayLabel(toDateKey(new Date(correctedByAdjustment.created_at)))}.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
