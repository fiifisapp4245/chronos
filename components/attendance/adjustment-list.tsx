import { Badge } from "@/components/ui/badge"
import { formatClockTime, formatDayLabel, toDateKey } from "@/lib/format"
import type { Adjustment, Punch } from "@/lib/api/types"

interface AdjustmentListProps {
  adjustments: Adjustment[]
  punches: Punch[]
}

export function AdjustmentList({ adjustments, punches }: AdjustmentListProps) {
  if (adjustments.length === 0) return null

  return (
    <div className="space-y-3">
      {adjustments.map((adjustment) => {
        const original = adjustment.references_punch_id
          ? punches.find((p) => p.id === adjustment.references_punch_id)
          : null
        const createdDayKey = toDateKey(new Date(adjustment.created_at))

        return (
          <div key={adjustment.id} className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{original ? "Adjusted" : "Added"}</Badge>
              <span className="text-sm font-medium">
                {adjustment.adjusted_direction === "in" ? "Clock in" : "Clock out"}
              </span>
            </div>
            {original && (
              <p className="text-sm text-muted-foreground">
                Original punch: {formatClockTime(original.timestamp)} (unchanged, kept for the record)
              </p>
            )}
            <p className="text-sm">
              {original ? "Corrected to" : "Recorded as"} {formatClockTime(adjustment.adjusted_timestamp)}
            </p>
            <p className="text-sm text-muted-foreground">{adjustment.reason}</p>
            <p className="text-xs text-muted-foreground">
              {adjustment.adjusted_by} — {formatDayLabel(createdDayKey)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
