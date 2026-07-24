"use client"

import { FlaskConical } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { SCENARIOS } from "@/lib/api/mock-data"
import { PERSONAS } from "@/lib/api/personas"
import { useScenario } from "@/lib/api/scenario-context"

/**
 * Always rendered, dev or deployed — this is a prototype for teammates to
 * review every state, not a real product, so there is no "real user" a
 * hidden switcher would need to be kept from. Making it always-on avoids
 * needing any hosting-side environment variable to see it on a deployed
 * build.
 */
export function StateSwitcher() {
  return <StateSwitcherPanel />
}

function StateSwitcherPanel() {
  const { scenario, persona, selectScenario, selectPersona } = useScenario()

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" className="rounded-full shadow-lg" aria-label="Open scenario switcher">
            <FlaskConical />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-2">
          <Tabs defaultValue="persona">
            <TabsList className="w-full">
              <TabsTrigger value="persona" className="flex-1">
                Persona
              </TabsTrigger>
              <TabsTrigger value="scenario" className="flex-1">
                Scenario
              </TabsTrigger>
            </TabsList>

            <TabsContent value="persona">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Who&apos;s viewing — drives nav and access
              </p>
              <ScrollArea className="h-72">
                <div className="flex flex-col gap-0.5 pr-2">
                  {PERSONAS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => selectPersona(item.key)}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                        persona === item.key && "bg-secondary",
                      )}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="scenario">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Your own attendance data
              </p>
              <ScrollArea className="h-72">
                <div className="flex flex-col gap-0.5 pr-2">
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
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
}
