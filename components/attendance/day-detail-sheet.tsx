import { PenLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AdjustmentList } from "@/components/attendance/adjustment-list"
import { PunchList } from "@/components/attendance/punch-list"
import { StatusChip } from "@/components/attendance/status-chip"
import { formatClockTime, formatDayLabel, formatDuration } from "@/lib/format"
import type { DayStatus } from "@/lib/api/types"

export interface DayDetailAdjustAction {
  onRequest: () => void
  disabled?: boolean
  disabledReason?: string
}

interface DayDetailSheetProps {
  day: DayStatus | null
  onOpenChange: (open: boolean) => void
  /** Whose day this is, when viewing someone other than yourself (Records,
   *  Team). Omitted for an employee's own Timesheet. */
  personName?: string
  /** Present only for HR Admin contexts — employees and Team viewers never
   *  get this affordance (Team is read-only in V1). */
  adjustAction?: DayDetailAdjustAction
}

export function DayDetailSheet({ day, onOpenChange, personName, adjustAction }: DayDetailSheetProps) {
  return (
    <Sheet open={day !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto">
        {day && (
          <>
            <SheetHeader>
              {personName && <p className="text-xs text-muted-foreground">{personName}</p>}
              <SheetTitle>{formatDayLabel(day.date)}</SheetTitle>
              <SheetDescription asChild>
                <span>
                  <StatusChip status={day.status} />
                </span>
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
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
                <PunchList
                  punches={day.punches}
                  adjustments={day.adjustments}
                  emptyLabel="No punches recorded."
                />
              </div>

              {day.adjustments.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Adjustments</h3>
                  <AdjustmentList adjustments={day.adjustments} punches={day.punches} />
                </div>
              )}
            </div>
            {adjustAction && (
              <SheetFooter className="border-t border-border">
                <Button
                  variant="outline"
                  disabled={adjustAction.disabled}
                  onClick={adjustAction.onRequest}
                  title={adjustAction.disabled ? adjustAction.disabledReason : undefined}
                >
                  <PenLine />
                  Add adjustment
                </Button>
                {adjustAction.disabled && adjustAction.disabledReason && (
                  <p className="text-xs text-muted-foreground">{adjustAction.disabledReason}</p>
                )}
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
