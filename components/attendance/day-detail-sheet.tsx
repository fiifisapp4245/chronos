import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AdjustmentList } from "@/components/attendance/adjustment-list"
import { PunchList } from "@/components/attendance/punch-list"
import { StatusChip } from "@/components/attendance/status-chip"
import { formatClockTime, formatDayLabel, formatDuration } from "@/lib/format"
import type { DayStatus } from "@/lib/api/types"

interface DayDetailSheetProps {
  day: DayStatus | null
  onOpenChange: (open: boolean) => void
}

export function DayDetailSheet({ day, onOpenChange }: DayDetailSheetProps) {
  return (
    <Sheet open={day !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {day && (
          <>
            <SheetHeader>
              <SheetTitle>{formatDayLabel(day.date)}</SheetTitle>
              <SheetDescription asChild>
                <span>
                  <StatusChip status={day.status} />
                </span>
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 px-6 pb-6">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">First in</p>
                  <p className="font-medium">
                    {day.first_in ? formatClockTime(day.first_in) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last out</p>
                  <p className="font-medium">
                    {day.last_out ? formatClockTime(day.last_out) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatDuration(day.total_minutes)}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Punches</h3>
                <PunchList punches={day.punches} emptyLabel="No punches recorded." />
              </div>

              {day.adjustments.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Adjustments</h3>
                  <AdjustmentList adjustments={day.adjustments} punches={day.punches} />
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
