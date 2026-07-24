import { ShieldAlert } from "lucide-react"

interface NoAccessProps {
  message?: string
}

/** Neutral access-denied state — never a redirect loop, never an accusation. */
export function NoAccess({ message = "You don't have access to this page." }: NoAccessProps) {
  return (
    <div
      role="status"
      className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center"
    >
      <ShieldAlert className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
