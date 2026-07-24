"use client"

import * as React from "react"

import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AdjustmentForm } from "@/components/admin/adjustment-form"
import { PersonCombobox } from "@/components/admin/person-combobox"
import { AccessGate } from "@/components/shell/access-gate"
import { findPerson } from "@/lib/api/org-data"
import { toDateKey } from "@/lib/format"

function AdjustmentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personId = searchParams.get("person")
  const date = searchParams.get("date")

  const [pickedPerson, setPickedPerson] = React.useState<string | null>(null)
  const [pickedDate, setPickedDate] = React.useState<string>(() => toDateKey(new Date()))

  if (!personId || !date) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Adjustments</h1>
          <p className="text-sm text-muted-foreground">
            Start a correction for a person&apos;s day. Adjustments can also be started from a day&apos;s
            detail panel in Records.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose a person and day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Person</Label>
              <PersonCombobox value={pickedPerson} onChange={setPickedPerson} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="picked-date">Date</Label>
              <input
                id="picked-date"
                type="date"
                value={pickedDate}
                max={toDateKey(new Date())}
                onChange={(e) => setPickedDate(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
              />
            </div>
            <Button
              disabled={!pickedPerson || !pickedDate}
              onClick={() => {
                if (pickedPerson && pickedDate) {
                  router.push(`/adjustments?person=${pickedPerson}&date=${pickedDate}`)
                }
              }}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const person = findPerson(personId)

  if (!person) {
    return <p className="text-sm text-muted-foreground">Person not found.</p>
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New adjustment</h1>
        <p className="text-sm text-muted-foreground">
          {person.name} · {person.department}
        </p>
      </div>
      <AdjustmentForm personId={personId} personName={person.name} date={date} />
      <Button variant="outline" onClick={() => router.push("/records")}>
        Back to records
      </Button>
    </div>
  )
}

export default function AdjustmentsPage() {
  return (
    <AccessGate allow={(session) => session.is_hr_admin} message="Adjustments are only available to HR Admin.">
      <React.Suspense fallback={null}>
        <AdjustmentsContent />
      </React.Suspense>
    </AccessGate>
  )
}
