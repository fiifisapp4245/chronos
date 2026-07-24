"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { NoAccess } from "@/components/shell/no-access"
import { useSessionContext } from "@/lib/api/use-session"
import type { SessionContext } from "@/lib/api/types"

interface AccessGateProps {
  allow: (session: SessionContext) => boolean
  message?: string
  children: React.ReactNode
}

/** Gates a route on session context. Loading state while session resolves,
 *  a neutral NoAccess if the persona doesn't qualify — never a redirect. */
export function AccessGate({ allow, message, children }: AccessGateProps) {
  const { session, loading } = useSessionContext()

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!session || !allow(session)) {
    return <NoAccess message={message} />
  }

  return <>{children}</>
}
