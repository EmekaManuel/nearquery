import Link from "next/link"
import { Chart } from "@/components/ChartGrid"
import { ChartIndex } from "@/components/ChartIndex"
import { Tiles } from "@/components/Tiles"
import { byId } from "@/lib/charts"
import { loadDashboard } from "@/lib/data"
import { fillText } from "@/lib/fill"
import { pct, usd } from "@/lib/format"

export default function Overview() {
  const d = loadDashboard()
  const ten = d.scenarios.find((s) => s.case === "current_observed" && s.volumeMultiple === 10)
  return (
    <>
      <header className="page-head">
        <p className="label">NearQuery · NEAR hackathon, thesis track</p>
        <h1 className="display">Ask the chain. Show the work.</h1>
        <p className="lede">Is NEAR Intents becoming real cross-chain settlement, and does that create value for NEAR? Every figure below is computed from public on-chain data and DefiLlama’s public API, and links to the code that produced it.</p>
      </header>
      <div className="verdict">
        <b className="label">Draft verdict</b>
        <p>Intents looks like real infrastructure, but the data shows weak value for the token so far. Captured revenue annualizes to {usd(d.obs.revenueAnnual)}, {pct(d.obs.buybackYield, 2)} of market cap; ten times today’s volume would be {pct(ten?.pctOfMarketCap ?? null, 1)}. THESIS.md has the claim, the findings, the bear case and what would change our mind.</p>
      </div>
      <Tiles d={d} />
      <Chart c={byId("daily-volume")} d={d} />
      <h2 className="sec">Every chart, with its query</h2>
      <ChartIndex d={d} />
      <p className="foot">Public events only. About {pct(d.obs.confidentialShare)} of reported volume does not appear in public events (implied to be Confidential Intents, but inferred, not measured), so on-chain declines can reflect migration. See METHODOLOGY.md for definitions and limits. DefiLlama’s raw series is deliberately not republished on this site.</p>
    </>
  )
}
