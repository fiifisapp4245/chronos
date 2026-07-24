"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { PERSONS } from "@/lib/api/org-data"

interface PersonComboboxProps {
  value: string | null
  onChange: (personId: string) => void
  placeholder?: string
}

export function PersonCombobox({ value, onChange, placeholder = "Search person…" }: PersonComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = PERSONS.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? `${selected.name} — ${selected.department}` : placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name…" />
          <CommandList>
            <CommandEmpty>No person found.</CommandEmpty>
            <CommandGroup>
              {PERSONS.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`${person.name} ${person.department}`}
                  onSelect={() => {
                    onChange(person.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("size-4", value === person.id ? "opacity-100" : "opacity-0")} />
                  {person.name}
                  <span className="ml-auto text-xs text-muted-foreground">{person.department}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
