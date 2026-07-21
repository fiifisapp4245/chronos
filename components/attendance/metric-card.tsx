import { Info } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface MetricLabelProps {
  label: string
  tooltip: string
}

function MetricLabel({ label, tooltip }: MetricLabelProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground/60 hover:text-foreground"
            aria-label={`About "${label}"`}
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  tooltip: string
  className?: string
}

export function MetricCard({ label, value, tooltip, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardContent>
        <dl>
          <dt>
            <MetricLabel label={label} tooltip={tooltip} />
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}

interface ToggleMetricCardProps {
  label: string
  value: string | number
  tooltip: string
  className?: string
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
}

/** Same visual shape as MetricCard, but the value itself is a toggle button
 *  (e.g. "Adjustments" filters the day list to just those rows). The info
 *  tooltip trigger stays a sibling, not nested, so we never put a button
 *  inside a button. */
export function ToggleMetricCard({
  label,
  value,
  tooltip,
  className,
  pressed,
  onPressedChange,
}: ToggleMetricCardProps) {
  return (
    <Card className={className}>
      <CardContent>
        <dl>
          <dt>
            <MetricLabel label={label} tooltip={tooltip} />
          </dt>
          <dd className="mt-1">
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onPressedChange(!pressed)}
              className={cn(
                "-ml-1 rounded-lg px-1 py-0.5 text-2xl font-semibold tabular-nums transition-colors hover:bg-muted/60",
                pressed && "bg-secondary hover:bg-secondary",
              )}
            >
              {value}
            </button>
          </dd>
          {pressed && (
            <dd className="mt-1 text-xs text-muted-foreground">Filtering the list to these days</dd>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
