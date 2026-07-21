import { CircleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DayStatusValue } from "@/lib/api/types"

const STATUS_LABEL: Record<DayStatusValue, string> = {
  present: "Present",
  no_record: "No record",
  non_working_day: "Non-working day",
}

interface StatusChipProps {
  status: DayStatusValue
  className?: string
}

export function StatusChip({ status, className }: StatusChipProps) {
  if (status === "present") {
    return <Badge className={className}>{STATUS_LABEL.present}</Badge>
  }

  if (status === "no_record") {
    return (
      <Badge variant="secondary" className={cn("text-muted-foreground", className)}>
        <CircleAlert className="opacity-70" />
        {STATUS_LABEL.no_record}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn("border-dashed text-muted-foreground/70", className)}
    >
      {STATUS_LABEL.non_working_day}
    </Badge>
  )
}
