"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, MapPin, Shield, Table2, Users } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { DarkModeToggle } from "@/components/shell/dark-mode-toggle"
import { APP_NAME } from "@/lib/constants"
import { getSessionContext } from "@/lib/api/attendance"
import type { SessionContext } from "@/lib/api/types"

const NAV_ITEMS = [
  { href: "/clock", label: "Clock", icon: Clock },
  { href: "/timesheet", label: "Timesheet", icon: Table2 },
] as const

const FUTURE_NAV_ITEMS = [
  { label: "Team", icon: Users },
  { label: "Admin", icon: Shield },
] as const

function formatLocationLabel(locationId: string): string {
  const parts = locationId.split(/[_-]/).filter((part) => part.toLowerCase() !== "loc")
  if (parts.length === 0) return locationId
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3.5 w-56" />
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [session, setSession] = React.useState<SessionContext | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getSessionContext().then((data) => {
      if (!cancelled) setSession(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-3">
          <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            {APP_NAME}
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Attendance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname?.startsWith(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Organization</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {FUTURE_NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      aria-disabled="true"
                      className="cursor-not-allowed text-muted-foreground/70"
                      tooltip={`${item.label} — coming in a later pass`}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-3 py-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Team and Admin are coming in a later pass.
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            {session ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{session.business_name}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <span>{session.display_name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{session.role}</span>
                  <span aria-hidden="true">·</span>
                  <MapPin className="size-3" aria-hidden="true" />
                  <span>{formatLocationLabel(session.location_id)}</span>
                </p>
              </div>
            ) : (
              <HeaderSkeleton />
            )}
          </div>
          <DarkModeToggle />
        </header>
        {/* SidebarInset already renders the <main> landmark — don't nest another. */}
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
