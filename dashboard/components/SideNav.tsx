"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CHARTS } from "@/lib/charts"
import { asset } from "@/lib/asset"
import { ThemeToggle } from "./ThemeToggle"

const NAV = [
  { href: "/", label: "Overview", hint: "Verdict and headline numbers" },
  { href: "/activity/", label: "Activity", hint: "Volume, intents, accounts" },
  { href: "/market/", label: "Market structure", hint: "Solvers, flows, NEAR demand" },
  { href: "/value/", label: "Value capture", hint: "Revenue and buyback scenarios" },
]

export function SideNav({ cutoff, generated }: { cutoff: string; generated: string }) {
  const path = (usePathname() || "/").replace(/\/?$/, "/")
  const onChart = path.startsWith("/charts/")
  const chartGroup = onChart ? CHARTS.find((c) => path === `/charts/${c.id}/`)?.group : undefined
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h) || h === `/${chartGroup}/`)
  return (
    <nav className="side" aria-label="Primary">
      <Link href="/" className="brand" aria-label="NearQuery home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-light" src={asset("/brand/nearquery-lockup.svg")} alt="NearQuery" width={321} height={64} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-dark" src={asset("/brand/nearquery-lockup-dark.svg")} alt="" aria-hidden width={321} height={64} />
      </Link>
      <p className="tag">Ask the chain. Show the work.</p>
      <ul className="nav">
        {NAV.map((n) => (
          <li key={n.href}>
            <Link href={n.href} aria-current={active(n.href) ? "page" : undefined} className={active(n.href) ? "on" : ""}>
              <span>{n.label}</span><small>{n.hint}</small>
            </Link>
          </li>
        ))}
      </ul>
            <div className="side-foot">
        <div className="stamp">data through {cutoff}<br />built {generated}</div>
        <ThemeToggle />
      </div>
    </nav>
  )
}
