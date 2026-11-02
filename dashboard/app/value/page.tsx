import Link from "next/link"
import type { Metadata } from "next"
import { PageHead } from "@/components/PageHead"
import { ScenarioExplorer } from "@/components/ScenarioExplorer"
import { ScenarioTable } from "@/components/ScenarioTable"
import { Tiles } from "@/components/Tiles"
import { loadDashboard } from "@/lib/data"

export const metadata: Metadata = { title: "Value capture" }

export default function Page() {
  const d = loadDashboard()
  return (
    <>
      <PageHead title="Value capture" lede="What Intents volume turns into for the NEAR token, and what it would take to matter." />
      <Tiles d={d} />
      <ScenarioExplorer d={d} />
      <ScenarioTable d={d} />
      <p className="foot"><Link href="/charts/value-scenarios/">See the model code and assumptions ↗</Link></p>
    </>
  )
}
