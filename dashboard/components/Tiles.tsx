import type { Dashboard } from "@/lib/types"
import { pct, usd } from "@/lib/format"
import { Info } from "./Info"

function Tile({ v, l, info, range }: { v: string; l: string; info: string; range: string }) {
  return <div className="tile"><div className="l label">{l}<Info text={info} /></div><div className="v">{v}</div><div className="r">{range}</div></div>
}

export function Tiles({ d }: { d: Dashboard }) {
  const o = d.obs
  const win = `${d.meta.windowStart} → ${d.meta.windowEnd}`
  return (
    <div className="tiles">
      <Tile v={usd(o.netSwap30d)} l="Net swap volume" range={win} info="Public on-chain only. Half of the leg-sum that NEAR and DefiLlama report as volume." />
      <Tile v={pct(o.confidentialShare)} l="Confidential share" range={win} info="Share of reported volume missing from public events. Inferred from DefiLlama’s total, not observed." />
      <Tile v={usd(o.revenueAnnual)} l="Revenue / yr" range={win} info={`NEAR keeps ${pct(o.capturedShare)} of gross fees (${o.capturedBps.toFixed(1)} bps of volume). Funds a buyback, not a burn.`} />
      <Tile v={pct(o.buybackYield, 2)} l="Buyback yield / yr" range={win} info={`Market cap ${usd(o.marketCap)} at $${o.nearPrice.toFixed(2)}, total supply (circulating would be lower).`} />
      <Tile v={usd(o.gasBurnAnnual)} l="Gas burned / yr" range={win} info="Gas burned by transactions to intents.near, annualized. A rounding error." />
    </div>
  )
}
