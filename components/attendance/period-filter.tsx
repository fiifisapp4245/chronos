import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type PeriodKind = "week" | "month" | "custom"

interface PeriodFilterProps {
  kind: PeriodKind
  onKindChange: (kind: PeriodKind) => void
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
  customFrom: string
  customTo: string
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  maxDate: string
}

export function PeriodFilter({
  kind,
  onKindChange,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  maxDate,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Tabs value={kind} onValueChange={(value) => onKindChange(value as PeriodKind)}>
        <TabsList>
          <TabsTrigger value="week" onClick={() => onKindChange("week")}>
            This week
          </TabsTrigger>
          <TabsTrigger value="month" onClick={() => onKindChange("month")}>
            This month
          </TabsTrigger>
          <TabsTrigger value="custom" onClick={() => onKindChange("custom")}>
            Custom range
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {kind === "custom" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="period-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input
              id="period-from"
              type="date"
              value={customFrom}
              max={maxDate}
              onChange={(event) => onCustomFromChange(event.target.value)}
              className="h-9 w-40"
            />
          </div>
          <span className="pb-2 text-muted-foreground" aria-hidden="true">
            –
          </span>
          <div className="flex flex-col gap-1">
            <label htmlFor="period-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input
              id="period-to"
              type="date"
              value={customTo}
              max={maxDate}
              onChange={(event) => onCustomToChange(event.target.value)}
              className="h-9 w-40"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous period"
            disabled={!canGoPrev}
            onClick={onPrev}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next period"
            disabled={!canGoNext}
            onClick={onNext}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
