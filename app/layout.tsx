import type { Metadata } from "next"
import { Geist_Mono, IBM_Plex_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/shell/app-shell"
import { StateSwitcher } from "@/components/dev/state-switcher"
import { ScenarioProvider } from "@/lib/api/scenario-context"
import { APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Time capture: clock in, clock out, and review attendance history.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", ibmPlexSans.variable)}
    >
      <body>
        <ThemeProvider>
          <ScenarioProvider>
            <TooltipProvider>
              <AppShell>{children}</AppShell>
              <StateSwitcher />
            </TooltipProvider>
          </ScenarioProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
