"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, MapPin, Shield, SlidersHorizontal, Table2, Users } from "lucide-react"

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
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { DarkModeToggle } from "@/components/shell/dark-mode-toggle"
import { APP_NAME } from "@/lib/constants"
import { useSessionContext } from "@/lib/api/use-session"
import { formatLocationLabel } from "@/lib/format"
import type { SessionContext } from "@/lib/api/types"

const NAV_ITEMS = [
  { href: "/clock", label: "Clock", icon: Clock },
  { href: "/timesheet", label: "Timesheet", icon: Table2 },
] as const

const ADMIN_NAV_ITEMS = [
  { href: "/records", label: "Records", icon: Table2 },
  { href: "/adjustments", label: "Adjustments", icon: SlidersHorizontal },
  { href: "/devices", label: "Devices", icon: Shield },
] as const

function hasTeamAccess(session: SessionContext): boolean {
  return session.direct_report_count > 0 || session.hod_department !== null || session.dotted_report_count > 0
}

/** A person can be several things at once — nav and header show the union. */
function derivePersonaLabels(session: SessionContext): string[] {
  const labels: string[] = []
  if (session.is_hr_admin) labels.push("HR Admin")
  if (session.direct_report_count > 0) labels.push("Line Manager")
  if (session.hod_department) labels.push(`${session.hod_department} HoD`)
  if (session.dotted_report_count > 0) labels.push("Dotted-line viewer")
  if (labels.length === 0) labels.push("Employee")
  return labels
}

interface NavLinkProps {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
}

/** Closes the mobile off-canvas sidebar on navigation — it renders as a
 *  Radix Sheet that otherwise stays open over the destination page, since
 *  nothing else ever calls setOpenMobile(false). */
function NavLink({ href, label, icon: Icon, isActive }: NavLinkProps) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={label}
      onClick={() => isMobile && setOpenMobile(false)}
    >
      <Link href={href}>
        <Icon />
        <span>{label}</span>
      </Link>
    </SidebarMenuButton>
  )
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
  const { session } = useSessionContext()

  const showTeam = session ? hasTeamAccess(session) : false
  const showAdmin = session ? session.is_hr_admin : false

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
                    <NavLink
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={Boolean(pathname?.startsWith(item.href))}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {showTeam && (
            <SidebarGroup>
              <SidebarGroupLabel>Organization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <NavLink
                      href="/team"
                      label="Team"
                      icon={Users}
                      isActive={Boolean(pathname?.startsWith("/team"))}
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {showAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <NavLink
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={Boolean(pathname?.startsWith(item.href))}
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        {!showTeam && !showAdmin && (
          <SidebarFooter className="px-3 py-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Team and Admin appear here for personas with reports or HR admin access.
          </SidebarFooter>
        )}
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            {session ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{session.business_name}</p>
                <p className="flex flex-wrap items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <span>{session.display_name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{derivePersonaLabels(session).join(" · ")}</span>
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
