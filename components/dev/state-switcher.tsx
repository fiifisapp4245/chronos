"use client"

import { FlaskConical } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { SCENARIOS } from "@/lib/api/mock-data"
import { useScenario } from "@/lib/api/scenario-context"

export function StateSwitcher() {
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return <StateSwitcherPanel />
}

function StateSwitcherPanel() {
  const { scenario, selectScenario } = useScenario()

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" className="rounded-full shadow-lg" aria-label="Open scenario switcher">
            <FlaskConical />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-2">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Dev scenario switcher
          </p>
          <div className="flex flex-col gap-0.5">
            {SCENARIOS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => selectScenario(item.key)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                  scenario === item.key && "bg-secondary",
                )}
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
