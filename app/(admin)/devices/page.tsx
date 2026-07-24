"use client"

import * as React from "react"
import { CircleDashed, Wifi, WifiOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MetricCard } from "@/components/attendance/metric-card"
import { AccessGate } from "@/components/shell/access-gate"
import { getDeviceEnrolments, getEnrolmentProgress, listDevices, registerDevice } from "@/lib/api/admin"
import { LOCATIONS } from "@/lib/api/org-data"
import { formatClockTime, formatLocationLabel } from "@/lib/format"
import type { Device, DeviceEnrolment, DeviceStatus, EnrolmentProgress, RegisterDevicePayload } from "@/lib/api/types"

const STATUS_LABEL: Record<DeviceStatus, string> = {
  online: "Online",
  offline: "Offline",
  never_connected: "Never connected",
}

function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  if (status === "online") {
    return (
      <Badge>
        <Wifi />
        {STATUS_LABEL.online}
      </Badge>
    )
  }
  if (status === "offline") {
    return (
      <Badge variant="destructive">
        <WifiOff />
        {STATUS_LABEL.offline}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <CircleDashed />
      {STATUS_LABEL.never_connected}
    </Badge>
  )
}

function EnrolmentProgressCard({ progress }: { progress: EnrolmentProgress }) {
  const notEnrolled = progress.total_persons - progress.enrolled_count - progress.pending_sync_count

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enrolment progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-2xl font-semibold tabular-nums">
          Enrolled {progress.enrolled_count} of {progress.total_persons}
        </p>
        <p className="text-sm text-muted-foreground">
          {progress.pending_sync_count} pending sync to devices · {notEnrolled} not yet enrolled
        </p>
        <div className="space-y-2">
          {progress.by_department.map((dept) => (
            <div key={dept.department} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{dept.department}</span>
                <span>
                  {dept.enrolled} / {dept.total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="presentation">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((dept.enrolled / dept.total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const EMPTY_REGISTER_FORM: RegisterDevicePayload = {
  name: "",
  vendor: "",
  model: "",
  serial: "",
  location_id: LOCATIONS[0],
}

function RegisterDeviceDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered: (device: Device) => void
}) {
  const [form, setForm] = React.useState<RegisterDevicePayload>(EMPTY_REGISTER_FORM)
  const [submitting, setSubmitting] = React.useState(false)

  const canSubmit = form.name.trim() && form.vendor.trim() && form.model.trim() && form.serial.trim()

  async function handleSubmit() {
    setSubmitting(true)
    const device = await registerDevice(form)
    setSubmitting(false)
    setForm(EMPTY_REGISTER_FORM)
    onRegistered(device)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Register device</DialogTitle>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="device-name">Name</Label>
            <Input
              id="device-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Accra HQ — Side Entrance"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="device-vendor">Vendor</Label>
              <Input
                id="device-vendor"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="device-model">Model</Label>
              <Input
                id="device-model"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="device-serial">Serial</Label>
            <Input
              id="device-serial"
              value={form.serial}
              onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select
              value={form.location_id}
              onValueChange={(value) => setForm((f) => ({ ...f, location_id: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {formatLocationLabel(loc)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit} className="w-full">
            {submitting ? "Registering…" : "Register device"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeviceDetailDialog({ device, onOpenChange }: { device: Device | null; onOpenChange: (open: boolean) => void }) {
  const [enrolments, setEnrolments] = React.useState<DeviceEnrolment[] | null>(null)

  React.useEffect(() => {
    if (!device) {
      setEnrolments(null)
      return
    }
    let cancelled = false
    getDeviceEnrolments(device.id).then((data) => {
      if (!cancelled) setEnrolments(data)
    })
    return () => {
      cancelled = true
    }
  }, [device])

  const counts = enrolments
    ? {
        enrolled: enrolments.filter((e) => e.state === "enrolled").length,
        pending_sync: enrolments.filter((e) => e.state === "pending_sync").length,
        not_enrolled: enrolments.filter((e) => e.state === "not_enrolled").length,
      }
    : null

  return (
    <Dialog open={device !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {device && (
          <>
            <DialogTitle>{device.name}</DialogTitle>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <DeviceStatusBadge status={device.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Last sync</p>
                  <p className="font-medium">
                    {device.last_sync_at ? formatClockTime(device.last_sync_at) : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Queued events</p>
                  <p className="font-medium tabular-nums">{device.queued_events_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{formatLocationLabel(device.location_id)}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Enrolment on this device</h3>
                {!enrolments || !counts ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {counts.enrolled} enrolled · {counts.pending_sync} pending sync to this device ·{" "}
                      {counts.not_enrolled} not enrolled
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                      <Table>
                        <TableCaption className="sr-only">Per-person enrolment state on this device</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">Person</TableHead>
                            <TableHead scope="col">State</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrolments.map((enrolment) => (
                            <TableRow key={enrolment.person_id}>
                              <TableCell>{enrolment.person_name}</TableCell>
                              <TableCell>
                                {enrolment.state === "enrolled" && <Badge>Enrolled</Badge>}
                                {enrolment.state === "pending_sync" && (
                                  <Badge variant="secondary">Pending sync</Badge>
                                )}
                                {enrolment.state === "not_enrolled" && (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Not enrolled
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DevicesContent() {
  const [devices, setDevices] = React.useState<Device[] | null>(null)
  const [progress, setProgress] = React.useState<EnrolmentProgress | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [registerOpen, setRegisterOpen] = React.useState(false)
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([listDevices(), getEnrolmentProgress()]).then(([deviceList, enrolmentProgress]) => {
      if (!cancelled) {
        setDevices(deviceList)
        setProgress(enrolmentProgress)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Devices</h1>
          <p className="text-sm text-muted-foreground">
            Capture hardware for time capture is optional in this version — templates sync to
            registered devices, they are never created on one.
          </p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>Register device</Button>
      </div>

      {loading || !progress ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EnrolmentProgressCard progress={progress} />
          <MetricCard
            label="Registered devices"
            value={devices?.length ?? 0}
            tooltip="Capture devices registered to this tenant, across all locations."
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered devices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !devices ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No devices registered yet — web clock-in is active, and hardware is optional.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>Capture devices for this tenant.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Device</TableHead>
                    <TableHead scope="col">Vendor / model</TableHead>
                    <TableHead scope="col">Serial</TableHead>
                    <TableHead scope="col">Location</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Last sync</TableHead>
                    <TableHead scope="col" className="text-right">
                      Queued
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow
                      key={device.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedDevice(device)}
                    >
                      <TableCell className="font-medium text-foreground">{device.name}</TableCell>
                      <TableCell>
                        {device.vendor} {device.model}
                      </TableCell>
                      <TableCell>{device.serial}</TableCell>
                      <TableCell>{formatLocationLabel(device.location_id)}</TableCell>
                      <TableCell>
                        <DeviceStatusBadge status={device.status} />
                      </TableCell>
                      <TableCell>
                        {device.last_sync_at ? formatClockTime(device.last_sync_at) : "Never"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{device.queued_events_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RegisterDeviceDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={(device) => setDevices((prev) => (prev ? [...prev, device] : [device]))}
      />

      <DeviceDetailDialog device={selectedDevice} onOpenChange={(open) => !open && setSelectedDevice(null)} />
    </div>
  )
}

export default function DevicesPage() {
  return (
    <AccessGate allow={(session) => session.is_hr_admin} message="Devices are only available to HR Admin.">
      <DevicesContent />
    </AccessGate>
  )
}
