import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google"
import { Tip } from "@/components/Info"
import { SideNav } from "@/components/SideNav"
import { asset } from "@/lib/asset"
import { loadDashboard } from "@/lib/data"
import "./globals.css"

const display = Space_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--nf-display", display: "swap" })
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--nf-sans", display: "swap" })
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--nf-mono", display: "swap" })

const TAGLINE = "Ask the chain. Show the work."
const DESC = "NearQuery is a re-runnable investment thesis for NEAR: is NEAR Intents becoming real cross-chain settlement, and does that create value for NEAR?"
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: `NearQuery · ${TAGLINE}`, template: "%s · NearQuery" },
  description: DESC,
  openGraph: { title: `NearQuery · ${TAGLINE}`, description: DESC, siteName: "NearQuery", type: "website", images: [{ url: asset("/brand/nearquery-social-card.png"), width: 1200, height: 675 }] },
  twitter: { card: "summary_large_image", title: `NearQuery · ${TAGLINE}`, description: DESC, images: [asset("/brand/nearquery-social-card.png")] },
}

// Applies a saved theme before first paint so there is no flash.
const THEME_INIT = `try{var t=localStorage.getItem("nearquery-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { meta } = loadDashboard()
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body>
        <Tip>
          <div className="shell">
            <SideNav cutoff={meta.cutoff} generated={meta.generated} />
            <main className="main">{children}</main>
          </div>
        </Tip>
      </body>
    </html>
  )
}
